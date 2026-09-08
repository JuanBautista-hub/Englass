import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Mastery, MasteryLabelView } from '../models';

const FALLBACK_LABELS: Readonly<Record<Mastery, MasteryLabelView>> = {
  learning: { label: 'Learning', badgeClass: 'bg-slate-100 text-slate-700' },
  reviewing: { label: 'Reviewing', badgeClass: 'bg-amber-100 text-amber-800' },
  mastered: { label: 'Mastered', badgeClass: 'bg-emerald-100 text-emerald-800' },
};

@Injectable({ providedIn: 'root' })
export class MasteryLabelsService {
  private readonly http = inject(HttpClient);
  private readonly labels = signal<Readonly<Record<Mastery, MasteryLabelView>>>(FALLBACK_LABELS);
  private fetched = false;
  private inflight: Promise<void> | null = null;

  get(): Readonly<Record<Mastery, MasteryLabelView>> {
    if (!this.fetched) {
      void this.refresh();
    }
    return this.labels();
  }

  async refresh(): Promise<void> {
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = firstValueFrom(
      this.http.get<Record<Mastery, MasteryLabelView>>(
        `${environment.apiBaseUrl}/mastery/labels`,
      ),
    )
      .then((rows) => {
        this.labels.set(rows);
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

  forKey(m: Mastery | null | undefined): MasteryLabelView | null {
    if (!m) {
      return null;
    }
    return this.get()[m] ?? null;
  }
}