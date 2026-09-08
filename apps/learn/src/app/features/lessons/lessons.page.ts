import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LessonsService } from '../../core/services/lessons.service';
import { ReviewService } from '../../core/services/review.service';
import {
  CatalogCategoryGroup,
  CatalogLevelGroup,
  CatalogLevelLesson,
  CatalogLessonSummary,
  OwnedLessonsByLevelGroup,
} from '../../core/models';
import { LearningPathComponent } from './learning-path.component';

type CatalogView = 'level' | 'category';

@Component({
  selector: 'app-lessons',
  standalone: true,
  imports: [FormsModule, RouterLink, LearningPathComponent],
  template: `
    @if (stats(); as s) {
      <section class="bg-slate-100 border border-slate-200 rounded-lg p-4 mb-4">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div class="text-2xl font-semibold text-slate-900">{{ s.dueNow }} due now</div>
            <div class="text-slate-600 text-sm">
              {{ s.dueToday }} due today · {{ s.learned }} learned · avg ease {{ s.averageEase }}
            </div>
          </div>
          @if (s.dueNow > 0) {
            <a
              routerLink="/lessons"
              class="no-underline px-3 py-1.5 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-700"
              (click)="reviewFirstDue($event)"
            >Start review</a>
          }
        </div>
      </section>
    }

    <app-learning-path />

    <section class="mb-6">
      <header class="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 class="text-lg font-semibold text-slate-900 m-0">Catalogue</h2>
        <div class="flex items-center gap-2 flex-wrap">
          <div role="tablist" class="inline-flex border border-slate-300 rounded-md overflow-hidden">
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="catalogView() === 'level'"
              (click)="setCatalogView('level')"
              [class]="catalogView() === 'level' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'"
              class="border-0 px-3 py-1.5 cursor-pointer text-sm"
            >Por nivel</button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="catalogView() === 'category'"
              (click)="setCatalogView('category')"
              [class]="catalogView() === 'category' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'"
              class="border-0 border-l border-slate-300 px-3 py-1.5 cursor-pointer text-sm"
            >Por categoría</button>
          </div>
          <button
            type="button"
            class="bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700"
            (click)="toggleCreate()"
          >{{ creating() ? 'Cancel' : '+ New lesson' }}</button>
        </div>
      </header>

      @if (catalogError()) {
        <p class="text-error mb-2">{{ catalogError() }}</p>
      }

      @if (catalogView() === 'level') {
        @if (byLevel().length === 0 && !catalogLoading()) {
          <p class="text-slate-600">No catalogue available yet.</p>
        }
        @for (group of byLevel(); track group.level) {
          <article class="bg-white border border-slate-200 rounded-lg p-4 mb-3">
            <header class="flex items-center justify-between mb-3">
              <h3 class="text-base font-semibold text-slate-900 m-0">{{ levelLabel(group.level) }}</h3>
              <span class="text-slate-500 text-sm">{{ group.lessons.length }} lesson(es)</span>
            </header>
            @for (lesson of group.lessons; track lesson.id) {
              <div class="flex items-center justify-between gap-3 py-3 border-t border-slate-200">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center flex-wrap gap-2">
                    <strong class="text-slate-900">{{ lesson.title }}</strong>
                    <span class="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-xs">
                      {{ lesson.categoryName }}
                    </span>
                    <span class="text-slate-500 text-sm">{{ lesson.cardCount }} cards</span>
                    @if (isEnrolled(lesson.id)) {
                      <span class="text-success text-sm">✓ Added</span>
                    }
                  </div>
                  @if (lesson.description) {
                    <div class="text-slate-600 text-sm mt-1">{{ lesson.description }}</div>
                  }
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <a
                    [routerLink]="['/lessons', lesson.id]"
                    [queryParams]="{ source: 'catalog' }"
                    class="text-blue-700 hover:text-blue-900 no-underline text-sm"
                  >Preview</a>
                  @if (isEnrolled(lesson.id)) {
                    <a
                      [routerLink]="['/lessons', enrolledLessonId(lesson.id)]"
                      class="text-blue-700 hover:text-blue-900 no-underline text-sm"
                    >Open</a>
                  } @else {
                    <button
                      type="button"
                      class="bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                      (click)="enrollById(lesson)"
                      [disabled]="isEnrolling(lesson.id)"
                    >{{ isEnrolling(lesson.id) ? 'Adding…' : '+ Add' }}</button>
                  }
                </div>
              </div>
            }
          </article>
        }
      } @else {
        @if (catalog().length === 0 && !catalogLoading()) {
          <p class="text-slate-600">No catalogue available yet.</p>
        }
        @for (group of catalog(); track group.id) {
          <article class="bg-white border border-slate-200 rounded-lg p-4 mb-3">
            <header class="flex items-center justify-between mb-3">
              <h3 class="text-base font-semibold text-slate-900 m-0">{{ group.name }}</h3>
              <span class="text-slate-500 text-sm">{{ group.lessons.length }} lesson(s)</span>
            </header>
            @for (lesson of group.lessons; track lesson.id) {
              <div class="flex items-center justify-between gap-3 py-3 border-t border-slate-200">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center flex-wrap gap-2">
                    <strong class="text-slate-900">{{ lesson.title }}</strong>
                    <span class="text-slate-500 text-sm">[{{ lesson.level }}]</span>
                    <span class="text-slate-500 text-sm">{{ lesson.cardCount }} cards</span>
                    @if (isEnrolled(lesson.id)) {
                      <span class="text-success text-sm">✓ Added</span>
                    }
                  </div>
                  @if (lesson.description) {
                    <div class="text-slate-600 text-sm mt-1">{{ lesson.description }}</div>
                  }
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <a
                    [routerLink]="['/lessons', lesson.id]"
                    [queryParams]="{ source: 'catalog' }"
                    class="text-blue-700 hover:text-blue-900 no-underline text-sm"
                  >Preview</a>
                  @if (isEnrolled(lesson.id)) {
                    <a
                      [routerLink]="['/lessons', enrolledLessonId(lesson.id)]"
                      class="text-blue-700 hover:text-blue-900 no-underline text-sm"
                    >Open</a>
                  } @else {
                    <button
                      type="button"
                      class="bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                      (click)="enroll(lesson)"
                      [disabled]="isEnrolling(lesson.id)"
                    >{{ isEnrolling(lesson.id) ? 'Adding…' : '+ Add to my lessons' }}</button>
                  }
                </div>
              </div>
            }
          </article>
        }
      }
    </section>

    @if (creating()) {
      <section class="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <h2 class="text-lg font-semibold text-slate-900 mt-0 mb-3">Create your own lesson</h2>
        <form (submit)="onCreate($event)">
          <div class="mb-2">
            <label for="title" class="block text-sm text-slate-600 mb-1">Title</label>
            <input
              id="title"
              name="title"
              required
              [(ngModel)]="draft.title"
              class="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div class="mb-2">
            <label for="description" class="block text-sm text-slate-600 mb-1">Description (optional)</label>
            <input
              id="description"
              name="description"
              [(ngModel)]="draft.description"
              class="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div class="mb-2">
            <label for="category" class="block text-sm text-slate-600 mb-1">Category</label>
            <select
              id="category"
              name="category"
              required
              [(ngModel)]="draft.categoryId"
              class="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:border-slate-500 focus:outline-none"
            >
              <option value="" disabled>Select…</option>
              @for (g of catalog(); track g.id) {
                <option [value]="g.id">{{ g.name }}</option>
              }
            </select>
          </div>
          <div class="mb-2">
            <label for="level" class="block text-sm text-slate-600 mb-1">Level</label>
            <select
              id="level"
              name="level"
              [(ngModel)]="draft.level"
              class="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:border-slate-500 focus:outline-none"
            >
              @for (l of levels; track l) {
                <option [value]="l">{{ l }}</option>
              }
            </select>
          </div>
          @if (createError()) {
            <p class="text-error text-sm mb-2">{{ createError() }}</p>
          }
          <button
            type="submit"
            class="bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
            [disabled]="creatingBusy() || !draft.categoryId"
          >{{ creatingBusy() ? 'Saving…' : 'Add lesson' }}</button>
        </form>
      </section>
    }

    <section>
      <h2 class="text-lg font-semibold text-slate-900 mb-3">My lessons</h2>
      @if (lessonsLoading()) {
        <p class="text-slate-600">Loading…</p>
      } @else if (lessonsGrouped().length === 0) {
        <p class="text-slate-600">
          You haven't added any lessons yet. Pick one from the catalogue above to get started.
        </p>
      } @else {
        <div class="grid gap-3">
          @for (group of lessonsGrouped(); track group.level) {
            <details class="bg-white border border-slate-200 rounded-lg p-4" open>
              <summary class="cursor-pointer flex items-center justify-between gap-3 list-none">
                <h3 class="text-base font-semibold text-slate-900 m-0">
                  {{ levelLabel(group.level) }}
                </h3>
                <span class="text-slate-500 text-sm">{{ group.lessons.length }} lesson(s)</span>
              </summary>
              <div class="mt-3 grid gap-3">
                @for (l of group.lessons; track l.id) {
                  <article class="border-t border-slate-200 pt-3">
                    <div class="flex items-center justify-between gap-3">
                      <div class="min-w-0">
                        <div class="flex items-center flex-wrap gap-2">
                          <strong class="text-slate-900">{{ l.title }}</strong>
                          <span class="text-slate-500 text-sm">{{ l.cardCount }} cards</span>
                        </div>
                        @if (l.description) {
                          <p class="text-slate-600 text-sm mt-1">{{ l.description }}</p>
                        }
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <a
                          [routerLink]="['/study', l.id]"
                          class="px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-sm no-underline text-slate-900"
                        >Study</a>
                        <a
                          [routerLink]="['/lessons', l.id]"
                          class="px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-sm no-underline text-slate-900"
                        >Open</a>
                      </div>
                    </div>
                  </article>
                }
              </div>
            </details>
          }
        </div>
      }
    </section>
  `,
})
export class LessonsPage implements OnInit {
  private readonly svc = inject(LessonsService);
  private readonly review = inject(ReviewService);
  private readonly router = inject(Router);

  protected readonly catalog = signal<CatalogCategoryGroup[]>([]);
  protected readonly byLevel = signal<CatalogLevelGroup[]>([]);
  protected readonly catalogView = signal<CatalogView>('level');
  protected readonly catalogLoading = signal(true);
  protected readonly catalogError = signal<string | null>(null);
  protected readonly enrolling = signal<Set<string>>(new Set());
  protected readonly enrolledSourceIds = signal<Set<string>>(new Set());
  protected readonly enrolledBySource = signal<Map<string, string>>(new Map());
  protected readonly lessonsGrouped = signal<OwnedLessonsByLevelGroup[]>([]);
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

  setCatalogView(view: CatalogView): void {
    this.catalogView.set(view);
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

  levelLabel(level: string): string {
    const map: Record<string, string> = {
      A1: 'A1 · Beginner',
      A2: 'A2 · Elementary',
      B1: 'B1 · Intermediate',
      B2: 'B2 · Upper Intermediate',
      C1: 'C1 · Advanced',
      C2: 'C2 · Proficiency',
    };
    return map[level] ?? level;
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

  async enrollById(lesson: CatalogLevelLesson): Promise<void> {
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
      const [byCategory, byLevel] = await Promise.all([
        this.svc.listCatalog(),
        this.svc.listCatalogByLevel(),
      ]);
      this.catalog.set(byCategory);
      this.byLevel.set(byLevel);
    } catch (err: unknown) {
      this.catalogError.set(err instanceof Error ? err.message : 'catalog_load_failed');
    } finally {
      this.catalogLoading.set(false);
    }
  }

  private async loadMyLessons(): Promise<void> {
    this.lessonsLoading.set(true);
    try {
      const rows = await this.svc.listGrouped();
      this.lessonsGrouped.set(rows);
      const sourceIds = new Set<string>();
      const map = new Map<string, string>();
      for (const group of rows) {
        for (const l of group.lessons) {
          if (l.sourceLessonId) {
            sourceIds.add(l.sourceLessonId);
            map.set(l.sourceLessonId, l.id);
          }
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
