import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LearningPathLevel } from '../models';

@Injectable({ providedIn: 'root' })
export class LearningPathService {
  private readonly http = inject(HttpClient);

  get(): Promise<LearningPathLevel[]> {
    return firstValueFrom(
      this.http.get<LearningPathLevel[]>(`${environment.apiBaseUrl}/learning-path`),
    );
  }
}
