import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CatalogCategoryGroup,
  CatalogLevelGroup,
  Lesson,
  OwnedLessonsByLevelGroup,
  VocabularyCard,
} from '../models';

@Injectable({ providedIn: 'root' })
export class LessonsService {
  private readonly http = inject(HttpClient);

  list(): Promise<Lesson[]> {
    return firstValueFrom(this.http.get<Lesson[]>(`${environment.apiBaseUrl}/lessons`));
  }

  listGrouped(): Promise<OwnedLessonsByLevelGroup[]> {
    return firstValueFrom(
      this.http.get<OwnedLessonsByLevelGroup[]>(`${environment.apiBaseUrl}/lessons/grouped`),
    );
  }

  get(id: string): Promise<Lesson> {
    return firstValueFrom(this.http.get<Lesson>(`${environment.apiBaseUrl}/lessons/${id}`));
  }

  getCatalogLesson(id: string): Promise<Lesson> {
    return firstValueFrom(
      this.http.get<Lesson>(`${environment.apiBaseUrl}/lessons/catalog/${id}`),
    );
  }

  listCatalog(): Promise<CatalogCategoryGroup[]> {
    return firstValueFrom(
      this.http.get<CatalogCategoryGroup[]>(`${environment.apiBaseUrl}/lessons/catalog`),
    );
  }

  listCatalogByLevel(): Promise<CatalogLevelGroup[]> {
    return firstValueFrom(
      this.http.get<CatalogLevelGroup[]>(`${environment.apiBaseUrl}/lessons/catalog/by-level`),
    );
  }

  enrollInCatalog(sourceLessonId: string): Promise<Lesson> {
    return firstValueFrom(
      this.http.post<Lesson>(
        `${environment.apiBaseUrl}/lessons/catalog/${sourceLessonId}/enroll`,
        {},
      ),
    );
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
      explanationEs?: string;
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
