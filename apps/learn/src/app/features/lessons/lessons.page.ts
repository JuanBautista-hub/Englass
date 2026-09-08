import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReviewService } from '../../core/services/review.service';
import { LearningPathComponent } from './learning-path.component';

@Component({
  selector: 'app-lessons',
  standalone: true,
  imports: [RouterLink, LearningPathComponent],
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
  `,
})
export class LessonsPage implements OnInit {
  private readonly review = inject(ReviewService);
  private readonly router = inject(Router);

  protected readonly stats = signal<{ dueNow: number; dueToday: number; learned: number; averageEase: number } | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadStats();
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

  private async loadStats(): Promise<void> {
    try {
      this.stats.set(await this.review.stats());
    } catch {
      // ignore: stats are decorative
    }
  }
}