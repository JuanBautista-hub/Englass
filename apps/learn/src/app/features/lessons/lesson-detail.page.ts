import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LessonsService } from '../../core/services/lessons.service';
import { TtsService } from '../../core/services/tts.service';
import { Lesson, VocabularyCard } from '../../core/models';

interface CardPlayback {
  cardId: string;
  url: string | null;
  voice: string | null;
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <a routerLink="/lessons">← Back</a>
    @if (lesson(); as l) {
      <section class="card" style="margin-top:0.75rem;">
        <div class="row" style="justify-content:space-between;align-items:flex-start;">
          <div>
            <h2 style="margin:0;">{{ l.title }}</h2>
            <p style="margin:0;color:#64748b;">[{{ l.level }}]</p>
          </div>
          @if (isCatalog()) {
            <button class="primary" (click)="enroll()" [disabled]="enrolling()">
              {{ enrolling() ? 'Adding…' : '+ Add to my lessons' }}
            </button>
          }
        </div>
        @if (l.description) {
          <p style="color:#475569;">{{ l.description }}</p>
        }
        @if (isCatalog()) {
          <p style="color:#475569;font-size:0.85rem;margin:0;">
            Preview from the catalogue. Add it to start tracking your progress.
          </p>
        }
      </section>

      <section>
        <h2>Cards</h2>
        @if (l.cards.length === 0) {
          <p>No cards yet.</p>
        }
        @for (c of l.cards; track c.id) {
          <article class="card">
            <div class="row" style="justify-content:space-between;">
              <strong>{{ c.term }}</strong>
              <button (click)="speak(c)" [disabled]="isLoading(c.id)">
                {{ isLoading(c.id) ? 'Playing…' : 'Play TTS' }}
              </button>
            </div>
            <p style="margin:0.5rem 0 0;">{{ c.definition }}</p>
            @if (c.example) {
              <p style="margin:0.25rem 0 0;color:#475569;font-style:italic;">"{{ c.example }}"</p>
            }
            @if (c.translation) {
              <p style="margin:0.25rem 0 0;color:#64748b;">{{ c.translation }}</p>
            }
            @if (audioFor(c.id); as pb) {
              @if (pb.url) {
                <audio
                  [attr.data-card-id]="c.id"
                  [src]="pb.url"
                  (ended)="onEnded(c.id)"
                  controls
                  autoplay
                  style="display:block;margin-top:0.5rem;width:100%;"
                ></audio>
              }
              @if (pb.error) {
                <p class="error">{{ pb.error }}</p>
              }
            }
          </article>
        }
      </section>

      @if (!isCatalog()) {
        <section class="card">
          <h3>Add card</h3>
          <form (submit)="onAddCard($event, l.id)">
            <div style="margin-bottom:0.5rem;">
              <label for="term">Term</label>
              <input id="term" name="term" required [(ngModel)]="cardDraft.term" />
            </div>
            <div style="margin-bottom:0.5rem;">
              <label for="definition">Definition</label>
              <textarea id="definition" name="definition" rows="2" required [(ngModel)]="cardDraft.definition"></textarea>
            </div>
            <div style="margin-bottom:0.5rem;">
              <label for="example">Example (optional)</label>
              <input id="example" name="example" [(ngModel)]="cardDraft.example" />
            </div>
            <div style="margin-bottom:0.5rem;">
              <label for="translation">Translation (optional)</label>
              <input id="translation" name="translation" [(ngModel)]="cardDraft.translation" />
            </div>
            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
            <button type="submit" class="primary" [disabled]="adding()">
              {{ adding() ? 'Saving…' : 'Add card' }}
            </button>
          </form>
        </section>
      }
    } @else if (loading()) {
      <p>Loading…</p>
    } @else {
      <p>Lesson not found.</p>
    }
  `,
})
export class LessonDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lessons = inject(LessonsService);
  private readonly tts = inject(TtsService);

  protected readonly lesson = signal<Lesson | null>(null);
  protected readonly loading = signal(true);
  protected readonly isCatalog = signal(false);
  protected readonly adding = signal(false);
  protected readonly enrolling = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly playback = signal<Map<string, CardPlayback>>(new Map());
  protected cardDraft = { term: '', definition: '', example: '', translation: '' };

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
    for (const pb of this.playback().values()) {
      if (pb.url) {
        this.tts.release(pb.url);
      }
    }
  }

  audioFor(cardId: string): CardPlayback | null {
    return this.playback().get(cardId) ?? null;
  }

  isLoading(cardId: string): boolean {
    return this.playback().get(cardId)?.loading ?? false;
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

  async speak(card: VocabularyCard): Promise<void> {
    this.patchPlayback(card.id, { loading: true, error: null });
    try {
      const prev = this.playback().get(card.id)?.url;
      if (prev) {
        this.tts.release(prev);
      }
      const result = await this.tts.synthesize(card.term);
      this.patchPlayback(card.id, {
        url: result.url,
        voice: result.voice,
        loading: false,
        error: null,
      });
      this.tryAutoplay(card.id);
    } catch (err: unknown) {
      this.patchPlayback(card.id, {
        loading: false,
        error: err instanceof Error ? err.message : 'tts_failed',
      });
    }
  }

  onEnded(cardId: string): void {
    this.patchPlayback(cardId, { loading: false });
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
      });
      this.cardDraft = { term: '', definition: '', example: '', translation: '' };
      await this.load(lessonId);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'card_create_failed');
    } finally {
      this.adding.set(false);
    }
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
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

  private tryAutoplay(cardId: string): void {
    setTimeout(() => {
      const audio = document.querySelector<HTMLAudioElement>(
        `audio[data-card-id="${cardId}"]`,
      );
      audio?.play().catch(() => {
        // Autoplay blocked by browser; user can press play in the controls.
      });
    }, 0);
  }

  private patchPlayback(cardId: string, patch: Partial<CardPlayback>): void {
    const next = new Map(this.playback());
    const current = next.get(cardId) ?? {
      cardId,
      url: null,
      voice: null,
      loading: false,
      error: null,
    };
    next.set(cardId, { ...current, ...patch });
    this.playback.set(next);
  }
}
