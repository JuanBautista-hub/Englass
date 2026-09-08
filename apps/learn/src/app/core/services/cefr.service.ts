import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CefrLevelView } from '../models';

const FALLBACK_LEVELS: readonly CefrLevelView[] = [
  { code: 'A1', order: 0, label: 'Beginner', description: 'Basic phrases and vocabulary.' },
  { code: 'A2', order: 1, label: 'Elementary', description: 'Everyday expressions and simple interactions.' },
  { code: 'B1', order: 2, label: 'Intermediate', description: 'Conversational fluency on familiar topics.' },
  { code: 'B2', order: 3, label: 'Upper Intermediate', description: 'Complex topics and fluent argumentation.' },
  { code: 'C1', order: 4, label: 'Advanced', description: 'Expressive, flexible use of the language.' },
  { code: 'C2', order: 5, label: 'Proficiency', description: 'Near-native command of the language.' },
];

@Injectable({ providedIn: 'root' })
export class CefrService {
  private readonly http = inject(HttpClient);
  private readonly levels = signal<readonly CefrLevelView[]>(FALLBACK_LEVELS);
  private fetched = false;
  private inflight: Promise<void> | null = null;

  get(): readonly CefrLevelView[] {
    if (!this.fetched) {
      void this.refresh();
    }
    return this.levels();
  }

  async refresh(): Promise<void> {
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = firstValueFrom(
      this.http.get<CefrLevelView[]>(`${environment.apiBaseUrl}/cefr/levels`),
    )
      .then((rows) => {
        this.levels.set(rows);
        this.fetched = true;
      })
      .catch(() => {
        // keep fallback
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  labelFor(code: string): string {
    return this.levels().find((l) => l.code === code)?.label ?? code;
  }
}