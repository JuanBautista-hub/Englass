import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LessonsService } from '../../core/services/lessons.service';
import { MasteryLabelsService } from '../../core/services/mastery-labels.service';
import { TtsSegmentsService } from '../../core/services/tts-segments.service';
import { TtsService } from '../../core/services/tts.service';
import { BilingualSegment, Lesson, Mastery, VocabularyCard } from '../../core/models';

interface CardSpeechState {
  speaking: 'en' | 'es' | null;
  field: 'term' | 'definition' | 'example' | 'bilingual' | null;
  error: string | null;
}

interface BilingualPlayback {
  cardId: string;
  index: number;
  total: number;
}

@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, UpperCasePipe],
  template: `
    <a routerLink="/lessons" class="inline-block text-sm text-slate-600 hover:text-slate-900 mb-3">← Back</a>

    @if (lesson(); as l) {
      <section class="bg-white border border-slate-200 rounded-lg p-4 mb-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h2 class="m-0 text-xl font-semibold text-slate-900">{{ l.title }}</h2>
            <p class="m-0 text-sm text-slate-500">[{{ l.level }}]</p>
          </div>
          @if (isCatalog()) {
            <button
              type="button"
              class="bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
              (click)="enroll()"
              [disabled]="enrolling()"
            >
              {{ enrolling() ? 'Adding…' : '+ Add to my lessons' }}
            </button>
          }
        </div>
        @if (l.description) {
          <p class="mt-2 text-slate-600">{{ l.description }}</p>
        }
        @if (isCatalog()) {
          <p class="text-xs text-slate-500 m-0">
            Preview from the catalogue. Add it to start tracking your progress.
          </p>
        }
        @if (!ttsSupported()) {
          <p class="text-error text-sm mt-2">
            Your browser does not support the Web Speech API. Try Chrome, Edge or Safari.
          </p>
        }
      </section>

      <section>
        <h2 class="text-lg font-semibold text-slate-900 mb-2">Cards</h2>
        @if (l.cards.length === 0) {
          <p class="text-slate-600">No cards yet.</p>
        }
        @for (c of l.cards; track c.id) {
          <article class="bg-white border border-slate-200 rounded-lg p-4 mb-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 flex-wrap">
                <strong class="text-slate-900">{{ c.term }}</strong>
                @if (c.mastery) {
                  <span class="text-xs px-2 py-0.5 rounded-full"
                        [class]="masteryClass(c.mastery)"
                        [attr.aria-label]="'Mastery: ' + masteryLabel(c.mastery)">
                    {{ masteryLabel(c.mastery) }}
                  </span>
                }
                @if (stateFor(c.id); as st) {
                  @if (st.speaking) {
                    <span class="text-success text-xs">● {{ st.speaking | uppercase }} {{ st.field }}</span>
                  }
                }
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="px-2.5 py-1 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                  (click)="speak(c.term, c.id, 'en', 'term')"
                  [disabled]="isSpeaking(c.id) || !ttsSupported()"
                  title="Speak the term in English"
                >
                  🔊 Speak (EN)
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                  (click)="speak(spanishText(c) ?? '', c.id, 'es', null)"
                  [disabled]="isSpeaking(c.id) || !ttsSupported() || !spanishText(c)"
                  title="Leer la explicación en español"
                >
                  🔊 Hablar (ES)
                </button>
              </div>
            </div>

            <div class="mt-2 flex items-start gap-2">
              <p class="m-0 text-slate-800 flex-1">{{ c.definition }}</p>
              <button
                type="button"
                class="shrink-0 text-slate-500 hover:text-slate-900 text-base disabled:opacity-30"
                (click)="speak(c.definition, c.id, 'en', 'definition')"
                [disabled]="isSpeaking(c.id) || !ttsSupported()"
                title="Read definition in English"
                aria-label="Read definition in English"
              >
                🔊
              </button>
            </div>

            @if (c.example) {
              <div class="mt-1 flex items-start gap-2">
                <p class="m-0 text-slate-600 italic flex-1">"{{ c.example }}"</p>
                <button
                  type="button"
                  class="shrink-0 text-slate-500 hover:text-slate-900 text-base disabled:opacity-30"
                  (click)="speak(c.example!, c.id, 'en', 'example')"
                  [disabled]="isSpeaking(c.id) || !ttsSupported()"
                  title="Read example in English"
                  aria-label="Read example in English"
                >
                  🔊
                </button>
              </div>
            }

            @if (c.translation) {
              <p class="mt-1 text-slate-500 text-sm">{{ c.translation }}</p>
            }

            @if (c.explanationEs) {
              <details class="mt-3 group">
                <summary class="cursor-pointer text-blue-700 text-sm select-none hover:text-blue-900">
                  Explicación en español
                </summary>
                <div class="mt-2 text-slate-600 text-sm leading-relaxed">
                  @for (seg of segmentsOf(c.id); track $index) {
                    <span
                      [class]="segmentClass(c.id, seg, $index)"
                    >{{ seg.text }}</span>
                  }
                </div>
                <div class="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    class="px-2.5 py-1 text-xs rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                    (click)="speakSpanish(c.explanationEs!, c.id)"
                    [disabled]="isSpeaking(c.id) || !ttsSupported()"
                  >
                    🔊 Leer en español
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1 text-xs rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    (click)="speakBilingualForCard(c.id)"
                    [disabled]="isSpeaking(c.id) || !ttsSupported()"
                    title="Lee la explicación en español y los ejemplos entre comillas en inglés"
                  >
                    🔊 EN+ES (ejemplos en inglés)
                  </button>
                  @if (bilingualFor(c.id); as bp) {
                    <span class="text-xs text-slate-500">
                      {{ bp.index + 1 }} / {{ bp.total }}
                    </span>
                  }
                </div>
              </details>
            }

            @if (errorFor(c.id); as msg) {
              <p class="text-error text-sm mt-2">{{ msg }}</p>
            }
          </article>
        }
      </section>

      @if (!isCatalog()) {
        <section class="bg-white border border-slate-200 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-slate-900 mt-0 mb-3">Add card</h3>
          <form (submit)="onAddCard($event, l.id)">
            <div class="mb-2">
              <label for="term" class="block text-sm text-slate-600 mb-1">Term</label>
              <input id="term" name="term" required [(ngModel)]="cardDraft.term"
                class="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:border-slate-500 focus:outline-none" />
            </div>
            <div class="mb-2">
              <label for="definition" class="block text-sm text-slate-600 mb-1">Definition</label>
              <textarea id="definition" name="definition" rows="2" required [(ngModel)]="cardDraft.definition"
                class="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:border-slate-500 focus:outline-none"></textarea>
            </div>
            <div class="mb-2">
              <label for="example" class="block text-sm text-slate-600 mb-1">Example (optional)</label>
              <input id="example" name="example" [(ngModel)]="cardDraft.example"
                class="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:border-slate-500 focus:outline-none" />
            </div>
            <div class="mb-2">
              <label for="translation" class="block text-sm text-slate-600 mb-1">Translation (optional)</label>
              <input id="translation" name="translation" [(ngModel)]="cardDraft.translation"
                class="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:border-slate-500 focus:outline-none" />
            </div>
            <div class="mb-2">
              <label for="explanationEs" class="block text-sm text-slate-600 mb-1">Explicación en español (opcional)</label>
              <textarea id="explanationEs" name="explanationEs" rows="3" [(ngModel)]="cardDraft.explanationEs"
                class="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:border-slate-500 focus:outline-none"></textarea>
            </div>
            @if (error()) {
              <p class="text-error text-sm mb-2">{{ error() }}</p>
            }
            <button type="submit"
              class="bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
              [disabled]="adding()">
              {{ adding() ? 'Saving…' : 'Add card' }}
            </button>
          </form>
        </section>
      }
    } @else if (loading()) {
      <p class="text-slate-600">Loading…</p>
    } @else {
      <p class="text-slate-600">Lesson not found.</p>
      <a
        routerLink="/lessons"
        class="inline-block mt-2 bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 no-underline"
      >Go to catalogue</a>
    }
  `,
})
export class LessonDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lessons = inject(LessonsService);
  private readonly masteryLabels = inject(MasteryLabelsService);
  private readonly tts = inject(TtsService);
  private readonly ttsSegments = inject(TtsSegmentsService);

  protected readonly lesson = signal<Lesson | null>(null);
  protected readonly loading = signal(true);
  protected readonly isCatalog = signal(false);
  protected readonly adding = signal(false);
  protected readonly enrolling = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly speechStates = signal<Map<string, CardSpeechState>>(new Map());
  protected readonly bilingualPlayback = signal<BilingualPlayback | null>(null);
  protected readonly ttsSupported = signal(this.tts.isSupported());
  protected cardDraft = { term: '', definition: '', example: '', translation: '', explanationEs: '' };

  private readonly segmentsCache = new Map<string, BilingualSegment[]>();

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.isCatalog.set(this.route.snapshot.queryParamMap.get('source') === 'catalog');
    await this.load(id);
  }

  ngOnDestroy(): void {
    this.tts.cancel();
  }

  stateFor(cardId: string): CardSpeechState | null {
    return this.speechStates().get(cardId) ?? null;
  }

  masteryLabel(m: Mastery): string {
    return this.masteryLabels.forKey(m)?.label ?? '';
  }

  masteryClass(m: Mastery): string {
    return this.masteryLabels.forKey(m)?.badgeClass ?? '';
  }

  isSpeaking(cardId: string): boolean {
    const st = this.stateFor(cardId);
    return st?.speaking !== null && st?.speaking !== undefined;
  }

  errorFor(cardId: string): string | null {
    return this.stateFor(cardId)?.error ?? null;
  }

  spanishText(card: VocabularyCard): string | null {
    return card.explanationEs ?? card.translation;
  }

  bilingualFor(cardId: string): BilingualPlayback | null {
    const bp = this.bilingualPlayback();
    return bp && bp.cardId === cardId ? bp : null;
  }

  segmentsOf(cardId: string): BilingualSegment[] {
    const cached = this.segmentsCache.get(cardId);
    if (cached) {
      return cached;
    }
    this.ttsSegments.get(cardId)
      .then((segs) => this.segmentsCache.set(cardId, segs))
      .catch(() => {});
    return [];
  }

  segmentClass(cardId: string, seg: BilingualSegment, index: number): string {
    const bp = this.bilingualFor(cardId);
    const isActive = bp && bp.index === index;
    if (seg.lang === 'en') {
      return isActive
        ? 'font-semibold text-blue-900 bg-yellow-100 rounded px-0.5'
        : 'font-medium text-blue-700';
    }
    return isActive
      ? 'bg-yellow-100 rounded px-0.5 text-slate-900'
      : 'text-slate-600';
  }

  async speak(
    text: string,
    cardId: string,
    lang: 'en' | 'es',
    field: 'term' | 'definition' | 'example' | 'bilingual' | null,
  ): Promise<void> {
    if (!text) {
      return;
    }
    this.tts.cancel();
    this.bilingualPlayback.set(null);
    this.patchSpeech(cardId, { speaking: lang, field, error: null });
    const handle = this.tts.speak(text, {
      lang: lang === 'en' ? 'en-US' : 'es-ES',
      rate: 0.9,
    });
    if (!handle) {
      this.patchSpeech(cardId, { speaking: null, field: null, error: 'speech_synthesis_unavailable' });
      return;
    }
    try {
      await handle.done;
    } catch (err: unknown) {
      this.patchSpeech(cardId, {
        speaking: null,
        field: null,
        error: err instanceof Error ? err.message : 'speech_failed',
      });
      return;
    }
    this.patchSpeech(cardId, { speaking: null, field: null });
  }

  async speakSpanish(text: string, cardId: string): Promise<void> {
    return this.speak(text, cardId, 'es', null);
  }

  async speakBilingualForCard(cardId: string): Promise<void> {
    this.tts.cancel();
    this.patchSpeech(cardId, { speaking: null, field: 'bilingual', error: null });
    let segments: BilingualSegment[];
    try {
      segments = await this.ttsSegments.get(cardId);
      this.segmentsCache.set(cardId, segments);
    } catch {
      return;
    }
    this.bilingualPlayback.set({ cardId, index: 0, total: segments.length });
    try {
      await this.tts.speakSegments(segments, {
        rate: 0.95,
        onSegment: (_seg, index, total) => {
          this.bilingualPlayback.set({ cardId, index, total });
        },
      });
    } catch (err: unknown) {
      this.patchSpeech(cardId, {
        speaking: null,
        field: null,
        error: err instanceof Error ? err.message : 'speech_failed',
      });
    } finally {
      this.bilingualPlayback.set(null);
      this.patchSpeech(cardId, { speaking: null, field: null });
    }
  }

  async enroll(): Promise<void> {
    const l = this.lesson();
    if (!l || this.enrolling()) {
      return;
    }
    this.enrolling.set(true);
    this.error.set(null);
    try {
      const cloned = await this.lessons.enrollInCatalog(l.id);
      const isNew = cloned.id !== l.id && cloned.sourceLessonId === l.id;
      await this.router.navigate(['/lessons', cloned.id], {
        queryParams: isNew ? {} : { source: 'catalog' },
      });
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'enroll_failed');
    } finally {
      this.enrolling.set(false);
    }
  }

  async onAddCard(event: Event, lessonId: string): Promise<void> {
    event.preventDefault();
    this.adding.set(true);
    this.error.set(null);
    try {
      await this.lessons.addCard(lessonId, {
        term: this.cardDraft.term,
        definition: this.cardDraft.definition,
        example: this.cardDraft.example || undefined,
        translation: this.cardDraft.translation || undefined,
        explanationEs: this.cardDraft.explanationEs || undefined,
      });
      this.cardDraft = { term: '', definition: '', example: '', translation: '', explanationEs: '' };
      await this.load(lessonId);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'card_create_failed');
    } finally {
      this.adding.set(false);
    }
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.segmentsCache.clear();
    try {
      const lesson = this.isCatalog()
        ? await this.lessons.getCatalogLesson(id)
        : await this.lessons.get(id);
      this.lesson.set(lesson);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'load_failed');
    } finally {
      this.loading.set(false);
    }
  }

  private patchSpeech(cardId: string, patch: Partial<CardSpeechState>): void {
    const next = new Map(this.speechStates());
    const current = next.get(cardId) ?? { speaking: null, field: null, error: null };
    next.set(cardId, { ...current, ...patch });
    this.speechStates.set(next);
  }
}
