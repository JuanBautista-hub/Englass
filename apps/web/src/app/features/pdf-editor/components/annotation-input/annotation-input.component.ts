import type {
  ElementRef,
  OnDestroy} from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import type { Annotation } from '@engclass/shared';

@Component({
  selector: 'engclass-annotation-input',
  standalone: true,
  imports: [CdkTrapFocus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div cdkTrapFocus [cdkTrapFocusAutoCapture]="true" #container class="rounded border border-blue-500 bg-white p-2 shadow-lg">
      <textarea
        #textarea
        class="w-[240px] resize-none rounded border border-slate-300 p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows="3"
        [value]="annotation.text"
        (input)="onInput($event)"
        (keydown.enter)="onEnter($event)"
        (keydown.escape)="onCancel(); $event.preventDefault()"
      ></textarea>
      <div class="mt-1 flex justify-end gap-2">
        <button
          type="button"
          class="rounded bg-slate-200 px-2 py-0.5 text-xs"
          (click)="onCancel()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="rounded bg-blue-600 px-2 py-0.5 text-xs text-white"
          (click)="onCommit()"
        >
          Guardar
        </button>
      </div>
    </div>
  `,
})
export class AnnotationInputComponent implements OnDestroy {
  @Input({ required: true }) annotation!: Annotation;

  @Output() readonly save = new EventEmitter<Annotation>();
  @Output() readonly cancel = new EventEmitter<void>();

  @ViewChild('textarea', { static: true }) textarea!: ElementRef<HTMLTextAreaElement>;

  private readonly draft = signal<string>('');

  ngOnInit(): void {
    this.draft.set(this.annotation.text);
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.textarea.nativeElement.focus());
  }

  ngOnDestroy(): void {
    // cdkTrapFocus handles its own cleanup
  }

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.draft.set(target.value);
  }

  onEnter(event: KeyboardEvent): void {
    if (event.shiftKey) {
      return;
    }
    event.preventDefault();
    this.onCommit();
  }

  onCommit(): void {
    this.save.emit({ ...this.annotation, text: this.draft() });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}