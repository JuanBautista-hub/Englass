import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardView } from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  get(): Promise<DashboardView> {
    return firstValueFrom(
      this.http.get<DashboardView>(`${environment.apiBaseUrl}/dashboard`),
    );
  }
}
