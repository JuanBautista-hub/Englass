import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { UiError } from '../../services/pdf-editor.service';

@Component({
  selector: 'engclass-toolbar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2 border-b border-slate-200 bg-white p-3 shadow-sm">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
          [disabled]="!canSave()"
          (click)="save.emit()"
        >
          Guardar avance
        </button>
        <button
          type="button"
          class="rounded bg-slate-200 px-3 py-1 text-sm"
          [disabled]="isLoading()"
          (click)="download.emit()"
        >
          Descargar PDF
        </button>
        @if (lastSavedAt(); as savedAt) {
          <span class="text-xs text-slate-500">
            Guardado {{ savedAt | date: 'shortTime' }}
          </span>
        }
        @if (isLoading()) {
          <span class="text-xs text-slate-500" role="status">Cargando…</span>
        }
      </div>
      @if (error(); as err) {
        <div
          role="alert"
          class="flex items-start justify-between gap-2 rounded border border-error bg-red-50 p-2 text-sm text-error"
        >
          <div>
            <div class="font-semibold">{{ err.code }}</div>
            <div>{{ err.message }}</div>
            <div class="font-mono text-xs">requestId: {{ err.requestId }}</div>
          </div>
          <button
            type="button"
            class="rounded bg-error px-2 py-1 text-xs text-white"
            (click)="copyRequestId(err.requestId)"
          >
            Copiar ID
          </button>
        </div>
      }
    </div>
  `,
})
export class ToolbarComponent {
  @Input() canSave = signal(true);
  @Input() isLoading = signal(false);
  @Input() lastSavedAt = signal<Date | null>(null);
  @Input() error = signal<UiError | null>(null);

  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly download = new EventEmitter<void>();

  copyRequestId(requestId: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(requestId);
    }
  }
}