import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LearningPathService } from '../../core/services/learning-path.service';
import { LearningPathLevel, PathLevelStatus } from '../../core/models';

@Component({
  selector: 'app-learning-path',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="bg-white border border-slate-200 rounded-lg p-4 mb-4">
      <header class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold text-slate-900 m-0">Learning path</h2>
        @if (levels().length === 0 && !loading()) {
          <span class="text-sm text-slate-500">No path yet</span>
        }
      </header>

      @if (loading()) {
        <p class="text-slate-600 text-sm">Loading…</p>
      } @else {
        <ol class="list-none p-0 m-0 flex flex-col gap-2">
          @for (lvl of levels(); track lvl.level) {
            <li class="flex items-center gap-3 p-3 border border-slate-200 rounded-md"
                [class.bg-slate-50]="lvl.status === 'completed'"
                [class.opacity-60]="lvl.status === 'locked'">
              <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-full text-sm font-semibold"
                   [class]="statusBg(lvl.status)"
                   [attr.aria-label]="statusLabel(lvl.status)">
                @if (lvl.status === 'completed') { ✓ }
                @else if (lvl.status === 'locked') { 🔒 }
                @else { {{ lvl.level }} }
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <strong class="text-slate-900">{{ levelName(lvl.level) }}</strong>
                  <span class="text-xs px-2 py-0.5 rounded-full"
                        [class]="statusBadge(lvl.status)">{{ statusLabel(lvl.status) }}</span>
                </div>
                <div class="text-xs text-slate-500 mt-0.5">
                  {{ lvl.completedLessons }} / {{ lvl.totalLessons }} lessons · {{ lvl.percent }}%
                </div>
                @if (lvl.totalLessons > 0) {
                  <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                    <div class="h-full bg-emerald-500 motion-safe:transition-[width] motion-safe:duration-300"
                         [style.width.%]="lvl.percent"></div>
                  </div>
                }
              </div>
              @if (lvl.status !== 'locked' && lvl.recommendedLessonId) {
                <a
                  [routerLink]="['/study', lvl.recommendedLessonId]"
                  class="shrink-0 px-3 py-1.5 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 no-underline"
                >Continue</a>
              }
            </li>
          }
        </ol>
      }
    </section>
  `,
})
export class LearningPathComponent implements OnInit {
  private readonly svc = inject(LearningPathService);

  protected readonly levels = signal<LearningPathLevel[]>([]);
  protected readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      this.levels.set(await this.svc.get());
    } catch {
      // ignore
    } finally {
      this.loading.set(false);
    }
  }

  statusLabel(s: PathLevelStatus): string {
    if (s === 'completed') return 'Completed';
    if (s === 'locked') return 'Locked';
    if (s === 'in_progress') return 'In progress';
    return 'Available';
  }

  statusBg(s: PathLevelStatus): string {
    if (s === 'completed') return 'bg-emerald-500 text-white';
    if (s === 'locked') return 'bg-slate-300 text-slate-600';
    if (s === 'in_progress') return 'bg-amber-400 text-white';
    return 'bg-white border border-slate-300 text-slate-700';
  }

  statusBadge(s: PathLevelStatus): string {
    if (s === 'completed') return 'bg-emerald-100 text-emerald-800';
    if (s === 'locked') return 'bg-slate-200 text-slate-600';
    if (s === 'in_progress') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-700';
  }

  levelName(level: string): string {
    return level;
  }
}
