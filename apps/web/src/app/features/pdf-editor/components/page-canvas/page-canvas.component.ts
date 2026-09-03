import type {
  AfterViewInit,
  ElementRef} from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import type { Annotation } from '@engclass/shared';
import { AnnotationInputComponent } from '../annotation-input/annotation-input.component';
import { PdfRendererService } from '../../services/pdf-renderer.service';

export interface CanvasClick {
  pageIndex: number;
  pdfX: number;
  pdfY: number;
}

@Component({
  selector: 'engclass-page-canvas',
  standalone: true,
  imports: [AnnotationInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="relative mx-auto my-4 w-fit"
      [attr.aria-label]="'Página ' + (pageIndex + 1)"
      role="region"
    >
      <canvas
        #canvas
        class="block shadow"
        [attr.data-page-index]="pageIndex"
        [attr.data-pdf-scale]="scale"
        (click)="onCanvasClick($event)"
      ></canvas>
      <div class="pointer-events-none absolute inset-0">
        @for (annotation of annotations; track annotation.id) {
          <div
            class="pointer-events-auto absolute"
            [style.top.px]="positionFor(annotation).top"
            [style.left.px]="positionFor(annotation).left"
          >
            @if (editingAnnotation() === annotation) {
              <engclass-annotation-input
                [annotation]="annotation"
                (save)="onEditSave($event)"
                (cancel)="onEditCancel()"
              />
            } @else {
              <div
                tabindex="0"
                role="textbox"
                [attr.aria-label]="'Anotación en página ' + (pageIndex + 1)"
                class="min-w-[160px] max-w-[280px] rounded border border-dashed border-slate-500 bg-white/80 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                [class.cursor-pointer]="!readonly"
                [attr.aria-readonly]="readonly"
                (dblclick)="onEditStart(annotation)"
                (keydown.f2)="onEditStart(annotation); $event.preventDefault()"
                (keydown.enter)="onEditStart(annotation); $event.preventDefault()"
                (keydown.space)="onEditStart(annotation); $event.preventDefault()"
                (keydown.delete)="onDelete(annotation); $event.preventDefault()"
                (keydown.backspace)="onDelete(annotation); $event.preventDefault()"
              >
                {{ annotation.text || '(vacío)' }}
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class PageCanvasComponent implements AfterViewInit {
  @Input({ required: true }) pageIndex = 0;
  @Input({ required: true }) scale = 1;
  @Input({ required: true }) annotations: ReadonlyArray<Annotation> = [];
  @Input() readonly = false;

  @Output() readonly canvasClick = new EventEmitter<CanvasClick>();
  @Output() readonly annotationEdit = new EventEmitter<Annotation>();
  @Output() readonly annotationDelete = new EventEmitter<string>();

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly renderer = inject(PdfRendererService);
  private editingTarget: Annotation | null = null;

  editingAnnotation(): Annotation | null {
    return this.editingTarget;
  }

  ngAfterViewInit(): void {
    void this.render();
  }

  positionFor(annotation: Annotation): { top: number; left: number } {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return { top: 0, left: 0 };
    try {
      const pos = this.renderer.pixelPositionOnCanvasLocal(canvas, this.pageIndex, annotation.x, annotation.y);
      return { top: pos.y, left: pos.x };
    } catch {
      return { top: 0, left: 0 };
    }
  }

  onCanvasClick(event: MouseEvent): void {
    if (this.readonly) return;
    const canvas = this.canvasRef.nativeElement;
    const point = this.renderer.screenToPdfPoint(canvas, event.clientX, event.clientY, this.pageIndex);
    this.canvasClick.emit({ pageIndex: this.pageIndex, pdfX: point.x, pdfY: point.y });
  }

  onEditStart(annotation: Annotation): void {
    if (this.readonly) return;
    this.editingTarget = annotation;
  }

  onEditSave(updated: Annotation): void {
    this.editingTarget = null;
    this.annotationEdit.emit(updated);
  }

  onEditCancel(): void {
    this.editingTarget = null;
  }

  onDelete(annotation: Annotation): void {
    if (this.readonly) return;
    this.annotationDelete.emit(annotation.id);
  }

  private async render(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;
    try {
      const task = await this.renderer.renderPage(this.pageIndex, canvas, this.scale);
      await task.promise;
    } catch (err) {
      console.error('render failed', err);
    }
  }
}