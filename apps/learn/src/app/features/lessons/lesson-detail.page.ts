import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LessonsService } from '../../core/services/lessons.service';
import { TtsService } from '../../core/services/tts.service';
import { Lesson, VocabularyCard } from '../../core/models';

interface CardSpeechState {
  speaking: 'en' | 'es' | null;
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
                @if (stateFor(c.id); as st) {
                  @if (st.speaking === 'en') {
                    <span style="color:#15803d;margin-left:0.5rem;font-size:0.85rem;">● EN</span>
                  } @else if (st.speaking === 'es') {
                    <span style="color:#15803d;margin-left:0.5rem;font-size:0.85rem;">● ES</span>
                  }
                }
              </div>
              <div class="row">
                <button (click)="speak(c, 'en')" [disabled]="isSpeaking(c.id) || !ttsSupported()">
                  Speak (EN)
                </button>
                <button (click)="speak(c, 'es')" [disabled]="isSpeaking(c.id) || !ttsSupported() || !spanishText(c)">
                  Hablar (ES)
                </button>
              </div>
            </div>
            <p style="margin:0.5rem 0 0;">{{ c.definition }}</p>
            @if (c.example) {
              <p style="margin:0.25rem 0 0;color:#475569;font-style:italic;">"{{ c.example }}"</p>
            }
            @if (c.translation) {
              <p style="margin:0.25rem 0 0;color:#64748b;">{{ c.translation }}</p>
            }
            @if (c.explanationEs) {
              <details style="margin-top:0.5rem;">
                <summary style="cursor:pointer;color:#1d4ed8;">Explicación en español</summary>
                <p style="margin:0.5rem 0 0;color:#475569;">{{ c.explanationEs }}</p>
              </details>
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
            <div style="margin-bottom:0.5rem;">
              <label for="explanationEs">Explicación en español (opcional)</label>
              <textarea id="explanationEs" name="explanationEs" rows="3" [(ngModel)]="cardDraft.explanationEs"></textarea>
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
  protected readonly speechStates = signal<Map<string, CardSpeechState>>(new Map());
  protected readonly ttsSupported = signal(this.tts.isSupported());
  protected cardDraft = { term: '', definition: '', example: '', translation: '', explanationEs: '' };

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

  isSpeaking(cardId: string): boolean {
    return this.stateFor(cardId)?.speaking !== null && this.stateFor(cardId)?.speaking !== undefined;
  }

  errorFor(cardId: string): string | null {
    return this.stateFor(cardId)?.error ?? null;
  }

  spanishText(card: VocabularyCard): string | null {
    return card.explanationEs ?? card.translation;
  }

  async speak(card: VocabularyCard, lang: 'en' | 'es'): Promise<void> {
    const text = lang === 'en' ? card.term : this.spanishText(card);
    if (!text) {
      return;
    }
    this.tts.cancel();
    this.patchSpeech(card.id, { speaking: lang, error: null });
    const handle = this.tts.speak(text, {
      lang: lang === 'en' ? 'en-US' : 'es-ES',
      rate: 0.9,
    });
    if (!handle) {
      this.patchSpeech(card.id, { speaking: null, error: 'speech_synthesis_unavailable' });
      return;
    }
    try {
      await handle.done;
    } catch (err: unknown) {
      this.patchSpeech(card.id, {
        speaking: null,
        error: err instanceof Error ? err.message : 'speech_failed',
      });
      return;
    }
    this.patchSpeech(card.id, { speaking: null });
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
    const current = next.get(cardId) ?? { speaking: null, error: null };
    next.set(cardId, { ...current, ...patch });
    this.speechStates.set(next);
  }
}
