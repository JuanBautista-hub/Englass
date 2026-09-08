import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LessonsService } from '../../core/services/lessons.service';
import { TtsService } from '../../core/services/tts.service';
import { Lesson, VocabularyCard } from '../../core/models';

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
        @if (!ttsSupported()) {
          <p class="error">
            Your browser does not support the Web Speech API. Try Chrome, Edge or Safari.
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
              <div>
                <strong>{{ c.term }}</strong>
                @if (speakingCardId() === c.id) {
                  <span style="color:#15803d;margin-left:0.5rem;font-size:0.85rem;">● speaking</span>
                }
              </div>
              <button (click)="speak(c)" [disabled]="isLoading(c.id) || !ttsSupported()">
                {{ isLoading(c.id) ? 'Speaking…' : 'Speak' }}
              </button>
            </div>
            <p style="margin:0.5rem 0 0;">{{ c.definition }}</p>
            @if (c.example) {
              <p style="margin:0.25rem 0 0;color:#475569;font-style:italic;">"{{ c.example }}"</p>
            }
            @if (c.translation) {
              <p style="margin:0.25rem 0 0;color:#64748b;">{{ c.translation }}</p>
            }
            @if (errorFor(c.id); as msg) {
              <p class="error">{{ msg }}</p>
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
  protected readonly speakingCardId = signal<string | null>(null);
  protected readonly cardErrors = signal<Map<string, string>>(new Map());
  protected readonly ttsSupported = signal(this.tts.isSupported());
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
    this.tts.cancel();
  }

  isLoading(cardId: string): boolean {
    return this.speakingCardId() === cardId;
  }

  errorFor(cardId: string): string | null {
    return this.cardErrors().get(cardId) ?? null;
  }

  async speak(card: VocabularyCard): Promise<void> {
    if (this.speakingCardId()) {
      this.tts.cancel();
    }
    this.speakingCardId.set(card.id);
    this.patchError(card.id, null);
    const handle = this.tts.speak(card.term, { lang: 'en-US', rate: 0.9 });
    if (!handle) {
      this.speakingCardId.set(null);
      this.patchError(card.id, 'speech_synthesis_unavailable');
      return;
    }
    try {
      await handle.done;
    } catch (err: unknown) {
      this.patchError(card.id, err instanceof Error ? err.message : 'speech_failed');
    } finally {
      if (this.speakingCardId() === card.id) {
        this.speakingCardId.set(null);
      }
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

  private patchError(cardId: string, message: string | null): void {
    const next = new Map(this.cardErrors());
    if (message === null) {
      next.delete(cardId);
    } else {
      next.set(cardId, message);
    }
    this.cardErrors.set(next);
  }
}
