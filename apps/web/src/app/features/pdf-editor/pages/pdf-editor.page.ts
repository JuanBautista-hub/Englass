import type {
  OnDestroy,
  OnInit} from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { Observable, Subscription} from 'rxjs';
import { Subject, debounceTime } from 'rxjs';
import type { Annotation, SubmissionPayload, SubmissionStatus } from '@engclass/shared';
import { isImmutable } from '@engclass/shared';
import { PdfEditorService, MAX_ANNOTATIONS } from '../services/pdf-editor.service';
import { PdfRendererService } from '../services/pdf-renderer.service';
import { PdfViewerComponent } from '../components/pdf-viewer/pdf-viewer.component';
import { ToolbarComponent } from '../components/toolbar/toolbar.component';

@Component({
  selector: 'engclass-pdf-editor',
  standalone: true,
  imports: [PdfViewerComponent, ToolbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen flex-col">
      <engclass-toolbar
        [canSave]="canSave"
        [isLoading]="editor.isLoading"
        [lastSavedAt]="lastSavedAt"
        [error]="editor.hasError"
        (save)="onSave()"
        (download)="onDownload()"
      />
      <main class="flex-1 overflow-hidden p-4">
        @if (loadError()) {
          <div role="alert" class="rounded border border-error bg-red-50 p-3 text-error">
            {{ loadError() }}
          </div>
        } @else if (pageCount() > 0) {
          <engclass-pdf-viewer
            [pageCount]="pageCount()"
            [annotations]="annotations()"
            [scale]="scale"
            [readonly]="readonly()"
            [liveAnnouncement]="liveAnnouncement"
            (canvasClick)="onCanvasClick($event)"
            (annotationEdited)="onAnnotationEdited($event)"
            (annotationDeleted)="onAnnotationDeleted($event)"
          />
        } @else {
          <p class="text-slate-600">Cargando plantilla…</p>
        }
      </main>
    </div>
  `,
})
export class PdfEditorPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly editor = inject(PdfEditorService);
  private readonly renderer = inject(PdfRendererService);

  readonly annotations = signal<ReadonlyArray<Annotation>>([]);
  readonly pageCount = signal(0);
  readonly scale = 1.2;
  readonly lastSavedAt = signal<Date | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly status = signal<SubmissionStatus>('DRAFT');
  readonly readonly = computed(() => isImmutable(this.status()));
  readonly canSave = computed(() => !this.readonly() && this.annotations().length <= MAX_ANNOTATIONS);
  readonly liveAnnouncement = signal<string>('');
  readonly isInputOpen = signal(false);

  private routeSub: Subscription | null = null;
  private autosaveSub: Subscription | null = null;
  private saveInFlight = false;

  constructor() {
    effect(() => {
      this.liveAnnouncement();
    });
  }

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const templateId = params.get('templateId') ?? 'demo';
      void this.loadTemplate(templateId);
    });

    this.autosaveSub = effectToObservable(
      () => this.annotations(),
      debounceTime(2000),
    ).subscribe(() => {
      if (this.isInputOpen()) return;
      if (this.readonly()) return;
      void this.save({ silent: true });
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.autosaveSub?.unsubscribe();
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(_event: BeforeUnloadEvent): void {
    if (this.readonly() || this.annotations().length === 0) return;
    const payload = this.buildPayload();
    void this.editor.saveProgress(payload).subscribe({
      complete: () => undefined,
      error: () => undefined,
    });
  }

  async loadTemplate(templateId: string): Promise<void> {
    this.loadError.set(null);
    try {
      const buffer = await this.fetchFixture(templateId);
      await this.renderer.loadDocument(buffer);
      const doc = this.renderer.pdfDocument();
      this.pageCount.set(doc?.numPages ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar la plantilla';
      this.loadError.set(message);
    }
  }

  async onSave(): Promise<void> {
    await this.save({ silent: false });
  }

  async onDownload(): Promise<void> {
    const payload = this.buildPayload();
    if (this.editor.payloadExceedsCap(payload)) {
      this.editor.hasError.set({
        message: 'Payload demasiado grande (>256 KB)',
        code: 'VALIDATION',
        requestId: `client-${Date.now().toString(36)}`,
      });
      return;
    }
    this.editor.downloadCompiled(payload).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compiled-${payload.templateId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => undefined,
    });
  }

  onCanvasClick(event: { pageIndex: number; pdfX: number; pdfY: number }): void {
    if (!this.editor.canAddMore(this.annotations().length)) {
      this.liveAnnouncement.set('Límite de anotaciones alcanzado');
      return;
    }
    if (this.readonly()) return;
    const annotation: Annotation = {
      id: cryptoRandomId(),
      pageIndex: event.pageIndex,
      x: event.pdfX,
      y: event.pdfY,
      text: '',
      fontSize: 12,
    };
    this.annotations.update((list) => [...list, annotation]);
    this.isInputOpen.set(true);
    this.liveAnnouncement.set('Editando nueva anotación');
  }

  onAnnotationEdited(updated: Annotation): void {
    this.annotations.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
    this.isInputOpen.set(false);
  }

  onAnnotationDeleted(id: string): void {
    this.annotations.update((list) => list.filter((a) => a.id !== id));
  }

  private async save({ silent }: { silent: boolean }): Promise<void> {
    if (this.saveInFlight) return;
    const payload = this.buildPayload();
    if (this.editor.payloadExceedsCap(payload)) {
      this.editor.hasError.set({
        message: 'Payload demasiado grande (>256 KB)',
        code: 'VALIDATION',
        requestId: `client-${Date.now().toString(36)}`,
      });
      return;
    }
    this.saveInFlight = true;
    this.editor.saveProgress(payload).subscribe({
      next: () => {
        this.lastSavedAt.set(new Date());
        this.saveInFlight = false;
        if (!silent) this.liveAnnouncement.set('Guardado');
      },
      error: () => {
        this.saveInFlight = false;
      },
    });
  }

  private buildPayload(): SubmissionPayload {
    return {
      templateId: 'demo',
      answers: this.annotations().map((a) => ({ ...a })),
    };
  }

  private async fetchFixture(templateId: string): Promise<ArrayBuffer> {
    return this.editor.loadTemplate(templateId);
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function effectToObservable<T>(
  read: () => T,
  operator: (source: Observable<T>) => Observable<T>,
): Observable<T> {
  const subject = new Subject<T>();
  effect(() => {
    subject.next(read());
  });
  return operator(subject.asObservable());
}