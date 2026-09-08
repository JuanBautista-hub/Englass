import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DueCard, Rating, ReviewService } from '../../core/services/review.service';
import { MasteryLabelsService } from '../../core/services/mastery-labels.service';
import {
  BilingualSegment,
  parseBilingual,
  TtsService,
} from '../../core/services/tts.service';

interface SessionSummary {
  total: number;
  byRating: Record<Rating, number>;
  retention: number;
  streakBefore: number;
  streakAfter: number;
  newlyAwarded: string[];
  longestIntervalDays: number;
}

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a routerLink="/lessons"
       class="inline-block text-sm text-slate-600 hover:text-slate-900 mb-3 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 rounded">
      ← Exit
    </a>

    @if (lessonTitle(); as title) {
      <h2 class="text-xl font-semibold text-slate-900 mt-1 mb-3">{{ title }}</h2>
    }

    @if (loading()) {
      <p class="text-slate-600">Loading…</p>
    } @else if (error()) {
      <p class="text-error">{{ error() }}</p>
      <button type="button"
              class="mt-2 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              (click)="restart()">Retry</button>
    } @else {
      @if (summary(); as s) {
        <section class="bg-white border border-slate-200 rounded-lg p-4 motion-safe:animate-[fadeIn_300ms_ease-out]">
          <h2 class="text-lg font-semibold text-slate-900 mt-0 mb-3">Session complete</h2>
          <p>You reviewed <strong>{{ s.total }}</strong> card(s).</p>
          <ul class="list-none p-0 m-0 space-y-1 text-sm text-slate-700">
            <li>Retention: <strong>{{ s.retention }}%</strong></li>
            <li>Again: {{ s.byRating.again }} · Hard: {{ s.byRating.hard }} · Good: {{ s.byRating.good }} · Easy: {{ s.byRating.easy }}</li>
            @if (s.longestIntervalDays > 0) {
              <li>Longest next interval: {{ s.longestIntervalDays }} day(s)</li>
            }
            @if (s.streakAfter > s.streakBefore) {
              <li class="text-amber-700 font-medium mt-2">🔥 Streak is now {{ s.streakAfter }} day(s)!</li>
            }
            @if (s.newlyAwarded.length > 0) {
              <li class="text-emerald-700 font-medium mt-2">
                🏅 Badge unlocked: {{ s.newlyAwarded.join(', ') }}
              </li>
            }
          </ul>
          <div class="flex gap-2 mt-3">
            <button type="button"
                    class="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                    (click)="restart()">Study again</button>
            <a routerLink="/dashboard"
               class="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 no-underline text-slate-900">Done</a>
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
              <div class="flex items-center justify-center gap-2 flex-wrap">
                <div class="text-3xl font-semibold text-slate-900">{{ c.term }}</div>
                <button
                  type="button"
                  class="text-slate-500 hover:text-slate-900 text-lg disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 rounded"
                  (click)="speakText(c.term, 'en-US', 0.9)"
                  [disabled]="speaking() || !ttsSupported()"
                  title="Hear the term in English"
                  aria-label="Hear the term in English"
                >🔊</button>
              </div>
              <div class="mt-1 flex items-center justify-center gap-2">
                <span class="text-xs px-2 py-0.5 rounded-full"
                      [class]="masteryClass(c.mastery)">
                  {{ masteryLabel(c.mastery) }}
                </span>
                @if (speaking()) {
                  <span class="text-success text-xs">● speaking</span>
                }
              </div>
            </div>

            @if (flipped()) {
              <div class="border-t border-slate-200 pt-3 mt-2">
                <div class="flex items-start gap-2">
                  <p class="m-0 font-semibold text-slate-900 flex-1">{{ c.definition }}</p>
                  <button
                    type="button"
                    class="shrink-0 text-slate-500 hover:text-slate-900 text-base disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 rounded"
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
                      class="shrink-0 text-slate-500 hover:text-slate-900 text-base disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 rounded"
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
                  <details class="mt-3 group">
                    <summary class="cursor-pointer text-blue-700 text-sm select-none hover:text-blue-900 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 rounded inline-block">
                      Hint (Spanish)
                    </summary>
                    <div class="mt-2 text-slate-600 text-sm leading-relaxed">
                      @for (seg of segmentsOf(c); track $index) {
                        <span [class]="segmentClass(c, seg, $index)">{{ seg.text }}</span>
                      }
                    </div>
                    <div class="mt-2">
                      <button
                        type="button"
                        class="px-2.5 py-1 text-xs rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                        (click)="speakBilingual(c)"
                        [disabled]="speaking() || !ttsSupported()"
                        title="Lee la explicación en español y los ejemplos en inglés"
                      >🔊 EN+ES</button>
                      @if (bilingualIndex() >= 0) {
                        <span class="text-xs text-slate-500 ml-2">
                          {{ bilingualIndex() + 1 }} / {{ bilingualTotal() }}
                        </span>
                      }
                    </div>
                  </details>
                }

                @if (c.lastRatings && c.lastRatings.length > 0) {
                  <div class="mt-3">
                    <div class="text-xs uppercase tracking-wide text-slate-500 mb-1">Your recent ratings</div>
                    <div class="flex flex-wrap gap-1">
                      @for (lr of c.lastRatings; track $index) {
                        <span class="text-xs px-2 py-0.5 rounded-full"
                              [class]="lastRatingClass(lr.rating)"
                              [attr.aria-label]="'Rated ' + lr.rating + ' on ' + formatDate(lr.reviewedAt)">
                          {{ ratingEmoji(lr.rating) }}
                        </span>
                      }
                    </div>
                  </div>
                }

                <p class="mt-2 text-slate-600 text-xs">
                  ease {{ c.easeFactor.toFixed(2) }} · interval {{ c.intervalDays }}d · reps {{ c.repetitions }} · lapses {{ c.lapses }}
                </p>
              </div>

              <div class="flex justify-between gap-2 mt-4">
                <button type="button"
                        class="flex-1 px-2 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                        (click)="rate('again')"
                        [disabled]="busy()"
                        aria-label="Rate Again">Again</button>
                <button type="button"
                        class="flex-1 px-2 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                        (click)="rate('hard')"
                        [disabled]="busy()"
                        aria-label="Rate Hard">Hard</button>
                <button type="button"
                        class="flex-1 px-2 py-1.5 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                        (click)="rate('good')"
                        [disabled]="busy()"
                        aria-label="Rate Good">Good</button>
                <button type="button"
                        class="flex-1 px-2 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                        (click)="rate('easy')"
                        [disabled]="busy()"
                        aria-label="Rate Easy">Easy</button>
              </div>
            } @else {
              <div class="text-center mt-2">
                <button type="button"
                        class="bg-slate-900 text-white px-4 py-1.5 rounded-md font-medium hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                        (click)="flip()">Show answer</button>
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
  private readonly masteryLabels = inject(MasteryLabelsService);
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
  protected readonly isFocused = signal(false);

  protected readonly retentionPct = computed(() => {
    const s = this.summary();
    if (!s || s.total === 0) return 0;
    return Math.round(((s.byRating.good + s.byRating.easy) / s.total) * 100);
  });

  private readonly segmentsCache = new Map<string, BilingualSegment[]>();

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('lesson_not_specified');
      this.loading.set(false);
      return;
    }
    this.setFocus(true);
    await this.load(id);
  }

  ngOnDestroy(): void {
    this.setFocus(false);
    this.tts.cancel();
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
      const result = await this.review.review(card.cardId, rating);
      this.advance(rating, result);
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

  masteryLabel(m: DueCard['mastery']): string {
    return this.masteryLabels.forKey(m)?.label ?? '';
  }

  masteryClass(m: DueCard['mastery']): string {
    return this.masteryLabels.forKey(m)?.badgeClass ?? '';
  }

  ratingEmoji(rating: string): string {
    if (rating === 'again') return '😖';
    if (rating === 'hard') return '😕';
    if (rating === 'good') return '🙂';
    if (rating === 'easy') return '😎';
    return '·';
  }

  lastRatingClass(rating: string): string {
    if (rating === 'again') return 'bg-red-100 text-red-700';
    if (rating === 'hard') return 'bg-amber-100 text-amber-700';
    if (rating === 'good') return 'bg-emerald-100 text-emerald-700';
    if (rating === 'easy') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-600';
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

  private setFocus(on: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.body.classList.toggle('study-mode', on);
    this.isFocused.set(on);
  }

  private advance(rating: Rating, result: Awaited<ReturnType<ReviewService['review']>>): void {
    const current = this.queue();
    const next = this.index() + 1;

    const updated: DueCard = {
      ...current[this.index()],
      mastery: result.progress.mastery,
      intervalDays: result.progress.intervalDays,
      repetitions: result.progress.repetitions,
      lapses: result.progress.lapses,
      easeFactor: result.progress.easeFactor,
      dueAt: result.progress.dueAt,
      lastReviewedAt: result.progress.lastReviewedAt,
      lastRatings: [
        { rating, reviewedAt: new Date().toISOString() },
        ...current[this.index()].lastRatings.slice(0, 4),
      ],
    };
    const queue = current.slice();
    queue[this.index()] = updated;
    this.queue.set(queue);

    if (next >= current.length) {
      const byRating = { again: 0, hard: 0, good: 0, easy: 0 };
      let longestInterval = 0;
      for (const c of queue) {
        byRating[c.lastRatings[0]?.rating as Rating ?? 'good'] += 1;
        if (c.intervalDays > longestInterval) {
          longestInterval = c.intervalDays;
        }
      }
      const retention = current.length === 0
        ? 0
        : Math.round(((byRating.good + byRating.easy) / current.length) * 100);
      this.summary.set({
        total: current.length,
        byRating,
        retention,
        streakBefore: result.userBefore.currentStreak,
        streakAfter: result.userAfter.currentStreak,
        newlyAwarded: result.newlyAwarded,
        longestIntervalDays: longestInterval,
      });
      return;
    }
    this.index.set(next);
    this.flipped.set(false);
  }
}
