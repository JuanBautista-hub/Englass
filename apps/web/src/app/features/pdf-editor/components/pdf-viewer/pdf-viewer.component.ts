import type {
  ElementRef,
  AfterViewInit,
  OnDestroy} from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  effect,
  signal,
} from '@angular/core';
import type { Annotation } from '@engclass/shared';
import { PageCanvasComponent, type CanvasClick } from '../page-canvas/page-canvas.component';

@Component({
  selector: 'engclass-pdf-viewer',
  standalone: true,
  imports: [PageCanvasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <div
        #scroller
        class="relative h-[80vh] overflow-auto rounded border border-slate-200 bg-slate-100"
        (scroll)="onScroll()"
      >
        @for (pageIndex of mountedPages(); track pageIndex) {
          <engclass-page-canvas
            [pageIndex]="pageIndex"
            [scale]="scale"
            [annotations]="annotationsForPage(pageIndex)"
            [readonly]="readonly"
            (canvasClick)="onCanvasClick($event)"
            (annotationEdit)="annotationEdited.emit($event)"
            (annotationDelete)="annotationDeleted.emit($event)"
          />
        }
      </div>
      <div aria-live="polite" aria-atomic="true" class="sr-only">{{ liveAnnouncement() }}</div>
    </div>
  `,
})
export class PdfViewerComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) pageCount = 0;
  @Input({ required: true }) annotations: ReadonlyArray<Annotation> = [];
  @Input({ required: true }) scale = 1;
  @Input() readonly = false;
  @Input() liveAnnouncement = signal<string>('');

  @Output() readonly canvasClick = new EventEmitter<CanvasClick>();
  @Output() readonly annotationEdited = new EventEmitter<Annotation>();
  @Output() readonly annotationDeleted = new EventEmitter<string>();

  @ViewChild('scroller', { static: true }) scroller!: ElementRef<HTMLDivElement>;

  readonly activePage = signal(0);

  readonly mountedPages = computed<ReadonlyArray<number>>(() => {
    const ap = this.activePage();
    return [-1, 0, 1]
      .map((d) => ap + d)
      .filter((i) => i >= 0 && i < this.pageCount);
  });

  private intersectionObserver: IntersectionObserver | null = null;

  constructor() {
    effect(() => {
      const count = this.pageCount;
      if (count === 0) {
        this.activePage.set(0);
      } else if (this.activePage() >= count) {
        this.activePage.set(count - 1);
      }
    });
  }

  ngAfterViewInit(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => Number(entry.target.getAttribute('data-page-index')))
          .filter((n) => Number.isFinite(n));
        if (visible.length > 0) {
          const center = visible[Math.floor(visible.length / 2)] ?? 0;
          this.activePage.set(center);
        }
      },
      { root: this.scroller.nativeElement, threshold: 0.5 },
    );
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  onCanvasClick(event: CanvasClick): void {
    if (this.readonly) return;
    this.canvasClick.emit(event);
  }

  annotationsForPage(pageIndex: number): ReadonlyArray<Annotation> {
    return this.annotations.filter((a) => a.pageIndex === pageIndex);
  }

  onScroll(): void {
    const idle = (globalThis as unknown as { requestIdleCallback?: (cb: () => void) => void })
      .requestIdleCallback;
    if (typeof idle === 'function') {
      idle(() => undefined);
    }
  }
}