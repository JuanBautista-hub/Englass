import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardAchievement } from '../models';

export type Achievement = DashboardAchievement;

@Injectable({ providedIn: 'root' })
export class AchievementsService {
  private readonly http = inject(HttpClient);

  list(): Promise<Achievement[]> {
    return firstValueFrom(
      this.http.get<Achievement[]>(`${environment.apiBaseUrl}/achievements`),
    );
  }
}
