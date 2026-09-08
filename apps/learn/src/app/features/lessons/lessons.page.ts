import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LessonsService } from '../../core/services/lessons.service';
import { CategoriesService } from '../../core/services/categories.service';
import { Category, Lesson } from '../../core/models';

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
          <label for="description">Description (optional)</label>
          <input id="description" name="description" [(ngModel)]="draft.description" />
        </div>
        <div style="margin-bottom:0.5rem;">
          <label for="category">Category</label>
          <select id="category" name="category" required [(ngModel)]="draft.categoryId">
            <option value="" disabled>Select…</option>
            @for (c of categories(); track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select>
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
        <button type="submit" class="primary" [disabled]="creating() || !draft.categoryId">
          {{ creating() ? 'Saving…' : 'Add lesson' }}
        </button>
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
                <span style="color:#64748b;margin-left:0.5rem;">{{ l.cards.length }} cards</span>
              </div>
              <a [routerLink]="['/lessons', l.id]">Open</a>
            </div>
            @if (l.description) {
              <p style="margin:0.5rem 0 0;color:#475569;">{{ l.description }}</p>
            }
          </article>
        }
      }
    </section>
  `,
})
export class LessonsPage implements OnInit {
  private readonly svc = inject(LessonsService);
  private readonly catSvc = inject(CategoriesService);

  protected readonly lessons = signal<Lesson[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(true);
  protected readonly creating = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  protected draft = { title: '', description: '', categoryId: '', level: 'A1' };

  async ngOnInit(): Promise<void> {
    await Promise.all([this.refresh(), this.loadCategories()]);
  }

  async onCreate(event: Event): Promise<void> {
    event.preventDefault();
    this.creating.set(true);
    this.error.set(null);
    try {
      await this.svc.create({
        title: this.draft.title,
        description: this.draft.description || undefined,
        categoryId: this.draft.categoryId,
        level: this.draft.level,
      });
      this.draft = { title: '', description: '', categoryId: '', level: 'A1' };
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

  private async loadCategories(): Promise<void> {
    try {
      this.categories.set(await this.catSvc.list());
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'categories_load_failed');
    }
  }
}
