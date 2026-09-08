import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { AchievementsService, Achievement } from '../../core/services/achievements.service';
import { DashboardView } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (loading()) {
      <p class="text-slate-600">Loading…</p>
    } @else if (error()) {
      <p class="text-error">{{ error() }}</p>
    } @else {
      <section class="bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-lg p-5 mb-4 motion-safe:transition motion-safe:hover:shadow-lg">
        <div class="text-sm uppercase tracking-wide opacity-80">{{ greetingLabel(view().greeting) }}</div>
        <div class="text-2xl font-semibold mt-1">{{ view().displayName }}</div>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-md" aria-label="Current streak">
            <span aria-hidden="true">🔥</span>
            <span class="font-semibold">{{ view().currentStreak }}</span>
            <span class="text-sm opacity-80">day streak</span>
            @if (view().bestStreak > view().currentStreak) {
              <span class="text-xs opacity-60">(best {{ view().bestStreak }})</span>
            }
          </div>
          <div class="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-md" aria-label="Due cards now">
            <span aria-hidden="true">⏰</span>
            <span class="font-semibold">{{ view().dueNow }}</span>
            <span class="text-sm opacity-80">due now</span>
          </div>
          <div class="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-md" aria-label="Daily goal">
            <span aria-hidden="true">🎯</span>
            <span class="font-semibold">{{ view().dailyGoal.completed }} / {{ view().dailyGoal.target }}</span>
            <span class="text-sm opacity-80">today</span>
          </div>
        </div>
      </section>

      <section class="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <header class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-semibold text-slate-900 m-0">Next up</h2>
          @if (view().level) {
            <span class="text-sm text-slate-500">Level {{ view().level }}</span>
          }
        </header>
        @if (view().nextLesson; as n) {
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="font-medium text-slate-900">{{ n.title }}</div>
              <div class="text-sm text-slate-500">
                {{ n.categoryName }} · {{ n.dueCount }} card{{ n.dueCount === 1 ? '' : 's' }} due
              </div>
            </div>
            <a
              [routerLink]="['/study', n.lessonId]"
              class="px-3 py-1.5 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 no-underline"
            >Study now</a>
          </div>
        } @else {
          <p class="text-slate-600 text-sm">No recommended lesson yet. Add one from the catalogue.</p>
        }
      </section>

      @if (view().levelProgress.totalLessons > 0) {
        <section class="bg-white border border-slate-200 rounded-lg p-4 mb-4">
          <h2 class="text-lg font-semibold text-slate-900 mt-0 mb-3">Level progress</h2>
          <div class="text-sm text-slate-600 mb-1">
            {{ view().levelProgress.completedLessons }} / {{ view().levelProgress.totalLessons }} lessons
            ({{ view().levelProgress.percent }}%)
          </div>
          <div class="h-2 bg-slate-200 rounded-full overflow-hidden" role="progressbar"
               [attr.aria-valuenow]="view().levelProgress.percent" aria-valuemin="0" aria-valuemax="100">
            <div class="h-full bg-emerald-500 motion-safe:transition-[width] motion-safe:duration-500"
                 [style.width.%]="view().levelProgress.percent"></div>
          </div>
        </section>
      }

      <section class="bg-white border border-slate-200 rounded-lg p-4">
        <h2 class="text-lg font-semibold text-slate-900 mt-0 mb-3">Achievements</h2>
        @if (achievements().length === 0) {
          <p class="text-slate-600 text-sm">No badges yet. Keep reviewing to earn level-completion badges.</p>
        } @else {
          <ul class="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
            @for (a of achievements(); track a.slug) {
              <li class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-md p-3">
                <span class="text-2xl" aria-hidden="true">🏅</span>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-slate-900">{{ a.name }}</div>
                  @if (a.description) {
                    <div class="text-sm text-slate-600">{{ a.description }}</div>
                  }
                </div>
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
})
export class DashboardPage implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly achievementsSvc = inject(AchievementsService);

  protected readonly data = signal<DashboardView | null>(null);
  protected readonly achievements = signal<Achievement[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected view(): DashboardView {
    return (
      this.data() ?? {
        greeting: 'morning',
        displayName: '',
        currentStreak: 0,
        bestStreak: 0,
        dueNow: 0,
        dueToday: 0,
        level: null,
        levelProgress: { level: 'A1', order: 0, completedLessons: 0, totalLessons: 0, percent: 0 },
        nextLesson: null,
        recentAchievements: [],
        dailyGoal: { target: 20, completed: 0 },
      }
    );
  }

  async ngOnInit(): Promise<void> {
    try {
      const [d, a] = await Promise.all([this.dashboard.get(), this.achievementsSvc.list()]);
      this.data.set(d);
      this.achievements.set(a);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'load_failed');
    } finally {
      this.loading.set(false);
    }
  }

  greetingLabel(g: 'morning' | 'afternoon' | 'evening'): string {
    if (g === 'morning') return 'Good morning';
    if (g === 'afternoon') return 'Good afternoon';
    return 'Good evening';
  }
}
