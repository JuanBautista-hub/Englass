import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Mastery } from '../models';

export interface DueCard {
  progressId: string;
  cardId: string;
  lessonId: string;
  lessonTitle: string;
  term: string;
  definition: string;
  example: string | null;
  translation: string | null;
  explanationEs: string | null;
  ordinal: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt: string | null;
  mastery: Mastery;
  lastRatings: Array<{ rating: string; reviewedAt: string }>;
}

export interface ReviewStats {
  dueNow: number;
  dueToday: number;
  learned: number;
  total: number;
  averageEase: number;
  lapses: number;
}

export interface CardProgress {
  cardId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt: string | null;
  mastery: Mastery;
}

export interface ReviewResult {
  progress: CardProgress;
  newlyAwarded: string[];
  userBefore: { currentStreak: number; bestStreak: number };
  userAfter: { currentStreak: number; bestStreak: number };
}

export type Rating = 'again' | 'hard' | 'good' | 'easy';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  stats(): Promise<ReviewStats> {
    return firstValueFrom(this.http.get<ReviewStats>(`${environment.apiBaseUrl}/review/stats`));
  }

  dueForLesson(lessonId: string): Promise<DueCard[]> {
    return firstValueFrom(
      this.http.get<DueCard[]>(
        `${environment.apiBaseUrl}/review/lessons/${lessonId}/due`,
      ),
    );
  }

  allDue(limit = 50): Promise<DueCard[]> {
    return firstValueFrom(
      this.http.get<DueCard[]>(`${environment.apiBaseUrl}/review/due?limit=${limit}`),
    );
  }

  review(cardId: string, rating: Rating): Promise<ReviewResult> {
    return firstValueFrom(
      this.http.post<ReviewResult>(
        `${environment.apiBaseUrl}/review/cards/${cardId}`,
        { rating },
      ),
    );
  }
}
