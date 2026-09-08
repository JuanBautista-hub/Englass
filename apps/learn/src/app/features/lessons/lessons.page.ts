import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LessonsService } from '../../core/services/lessons.service';
import { CatalogCategoryGroup, CatalogLessonSummary, Lesson } from '../../core/models';

@Component({
  selector: 'app-lessons',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section>
      <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
        <h2 style="margin:0;">Catalogue</h2>
        <button class="primary" (click)="toggleCreate()">
          {{ creating() ? 'Cancel' : '+ New lesson' }}
        </button>
      </header>
      <p style="color:#475569;margin-top:0;">
        Pre-built lessons grouped by topic. Tap a lesson to study or to add it to your list.
      </p>

      @if (catalogError()) {
        <p class="error">{{ catalogError() }}</p>
      }

      @if (catalog().length === 0 && !catalogLoading()) {
        <p>No catalogue available yet.</p>
      }

      @for (group of catalog(); track group.id) {
        <article class="card">
          <header style="display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;">{{ group.name }}</h3>
            <span style="color:#64748b;font-size:0.85rem;">{{ group.lessons.length }} lesson(s)</span>
          </header>
          @for (lesson of group.lessons; track lesson.id) {
            <div
              style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-top:1px solid #e2e8f0;margin-top:0.5rem;"
            >
              <div style="flex:1;">
                <div>
                  <strong>{{ lesson.title }}</strong>
                  <span style="color:#64748b;margin-left:0.4rem;font-size:0.85rem;">[{{ lesson.level }}]</span>
                  <span style="color:#64748b;margin-left:0.4rem;font-size:0.85rem;">{{ lesson.cardCount }} cards</span>
                </div>
                @if (lesson.description) {
                  <div style="color:#475569;font-size:0.9rem;">{{ lesson.description }}</div>
                }
              </div>
              <div class="row">
                <a [routerLink]="['/lessons', catalogRouteId(lesson)]" [queryParams]="{ source: 'catalog' }">
                  Preview
                </a>
                <button
                  class="primary"
                  (click)="enroll(lesson)"
                  [disabled]="isEnrolling(lesson.id)"
                >
                  {{ isEnrolling(lesson.id) ? 'Adding…' : '+ Add to my lessons' }}
                </button>
              </div>
            </div>
          }
        </article>
      }
    </section>

    @if (creating()) {
      <section class="card">
        <h2>Create your own lesson</h2>
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
              @for (g of catalog(); track g.id) {
                <option [value]="g.id">{{ g.name }}</option>
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
          @if (createError()) {
            <p class="error">{{ createError() }}</p>
          }
          <button type="submit" class="primary" [disabled]="creatingBusy() || !draft.categoryId">
            {{ creatingBusy() ? 'Saving…' : 'Add lesson' }}
          </button>
        </form>
      </section>
    }

    <section>
      <h2>My lessons</h2>
      @if (lessonsLoading()) {
        <p>Loading…</p>
      } @else if (lessons().length === 0) {
        <p style="color:#475569;">
          You haven't added any lessons yet. Pick one from the catalogue above to get started.
        </p>
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

  protected readonly catalog = signal<CatalogCategoryGroup[]>([]);
  protected readonly catalogLoading = signal(true);
  protected readonly catalogError = signal<string | null>(null);
  protected readonly enrolling = signal<Set<string>>(new Set());
  protected readonly lessons = signal<Lesson[]>([]);
  protected readonly lessonsLoading = signal(true);
  protected readonly creating = signal(false);
  protected readonly creatingBusy = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  protected draft = { title: '', description: '', categoryId: '', level: 'A1' };

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadCatalog(), this.loadMyLessons()]);
  }

  toggleCreate(): void {
    this.creating.update((v) => !v);
    this.createError.set(null);
  }

  catalogRouteId(lesson: CatalogLessonSummary): string {
    return lesson.id;
  }

  isEnrolling(id: string): boolean {
    return this.enrolling().has(id);
  }

  async enroll(lesson: CatalogLessonSummary): Promise<void> {
    if (this.enrolling().has(lesson.id)) {
      return;
    }
    this.markEnrolling(lesson.id, true);
    this.catalogError.set(null);
    try {
      await this.svc.enrollInCatalog(lesson.id);
      await this.loadMyLessons();
    } catch (err: unknown) {
      this.catalogError.set(err instanceof Error ? err.message : 'enroll_failed');
    } finally {
      this.markEnrolling(lesson.id, false);
    }
  }

  async onCreate(event: Event): Promise<void> {
    event.preventDefault();
    this.creatingBusy.set(true);
    this.createError.set(null);
    try {
      await this.svc.create({
        title: this.draft.title,
        description: this.draft.description || undefined,
        categoryId: this.draft.categoryId,
        level: this.draft.level,
      });
      this.draft = { title: '', description: '', categoryId: '', level: 'A1' };
      this.creating.set(false);
      await this.loadMyLessons();
    } catch (err: unknown) {
      this.createError.set(err instanceof Error ? err.message : 'create_failed');
    } finally {
      this.creatingBusy.set(false);
    }
  }

  private async loadCatalog(): Promise<void> {
    this.catalogLoading.set(true);
    try {
      this.catalog.set(await this.svc.listCatalog());
    } catch (err: unknown) {
      this.catalogError.set(err instanceof Error ? err.message : 'catalog_load_failed');
    } finally {
      this.catalogLoading.set(false);
    }
  }

  private async loadMyLessons(): Promise<void> {
    this.lessonsLoading.set(true);
    try {
      this.lessons.set(await this.svc.list());
    } catch {
      // existing behaviour: silent load failure for personal lessons
    } finally {
      this.lessonsLoading.set(false);
    }
  }

  private markEnrolling(id: string, on: boolean): void {
    const next = new Set(this.enrolling());
    if (on) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.enrolling.set(next);
  }
}
