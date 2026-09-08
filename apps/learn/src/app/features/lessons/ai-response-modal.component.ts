import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  ViewChild,
  inject,
  signal,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { AiDeepenResponse, AiExplainResponse, AiMode } from '../../core/models';
import { TtsService } from '../../core/services/tts.service';
import {
  AiService,
  type AiSpeakLang,
} from '../../core/services/ai.service';

export type AiEntryState =
  | { kind: 'loading' }
  | { kind: 'success-explain'; value: AiExplainResponse }
  | { kind: 'success-deepen'; value: AiDeepenResponse }
  | { kind: 'error'; message: string; retryable: boolean };

export interface AiHistoryEntry {
  id: string;
  mode: AiMode;
  createdAt: number;
  state: AiEntryState;
  savedToDb: boolean;
}

@Component({
  selector: 'app-ai-response-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-40 bg-slate-900/40"
      [class.hidden]="!isOpen"
      aria-hidden="true"
      data-testid="ai-backdrop"
    ></div>

    <aside
      class="fixed top-0 right-0 z-50 h-full w-full sm:max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-drawer-title"
      data-testid="ai-modal"
    >
        <audio #aiAudio class="hidden" preload="auto" data-testid="ai-audio"></audio>

        <header
          class="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-violet-50 via-white to-white shrink-0"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span
              class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-violet-100 text-violet-700 shrink-0"
              aria-hidden="true"
            >✨</span>
            <div class="min-w-0">
              <h3
                id="ai-drawer-title"
                class="m-0 text-base font-semibold text-slate-900 truncate"
              >Asistente IA</h3>
              <p class="m-0 text-xs text-slate-500">
                {{ history.length === 0
                    ? 'Inicia una conversación'
                    : history.length + (history.length === 1 ? ' conversación' : ' conversaciones') }}
              </p>
            </div>
          </div>
          <button
            type="button"
            #closeBtn
            class="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            aria-label="Cerrar"
            data-testid="ai-close"
            (click)="closed.emit()"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="w-5 h-5"
              aria-hidden="true"
            >
              <path
                d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
              />
            </svg>
          </button>
        </header>

        <section
          class="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-violet-50/60 to-white shrink-0"
          aria-label="Acciones"
          data-testid="ai-actions"
        >
          <div class="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 transition-colors"
              (click)="requested.emit('explain')"
              [disabled]="isLoading"
              data-testid="ai-action-explain"
              title="Explicar la tarjeta actual con IA"
            >💡 Explicar</button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 transition-colors"
              (click)="requested.emit('deepen')"
              [disabled]="isLoading"
              data-testid="ai-action-deepen"
              title="Profundizar en la tarjeta actual con IA"
            >🧠 Profundizar</button>
            @if (isLoading) {
              <span class="inline-flex items-center gap-1 text-xs text-slate-500" data-testid="ai-actions-loading">
                <span class="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
                Consultando…
              </span>
            }
          </div>
        </section>

        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          @if (history.length === 0) {
            <div class="text-center py-10 text-slate-500 text-sm" data-testid="ai-empty">
              <div
                class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-100 text-violet-500 mb-3"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="w-6 h-6"
                >
                  <path
                    d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h.5a1.5 1.5 0 010 3H14a1 1 0 00-1 1v.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H8.5a1.5 1.5 0 010-3H9a1 1 0 001-1v-.5zM5.5 8a1.5 1.5 0 00-1.5 1.5v3a1.5 1.5 0 003 0v-3A1.5 1.5 0 005.5 8zm9 0a1.5 1.5 0 00-1.5 1.5v3a1.5 1.5 0 003 0v-3a1.5 1.5 0 00-1.5-1.5z"
                  />
                </svg>
              </div>
              <p>Pulsa <strong>Explicar</strong> o <strong>Profundizar</strong> para empezar.</p>
            </div>
          } @else {
            @for (entry of history; track entry.id) {
              <article
                class="bg-white border border-slate-200 rounded-lg overflow-hidden"
                [attr.data-entry-id]="entry.id"
                [attr.data-entry-mode]="entry.mode"
                [attr.data-testid]="'ai-entry-' + entry.mode"
              >
                <header
                  class="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200"
                >
                  <span class="text-sm" aria-hidden="true">
                    {{ entry.mode === 'explain' ? '💡' : '🧠' }}
                  </span>
                  <span class="text-xs font-medium text-slate-700">
                    {{ entry.mode === 'explain' ? 'Explicación' : 'Profundización' }}
                  </span>
                  <span class="text-xs text-slate-500" data-testid="ai-entry-time">
                    {{ relativeTime(entry.createdAt) }}
                  </span>
                  @if (entry.savedToDb) {
                    <span
                      class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200"
                      data-testid="ai-entry-saved"
                      title="Guardado en tu historial"
                      aria-label="Guardado en tu historial"
                    >🗄 Guardado</span>
                  }
                  <div class="ml-auto flex items-center gap-1">
                    @if (entry.state.kind !== 'loading') {
                      <button
                        type="button"
                        class="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-violet-700 hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                        (click)="retried.emit({ entryId: entry.id, mode: entry.mode })"
                        [disabled]="isLoading"
                        title="Regenerar respuesta"
                        [attr.aria-label]="'Regenerar ' + (entry.mode === 'explain' ? 'explicación' : 'profundización')"
                        data-testid="ai-entry-regenerate"
                      >↻</button>
                    }
                    <button
                      type="button"
                      class="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      (click)="deleted.emit(entry.id)"
                      title="Borrar del historial"
                      aria-label="Borrar entrada del historial"
                      data-testid="ai-entry-delete"
                    >🗑</button>
                  </div>
                </header>

                <div class="px-3 py-3 space-y-3">
                  @switch (entry.state.kind) {
                    @case ('loading') {
                      <div
                        class="flex flex-col items-center justify-center gap-2 py-6 text-slate-600"
                        data-testid="ai-entry-loading"
                      >
                        <span class="inline-flex gap-1.5">
                          <span class="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
                          <span
                            class="w-2 h-2 rounded-full bg-violet-400 animate-pulse"
                            style="animation-delay: 120ms"
                          ></span>
                          <span
                            class="w-2 h-2 rounded-full bg-violet-400 animate-pulse"
                            style="animation-delay: 240ms"
                          ></span>
                        </span>
                        <span class="text-xs">Consultando a la IA…</span>
                      </div>
                    }
                    @case ('error') {
                      <div class="text-center py-3" data-testid="ai-entry-error">
                        <p class="text-error text-xs mb-2">{{ entry.state.message }}</p>
                        @if (entry.state.retryable) {
                          <button
                            type="button"
                            class="bg-violet-700 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-violet-800 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                            (click)="retried.emit({ entryId: entry.id, mode: entry.mode })"
                            data-testid="ai-entry-retry"
                          >Reintentar</button>
                        }
                      </div>
                    }
                    @case ('success-explain') {
                      <div class="space-y-3" data-testid="ai-entry-success-explain">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          @if (ttsSupported()) {
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                              (click)="toggleSpeakEnglish(entrySpeakText(entry))"
                              [disabled]="speakingEnglish()"
                              data-testid="ai-entry-speak"
                            >🔊 {{ speakingEnglish() ? 'Speaking…' : 'Listen (EN)' }}</button>
                          }
                          <button
                            type="button"
                            class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                            (click)="toggleSpeakAi(entry)"
                            [disabled]="aiSpeaking()"
                            data-testid="ai-entry-speak-ia"
                          >🤖 {{ aiSpeaking() ? 'Reproduciendo…' : 'Voz IA' }}</button>
                        </div>

                        @if (aiError(); as err) {
                          <p
                            class="text-xs text-error bg-red-50 border border-red-200 rounded-md px-2 py-1.5"
                            data-testid="ai-entry-speak-error"
                          >Audio error: {{ err }}</p>
                        }

                        <p class="text-slate-800 leading-relaxed text-sm m-0">
                          {{ entry.state.kind === 'success-explain' ? entry.state.value.summary : '' }}
                        </p>

                        @if (entry.state.kind === 'success-explain' && entry.state.value.examples.length > 0) {
                          <div>
                            <p class="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Ejemplos en inglés</p>
                            <ul class="space-y-1.5 text-slate-800 text-sm m-0 p-0 list-none">
                              @for (example of entry.state.value.examples; track $index) {
                                <li class="flex gap-2">
                                  <span class="text-violet-400 shrink-0 mt-0.5">•</span>
                                  <span class="leading-relaxed">{{ example }}</span>
                                </li>
                              }
                            </ul>
                          </div>
                        }

                        @if (entry.state.kind === 'success-explain' && entry.state.value.examplesEs.length > 0) {
                          <div>
                            <p class="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Ejemplos en español</p>
                            <ul class="space-y-1.5 text-slate-800 text-sm m-0 p-0 list-none">
                              @for (example of entry.state.value.examplesEs; track $index) {
                                <li class="flex gap-2">
                                  <span class="text-amber-400 shrink-0 mt-0.5">•</span>
                                  <span class="leading-relaxed">{{ example }}</span>
                                </li>
                              }
                            </ul>
                          </div>
                        }

                        @if (entry.state.kind === 'success-explain' && entry.state.value.cached) {
                          <p class="text-xs text-slate-400 italic m-0">Resultado en caché.</p>
                        }
                      </div>
                    }
                    @case ('success-deepen') {
                      <div class="space-y-3" data-testid="ai-entry-success-deepen">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          @if (ttsSupported()) {
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                              (click)="toggleSpeakEnglish(entrySpeakText(entry))"
                              [disabled]="speakingEnglish()"
                              data-testid="ai-entry-speak"
                            >🔊 {{ speakingEnglish() ? 'Speaking…' : 'Listen (EN)' }}</button>
                          }
                          <button
                            type="button"
                            class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                            (click)="toggleSpeakAi(entry)"
                            [disabled]="aiSpeaking()"
                            data-testid="ai-entry-speak-ia"
                          >🤖 {{ aiSpeaking() ? 'Reproduciendo…' : 'Voz IA' }}</button>
                        </div>

                        @if (aiError(); as err) {
                          <p
                            class="text-xs text-error bg-red-50 border border-red-200 rounded-md px-2 py-1.5"
                            data-testid="ai-entry-speak-error"
                          >Audio error: {{ err }}</p>
                        }

                        <p class="text-slate-800 leading-relaxed text-sm m-0">
                          {{ entry.state.kind === 'success-deepen' ? entry.state.value.context : '' }}
                        </p>

                        @if (entry.state.kind === 'success-deepen' && entry.state.value.examples.length > 0) {
                          <div>
                            <p class="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Ejemplos en inglés</p>
                            <ul class="space-y-1.5 text-slate-800 text-sm m-0 p-0 list-none">
                              @for (example of entry.state.value.examples; track $index) {
                                <li class="flex gap-2">
                                  <span class="text-violet-400 shrink-0 mt-0.5">•</span>
                                  <span class="leading-relaxed">{{ example }}</span>
                                </li>
                              }
                            </ul>
                          </div>
                        }

                        @if (entry.state.kind === 'success-deepen' && entry.state.value.examplesEs.length > 0) {
                          <div>
                            <p class="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Ejemplos en español</p>
                            <ul class="space-y-1.5 text-slate-800 text-sm m-0 p-0 list-none">
                              @for (example of entry.state.value.examplesEs; track $index) {
                                <li class="flex gap-2">
                                  <span class="text-amber-400 shrink-0 mt-0.5">•</span>
                                  <span class="leading-relaxed">{{ example }}</span>
                                </li>
                              }
                            </ul>
                          </div>
                        }

                        @if (entry.state.kind === 'success-deepen' && entry.state.value.collocations.length > 0) {
                          <div>
                            <p class="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Colocaciones</p>
                            <ul class="space-y-1 text-slate-700 text-sm m-0 p-0 list-none">
                              @for (c of entry.state.value.collocations; track $index) {
                                <li class="flex gap-2">
                                  <span class="text-violet-400 shrink-0 mt-0.5">•</span>
                                  <span>{{ c }}</span>
                                </li>
                              }
                            </ul>
                          </div>
                        }

                        @if (entry.state.kind === 'success-deepen' && entry.state.value.falseFriends.length > 0) {
                          <div>
                            <p class="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Falsos amigos</p>
                            <ul class="space-y-1 text-slate-700 text-sm m-0 p-0 list-none">
                              @for (f of entry.state.value.falseFriends; track $index) {
                                <li class="flex gap-2">
                                  <span class="text-amber-400 shrink-0 mt-0.5">•</span>
                                  <span>{{ f }}</span>
                                </li>
                              }
                            </ul>
                          </div>
                        }

                        @if (entry.state.kind === 'success-deepen' && entry.state.value.cached) {
                          <p class="text-xs text-slate-400 italic m-0">Resultado en caché</p>
                        }
                      </div>
                    }
                  }
                </div>
              </article>
            }
          }
        </div>

        <footer
          class="border-t border-slate-200 bg-slate-50 px-5 py-3 shrink-0"
          aria-label="Preferencias de voz"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            @if (ttsSupported()) {
              <label class="block text-xs text-slate-600">
                <span class="block mb-1 font-medium">Voz del navegador (EN)</span>
                <select
                  class="w-full px-2 py-1 text-sm rounded-md border border-slate-300 bg-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  [value]="voiceName()"
                  (change)="onVoiceChange($event)"
                  data-testid="ai-voice-select"
                >
                  @for (voice of enVoices(); track voice.name) {
                    <option [value]="voice.name">{{ voiceLabel(voice) }}</option>
                  }
                </select>
              </label>
            }

            <label class="block text-xs text-slate-600">
              <span class="block mb-1 font-medium">Idioma de la voz IA</span>
              <select
                class="w-full px-2 py-1 text-sm rounded-md border border-slate-300 bg-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                [value]="aiSpeakLang()"
                (change)="onAiSpeakLangChange($event)"
                data-testid="ai-speak-lang"
              >
                <option value="es-ES">Español (es-ES)</option>
                <option value="en-US">English (en-US)</option>
              </select>
            </label>
          </div>
        </footer>
      </aside>
  `,
})
export class AiResponseModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() mode: AiMode = 'explain';
  @Input() history: AiHistoryEntry[] = [];
  @Input() lessonId: string | null = null;
  @Input() cardId: string | null = null;
  @Input() isLoading = false;

  @Output() closed = new EventEmitter<void>();
  @Output() requested = new EventEmitter<AiMode>();
  @Output() retried = new EventEmitter<{ entryId: string; mode: AiMode }>();
  @Output() deleted = new EventEmitter<string>();

  private readonly tts = inject(TtsService);
  private readonly aiService = inject(AiService);
  @ViewChild('aiAudio', { static: false }) private readonly aiAudioRef?: ElementRef<HTMLAudioElement>;
  protected readonly speakingEnglish = signal(false);
  protected readonly ttsSupported = signal(this.tts.isSupported());
  protected readonly enVoices = signal<SpeechSynthesisVoice[]>([]);
  protected readonly voiceName = signal(this.tts.preferredVoiceName());
  protected readonly aiSpeakLang = signal<AiSpeakLang>('es-ES');
  protected readonly aiSpeaking = signal(false);
  protected readonly aiError = signal<string | null>(null);

  private currentAudioUrl: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  ngOnInit(): void {
    if (this.tts.isSupported()) {
      void this.tts.listVoicesFor('en').then((voices) => {
        this.enVoices.set(voices);
        const preferred = this.tts.preferredVoiceName();
        if (!preferred && voices.length > 0) {
          const auto = this.tts.pickVoice('en').then((v) => v?.name ?? '');
          void auto.then((name) => {
            if (name) {
              this.voiceName.set(name);
              this.tts.setPreferredVoice(name);
            }
          });
        }
      });
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.closed.emit();
    }
  }

  onVoiceChange(event: Event): void {
    const name = (event.target as HTMLSelectElement).value;
    if (name) {
      this.voiceName.set(name);
      this.tts.setPreferredVoice(name);
    }
  }

  onAiSpeakLangChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as AiSpeakLang;
    if (value === 'es-ES' || value === 'en-US') {
      this.aiSpeakLang.set(value);
    }
  }

  relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 5_000) return 'ahora';
    if (diff < 60_000) return `hace ${Math.floor(diff / 1000)}s`;
    if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)} min`;
    if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)} h`;
    return new Date(ts).toLocaleDateString();
  }

  entrySpeakText(entry: AiHistoryEntry): string {
    if (entry.state.kind === 'success-explain') {
      return [entry.state.value.summary, ...entry.state.value.examples]
        .filter(Boolean)
        .join('. ');
    }
    if (entry.state.kind === 'success-deepen') {
      return [
        entry.state.value.context,
        ...entry.state.value.collocations,
        ...entry.state.value.examples,
      ]
        .filter(Boolean)
        .join('. ');
    }
    return '';
  }

  toggleSpeakAi(entry: AiHistoryEntry): void {
    if (this.aiSpeaking()) {
      this.stopAiAudio();
      return;
    }
    const lessonId = this.lessonId;
    const cardId = this.cardId;
    if (!lessonId || !cardId) {
      this.aiError.set('lesson_or_card_missing');
      return;
    }
    const audio = this.aiAudioRef?.nativeElement ?? null;
    if (!audio) {
      this.aiError.set('audio_element_not_ready');
      return;
    }
    this.aiError.set(null);
    this.aiSpeaking.set(true);
    this.aiService
      .speak(lessonId, cardId, entry.mode, '', this.aiSpeakLang())
      .then((blob) => {
        const properBlob = blob.type && blob.type !== 'application/octet-stream'
          ? blob
          : new Blob([blob], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(properBlob);
        this.stopAiAudio(false);
        this.currentAudioUrl = url;
        this.currentAudio = audio;
        audio.src = url;
        audio.muted = false;
        audio.volume = 1;
        audio.onended = () => this.stopAiAudio();
        audio.onerror = () => {
          this.aiError.set(audio.error?.message ?? 'audio_decode_failed');
          this.stopAiAudio();
        };
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch((err: unknown) => {
            this.aiError.set(err instanceof Error ? err.message : 'audio_play_failed');
            this.stopAiAudio();
          });
        }
      })
      .catch((err: unknown) => {
        let message = 'audio_request_failed';
        if (err && typeof err === 'object') {
          const e = err as { status?: number; error?: unknown; message?: string };
          const status = e.status;
          const detail = typeof e.error === 'string'
            ? e.error
            : e.error && typeof e.error === 'object'
              ? (e.error as { message?: string }).message ?? JSON.stringify(e.error)
              : '';
          message = status ? `HTTP ${status}${detail ? `: ${detail}` : ''}` : (e.message ?? message);
        }
        this.aiError.set(message);
        this.aiSpeaking.set(false);
      });
  }

  private stopAiAudio(clearSrc: boolean = true): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
      } catch {
        // ignore
      }
      if (clearSrc) {
        this.currentAudio.removeAttribute('src');
        try {
          this.currentAudio.load();
        } catch {
          // ignore
        }
      }
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio = null;
    }
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
    this.aiSpeaking.set(false);
  }

  ngOnDestroy(): void {
    this.stopAiAudio();
  }

  voiceLabel(voice: SpeechSynthesisVoice): string {
    const quality = voice.name.toLowerCase().match(/natural|neural|premium|enhanced|online/) ? ' · natural' : '';
    return `${voice.name}${quality}`;
  }

  toggleSpeakEnglish(text: string): void {
    if (this.speakingEnglish()) {
      this.tts.cancel();
      this.speakingEnglish.set(false);
      return;
    }
    if (!text) {
      return;
    }
    const handle = this.tts.speak(text, { lang: 'en-US', rate: 0.95 });
    if (!handle) {
      return;
    }
    this.speakingEnglish.set(true);
    void handle.done
      .catch(() => {})
      .finally(() => this.speakingEnglish.set(false));
  }
}