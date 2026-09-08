import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LessonsService } from '../../core/services/lessons.service';
import { Lesson } from '../../core/models';

@Component({
  selector: 'app-lessons',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="card">
      <h2>New lesson</h2>
      <form (submit)="onCreate($event)">
        <div style="margin-bottom:0.5rem;">
          <label for="title">Title</label>
          <input id="title" name="title" required [(ngModel)]="draft.title" />
        </div>
        <div style="margin-bottom:0.5rem;">
          <label for="prompt">Prompt (English)</label>
          <textarea id="prompt" name="prompt" rows="2" required [(ngModel)]="draft.prompt"></textarea>
        </div>
        <div style="margin-bottom:0.5rem;">
          <label for="translation">Translation (optional)</label>
          <input id="translation" name="translation" [(ngModel)]="draft.translation" />
        </div>
        <div style="margin-bottom:0.5rem;">
          <label for="level">Level</label>
          <select id="level" name="level" [(ngModel)]="draft.level">
            @for (l of levels; track l) {
              <option [value]="l">{{ l }}</option>
            }
          </select>
        </div>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <button type="submit" class="primary" [disabled]="creating()">{{ creating() ? 'Saving…' : 'Add lesson' }}</button>
      </form>
    </section>

    <section>
      <h2>Your lessons</h2>
      @if (loading()) {
        <p>Loading…</p>
      } @else if (lessons().length === 0) {
        <p>No lessons yet. Add one above.</p>
      } @else {
        @for (l of lessons(); track l.id) {
          <article class="card">
            <div class="row" style="justify-content:space-between;">
              <div>
                <strong>{{ l.title }}</strong>
                <span style="color:#64748b;margin-left:0.5rem;">[{{ l.level }}]</span>
              </div>
              <a [routerLink]="['/lessons', l.id]">Open</a>
            </div>
            <p style="margin:0.5rem 0 0;">{{ l.prompt }}</p>
            @if (l.translation) {
              <p style="margin:0;color:#475569;">{{ l.translation }}</p>
            }
          </article>
        }
      }
    </section>
  `,
})
export class LessonsPage implements OnInit {
  private readonly svc = inject(LessonsService);

  protected readonly lessons = signal<Lesson[]>([]);
  protected readonly loading = signal(true);
  protected readonly creating = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  protected draft = { title: '', prompt: '', translation: '', level: 'A1' };

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  async onCreate(event: Event): Promise<void> {
    event.preventDefault();
    this.creating.set(true);
    this.error.set(null);
    try {
      await this.svc.create({
        title: this.draft.title,
        prompt: this.draft.prompt,
        translation: this.draft.translation || undefined,
        level: this.draft.level,
      });
      this.draft = { title: '', prompt: '', translation: '', level: 'A1' };
      await this.refresh();
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'create_failed');
    } finally {
      this.creating.set(false);
    }
  }

  private async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      this.lessons.set(await this.svc.list());
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'load_failed');
    } finally {
      this.loading.set(false);
    }
  }
}
