import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LessonsService } from '../../core/services/lessons.service';
import { ReviewService } from '../../core/services/review.service';
import { CatalogCategoryGroup, CatalogLessonSummary, Lesson } from '../../core/models';

@Component({
  selector: 'app-lessons',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    @if (stats(); as s) {
      <section class="card" style="background:#f1f5f9;">
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <div style="font-size:1.5rem;font-weight:600;">{{ s.dueNow }} due now</div>
            <div style="color:#475569;font-size:0.85rem;">
              {{ s.dueToday }} due today · {{ s.learned }} learned · avg ease {{ s.averageEase }}
            </div>
          </div>
          @if (s.dueNow > 0) {
            <a class="primary" routerLink="/lessons" style="text-decoration:none;padding:0.5rem 0.9rem;background:#1f2937;color:#fff;border-radius:6px;" (click)="reviewFirstDue($event)">
              Start review
            </a>
          }
        </div>
      </section>
    }

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
                  @if (isEnrolled(lesson.id)) {
                    <span style="color:#15803d;margin-left:0.4rem;font-size:0.85rem;">✓ Added</span>
                  }
                </div>
                @if (lesson.description) {
                  <div style="color:#475569;font-size:0.9rem;">{{ lesson.description }}</div>
                }
              </div>
              <div class="row">
                <a [routerLink]="['/lessons', lesson.id]" [queryParams]="{ source: 'catalog' }">
                  Preview
                </a>
                @if (isEnrolled(lesson.id)) {
                  <a [routerLink]="['/lessons', enrolledLessonId(lesson.id)]">Open</a>
                } @else {
                  <button
                    class="primary"
                    (click)="enroll(lesson)"
                    [disabled]="isEnrolling(lesson.id)"
                  >
                    {{ isEnrolling(lesson.id) ? 'Adding…' : '+ Add to my lessons' }}
                  </button>
                }
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
              <div class="row">
                <a [routerLink]="['/study', l.id]">Study</a>
                <a [routerLink]="['/lessons', l.id]">Open</a>
              </div>
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
  private readonly review = inject(ReviewService);
  private readonly router = inject(Router);

  protected readonly catalog = signal<CatalogCategoryGroup[]>([]);
  protected readonly catalogLoading = signal(true);
  protected readonly catalogError = signal<string | null>(null);
  protected readonly enrolling = signal<Set<string>>(new Set());
  protected readonly enrolledSourceIds = signal<Set<string>>(new Set());
  protected readonly enrolledBySource = signal<Map<string, string>>(new Map());
  protected readonly lessons = signal<Lesson[]>([]);
  protected readonly lessonsLoading = signal(true);
  protected readonly creating = signal(false);
  protected readonly creatingBusy = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly stats = signal<{ dueNow: number; dueToday: number; learned: number; averageEase: number } | null>(null);
  protected readonly levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  protected draft = { title: '', description: '', categoryId: '', level: 'A1' };

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadCatalog(), this.loadMyLessons(), this.loadStats()]);
  }

  toggleCreate(): void {
    this.creating.update((v) => !v);
    this.createError.set(null);
  }

  isEnrolling(id: string): boolean {
    return this.enrolling().has(id);
  }

  isEnrolled(catalogLessonId: string): boolean {
    return this.enrolledSourceIds().has(catalogLessonId);
  }

  enrolledLessonId(catalogLessonId: string): string | null {
    return this.enrolledBySource().get(catalogLessonId) ?? null;
  }

  async enroll(lesson: CatalogLessonSummary): Promise<void> {
    if (this.enrolling().has(lesson.id) || this.isEnrolled(lesson.id)) {
      return;
    }
    this.markEnrolling(lesson.id, true);
    this.catalogError.set(null);
    try {
      const cloned = await this.svc.enrollInCatalog(lesson.id);
      this.markEnrolled(cloned.sourceLessonId, cloned.id);
      await this.router.navigate(['/lessons', cloned.id]);
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

  async reviewFirstDue(event: Event): Promise<void> {
    event.preventDefault();
    try {
      const due = await this.review.allDue(1);
      if (due.length > 0) {
        await this.router.navigate(['/study', due[0].lessonId]);
      }
    } catch {
      // best-effort
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
      const rows = await this.svc.list();
      this.lessons.set(rows);
      const sourceIds = new Set<string>();
      const map = new Map<string, string>();
      for (const l of rows) {
        if (l.sourceLessonId) {
          sourceIds.add(l.sourceLessonId);
          map.set(l.sourceLessonId, l.id);
        }
      }
      this.enrolledSourceIds.set(sourceIds);
      this.enrolledBySource.set(map);
    } catch {
      // existing behaviour: silent load failure for personal lessons
    } finally {
      this.lessonsLoading.set(false);
    }
  }

  private async loadStats(): Promise<void> {
    try {
      this.stats.set(await this.review.stats());
    } catch {
      // ignore: stats are decorative
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

  private markEnrolled(sourceId: string | null, personalLessonId: string): void {
    if (!sourceId) {
      return;
    }
    const sourceIds = new Set(this.enrolledSourceIds());
    sourceIds.add(sourceId);
    this.enrolledSourceIds.set(sourceIds);
    const map = new Map(this.enrolledBySource());
    map.set(sourceId, personalLessonId);
    this.enrolledBySource.set(map);
  }
}
