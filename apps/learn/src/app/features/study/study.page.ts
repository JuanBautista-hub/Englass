import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DueCard, Rating, ReviewService } from '../../core/services/review.service';
import {
  BilingualSegment,
  parseBilingual,
  TtsService,
} from '../../core/services/tts.service';

interface SessionSummary {
  total: number;
  byRating: Record<Rating, number>;
  nextDueAt: string | null;
}

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a routerLink="/lessons" class="inline-block text-sm text-slate-600 hover:text-slate-900 mb-3">← Back</a>

    @if (lessonTitle(); as title) {
      <h2 class="text-xl font-semibold text-slate-900 mt-1 mb-3">{{ title }}</h2>
    }

    @if (loading()) {
      <p class="text-slate-600">Loading…</p>
    } @else if (error()) {
      <p class="text-error">{{ error() }}</p>
      <button type="button" class="mt-2 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50" (click)="restart()">Retry</button>
    } @else {
      @if (summary(); as s) {
        <section class="bg-white border border-slate-200 rounded-lg p-4">
          <h2 class="text-lg font-semibold text-slate-900 mt-0 mb-3">Session complete</h2>
          <p>You reviewed <strong>{{ s.total }}</strong> card(s).</p>
          <ul class="list-none p-0 m-0 space-y-1">
            <li>Again: {{ s.byRating.again }}</li>
            <li>Hard: {{ s.byRating.hard }}</li>
            <li>Good: {{ s.byRating.good }}</li>
            <li>Easy: {{ s.byRating.easy }}</li>
          </ul>
          @if (s.nextDueAt) {
            <p class="text-slate-600 text-sm mt-3">
              Next due: {{ formatDate(s.nextDueAt) }}
            </p>
          } @else {
            <p class="text-success text-sm mt-3">All caught up — nothing else is due right now.</p>
          }
          <div class="flex gap-2 mt-3">
            <button type="button" class="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50" (click)="restart()">Study again</button>
            <a routerLink="/lessons" class="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 no-underline text-slate-900">Done</a>
          </div>
        </section>
      } @else if (queue().length === 0) {
        <section class="bg-white border border-slate-200 rounded-lg p-4">
          <h2 class="text-lg font-semibold text-slate-900 mt-0">Nothing due</h2>
          <p class="text-slate-600">No cards are due for review in this lesson right now. Come back later.</p>
          <a routerLink="/lessons" class="text-blue-700 hover:text-blue-900">Back to lessons</a>
        </section>
      } @else {
        <div class="flex items-center justify-between mb-2">
          <span class="text-slate-500 text-sm">
            {{ index() + 1 }} / {{ queue().length }}
          </span>
        </div>

        @if (current(); as c) {
          <article class="bg-white border border-slate-200 rounded-lg p-4">
            <div class="text-center py-4">
              <div class="flex items-center justify-center gap-2">
                <div class="text-3xl font-semibold text-slate-900">{{ c.term }}</div>
                <button
                  type="button"
                  class="text-slate-500 hover:text-slate-900 text-lg disabled:opacity-30"
                  (click)="speakText(c.term, 'en-US', 0.9)"
                  [disabled]="speaking() || !ttsSupported()"
                  title="Hear the term in English"
                  aria-label="Hear the term in English"
                >🔊</button>
              </div>
              @if (speaking()) {
                <div class="text-success text-sm mt-1">● speaking</div>
              }
            </div>

            @if (flipped()) {
              <div class="border-t border-slate-200 pt-3 mt-2">
                <div class="flex items-start gap-2">
                  <p class="m-0 font-semibold text-slate-900 flex-1">{{ c.definition }}</p>
                  <button
                    type="button"
                    class="shrink-0 text-slate-500 hover:text-slate-900 text-base disabled:opacity-30"
                    (click)="speakText(c.definition, 'en-US', 0.9)"
                    [disabled]="speaking() || !ttsSupported()"
                    title="Read definition in English"
                    aria-label="Read definition in English"
                  >🔊</button>
                </div>

                @if (c.example) {
                  <div class="mt-1 flex items-start gap-2">
                    <p class="m-0 text-slate-600 italic flex-1">"{{ c.example }}"</p>
                    <button
                      type="button"
                      class="shrink-0 text-slate-500 hover:text-slate-900 text-base disabled:opacity-30"
                      (click)="speakText(c.example!, 'en-US', 0.9)"
                      [disabled]="speaking() || !ttsSupported()"
                      title="Read example in English"
                      aria-label="Read example in English"
                    >🔊</button>
                  </div>
                }

                @if (c.translation) {
                  <p class="mt-1 text-slate-500 text-sm">{{ c.translation }}</p>
                }

                @if (c.explanationEs) {
                  <details class="mt-3 group" open>
                    <summary class="cursor-pointer text-blue-700 text-sm select-none hover:text-blue-900">
                      Explicación en español
                    </summary>
                    <div class="mt-2 text-slate-600 text-sm leading-relaxed">
                      @for (seg of segmentsOf(c); track $index) {
                        <span [class]="segmentClass(c, seg, $index)">{{ seg.text }}</span>
                      }
                    </div>
                    <div class="mt-2 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        class="px-2.5 py-1 text-xs rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                        (click)="speakText(c.explanationEs!, 'es-ES', 0.95)"
                        [disabled]="speaking() || !ttsSupported()"
                      >
                        🔊 Leer en español
                      </button>
                      <button
                        type="button"
                        class="px-2.5 py-1 text-xs rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        (click)="speakBilingual(c)"
                        [disabled]="speaking() || !ttsSupported()"
                        title="Lee la explicación en español y los ejemplos en inglés"
                      >
                        🔊 EN+ES
                      </button>
                      @if (bilingualIndex() >= 0) {
                        <span class="text-xs text-slate-500">
                          {{ bilingualIndex() + 1 }} / {{ bilingualTotal() }}
                        </span>
                      }
                    </div>
                  </details>
                }

                <p class="mt-2 text-slate-400 text-xs">
                  ease {{ c.easeFactor.toFixed(2) }} · interval {{ c.intervalDays }}d · reps {{ c.repetitions }} · lapses {{ c.lapses }}
                </p>
              </div>

              <div class="flex justify-between gap-2 mt-4">
                <button type="button" class="flex-1 px-2 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50" (click)="rate('again')" [disabled]="busy()">Again</button>
                <button type="button" class="flex-1 px-2 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50" (click)="rate('hard')" [disabled]="busy()">Hard</button>
                <button type="button" class="flex-1 px-2 py-1.5 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-700 disabled:opacity-50" (click)="rate('good')" [disabled]="busy()">Good</button>
                <button type="button" class="flex-1 px-2 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50" (click)="rate('easy')" [disabled]="busy()">Easy</button>
              </div>
            } @else {
              <div class="text-center mt-2">
                <button type="button" class="bg-slate-900 text-white px-4 py-1.5 rounded-md font-medium hover:bg-slate-700" (click)="flip()">Show answer</button>
              </div>
            }
          </article>

          @if (lastError()) {
            <p class="text-error text-sm mt-2">{{ lastError() }}</p>
          }
        }
      }
    }
  `,
})
export class StudyPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly review = inject(ReviewService);
  private readonly tts = inject(TtsService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly lastError = signal<string | null>(null);
  protected readonly lessonTitle = signal<string | null>(null);
  protected readonly queue = signal<DueCard[]>([]);
  protected readonly index = signal(0);
  protected readonly flipped = signal(false);
  protected readonly busy = signal(false);
  protected readonly speaking = signal(false);
  protected readonly summary = signal<SessionSummary | null>(null);
  protected readonly bilingualIndex = signal(-1);
  protected readonly bilingualTotal = signal(0);
  protected readonly ttsSupported = signal(this.tts.isSupported());

  private readonly segmentsCache = new Map<string, BilingualSegment[]>();

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('lesson_not_specified');
      this.loading.set(false);
      return;
    }
    await this.load(id);
  }

  current(): DueCard | null {
    return this.queue()[this.index()] ?? null;
  }

  flip(): void {
    this.flipped.set(true);
  }

  async rate(rating: Rating): Promise<void> {
    const card = this.current();
    if (!card || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.lastError.set(null);
    try {
      await this.review.review(card.cardId, rating);
      this.advance(rating);
    } catch (err: unknown) {
      this.lastError.set(err instanceof Error ? err.message : 'review_failed');
    } finally {
      this.busy.set(false);
    }
  }

  async speakText(text: string, lang: 'en-US' | 'es-ES', rate: number): Promise<void> {
    if (!text) {
      return;
    }
    this.tts.cancel();
    this.speaking.set(true);
    this.bilingualIndex.set(-1);
    const handle = this.tts.speak(text, { lang, rate });
    if (!handle) {
      this.speaking.set(false);
      return;
    }
    try {
      await handle.done;
    } catch {
      // ignore
    } finally {
      this.speaking.set(false);
    }
  }

  segmentsOf(card: DueCard): BilingualSegment[] {
    if (!card.explanationEs) {
      return [];
    }
    const cached = this.segmentsCache.get(card.cardId);
    if (cached) {
      return cached;
    }
    const parsed = parseBilingual(card.explanationEs);
    this.segmentsCache.set(card.cardId, parsed);
    return parsed;
  }

  segmentClass(card: DueCard, seg: BilingualSegment, index: number): string {
    const isActive = this.bilingualIndex() === index && this.current()?.cardId === card.cardId;
    if (seg.lang === 'en') {
      return isActive
        ? 'font-semibold text-blue-900 bg-yellow-100 rounded px-0.5'
        : 'font-medium text-blue-700';
    }
    return isActive
      ? 'bg-yellow-100 rounded px-0.5 text-slate-900'
      : 'text-slate-600';
  }

  async speakBilingual(card: DueCard): Promise<void> {
    if (!card.explanationEs) {
      return;
    }
    this.tts.cancel();
    this.speaking.set(true);
    const segments = this.segmentsOf(card);
    this.bilingualTotal.set(segments.length);
    this.bilingualIndex.set(0);
    try {
      await this.tts.speakBilingual(card.explanationEs, {
        rate: 0.95,
        onSegment: (_seg, index, total) => {
          this.bilingualIndex.set(index);
          this.bilingualTotal.set(total);
        },
      });
    } catch {
      // ignore
    } finally {
      this.speaking.set(false);
      this.bilingualIndex.set(-1);
    }
  }

  async restart(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.summary.set(null);
    this.flipped.set(false);
    this.index.set(0);
    await this.load(id);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  private async load(lessonId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.segmentsCache.clear();
    try {
      const due = await this.review.dueForLesson(lessonId);
      this.queue.set(due);
      if (due.length > 0) {
        this.lessonTitle.set(due[0].lessonTitle);
      }
      this.index.set(0);
      this.flipped.set(false);
      this.summary.set(null);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'load_failed');
    } finally {
      this.loading.set(false);
    }
  }

  private advance(rating: Rating): void {
    const next = this.index() + 1;
    const current = this.queue();
    if (next >= current.length) {
      const byRating = { again: 0, hard: 0, good: 0, easy: 0 };
      byRating[rating] += 1;
      this.summary.set({
        total: current.length,
        byRating,
        nextDueAt: null,
      });
      return;
    }
    this.index.set(next);
    this.flipped.set(false);
  }
}
