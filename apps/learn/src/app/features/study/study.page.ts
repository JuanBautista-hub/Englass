import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DueCard, Rating, ReviewService } from '../../core/services/review.service';
import { TtsService } from '../../core/services/tts.service';

interface SessionStat {
  rating: Rating;
  count: number;
}

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
    <a routerLink="/lessons">← Back</a>
    @if (lessonTitle(); as title) {
      <h2 style="margin-top:0.5rem;">{{ title }}</h2>
    }

    @if (loading()) {
      <p>Loading…</p>
    } @else if (error()) {
      <p class="error">{{ error() }}</p>
      <button (click)="restart()">Retry</button>
    } @else {
      @if (summary(); as s) {
        <section class="card">
          <h2 style="margin-top:0;">Session complete</h2>
          <p>You reviewed <strong>{{ s.total }}</strong> card(s).</p>
          <ul style="list-style:none;padding:0;">
            <li>Again: {{ s.byRating.again }}</li>
            <li>Hard: {{ s.byRating.hard }}</li>
            <li>Good: {{ s.byRating.good }}</li>
            <li>Easy: {{ s.byRating.easy }}</li>
          </ul>
          @if (s.nextDueAt) {
            <p style="color:#475569;font-size:0.9rem;">
              Next due: {{ formatDate(s.nextDueAt) }}
            </p>
          } @else {
            <p style="color:#15803d;">All caught up — nothing else is due right now.</p>
          }
          <div class="row" style="margin-top:0.5rem;">
            <button (click)="restart()">Study again</button>
            <a routerLink="/lessons">Done</a>
          </div>
        </section>
      } @else if (queue().length === 0) {
        <section class="card">
          <h2 style="margin-top:0;">Nothing due</h2>
          <p>No cards are due for review in this lesson right now. Come back later.</p>
          <a routerLink="/lessons">Back to lessons</a>
        </section>
      } @else {
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
        <span style="color:#64748b;font-size:0.9rem;">
          {{ index() + 1 }} / {{ queue().length }}
        </span>
        <button (click)="speak(current())" [disabled]="!current() || !ttsSupported()">
          Speak
        </button>
      </div>

      @if (current(); as c) {
        <article class="card">
          <div style="text-align:center;padding:1rem 0;">
            <div style="font-size:2rem;font-weight:600;">{{ c.term }}</div>
            @if (speaking()) {
              <div style="color:#15803d;font-size:0.85rem;margin-top:0.25rem;">● speaking</div>
            }
          </div>

          @if (flipped()) {
            <div style="border-top:1px solid #e2e8f0;padding-top:0.75rem;">
              <p style="margin:0 0 0.5rem;"><strong>{{ c.definition }}</strong></p>
              @if (c.example) {
                <p style="margin:0 0 0.25rem;color:#475569;font-style:italic;">"{{ c.example }}"</p>
              }
              @if (c.translation) {
                <p style="margin:0;color:#64748b;">{{ c.translation }}</p>
              }
              <p style="margin:0.5rem 0 0;color:#94a3b8;font-size:0.8rem;">
                ease {{ c.easeFactor.toFixed(2) }} · interval {{ c.intervalDays }}d · reps {{ c.repetitions }} · lapses {{ c.lapses }}
              </p>
            </div>

            <div class="row" style="margin-top:0.75rem;justify-content:space-between;">
              <button (click)="rate('again')" [disabled]="busy()">Again</button>
              <button (click)="rate('hard')" [disabled]="busy()">Hard</button>
              <button (click)="rate('good')" class="primary" [disabled]="busy()">Good</button>
              <button (click)="rate('easy')" [disabled]="busy()">Easy</button>
            </div>
          } @else {
            <div style="text-align:center;margin-top:0.5rem;">
              <button class="primary" (click)="flip()">Show answer</button>
            </div>
          }
        </article>

        @if (lastError()) {
          <p class="error">{{ lastError() }}</p>
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
  protected readonly ttsSupported = signal(this.tts.isSupported());

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

  async speak(card: DueCard | null): Promise<void> {
    if (!card) {
      return;
    }
    this.speaking.set(true);
    const handle = this.tts.speak(card.term, { lang: 'en-US', rate: 0.9 });
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
