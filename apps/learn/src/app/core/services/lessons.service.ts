import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Lesson, VocabularyCard } from '../models';

@Injectable({ providedIn: 'root' })
export class LessonsService {
  private readonly http = inject(HttpClient);

  list(): Promise<Lesson[]> {
    return firstValueFrom(this.http.get<Lesson[]>(`${environment.apiBaseUrl}/lessons`));
  }

  get(id: string): Promise<Lesson> {
    return firstValueFrom(this.http.get<Lesson>(`${environment.apiBaseUrl}/lessons/${id}`));
  }

  create(input: {
    title: string;
    description?: string;
    level?: string;
    categoryId: string;
  }): Promise<Lesson> {
    return firstValueFrom(this.http.post<Lesson>(`${environment.apiBaseUrl}/lessons`, input));
  }

  addCard(
    lessonId: string,
    input: {
      term: string;
      definition: string;
      example?: string;
      translation?: string;
      level?: string;
    },
  ): Promise<VocabularyCard> {
    return firstValueFrom(
      this.http.post<VocabularyCard>(
        `${environment.apiBaseUrl}/lessons/${lessonId}/cards`,
        input,
      ),
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/lessons/${id}`);
  }
}
