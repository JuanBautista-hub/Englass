import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Lesson } from '../models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class LessonsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  list(): Promise<Lesson[]> {
    return firstValueFrom(this.http.get<Lesson[]>(this.url('')));
  }

  get(id: string): Promise<Lesson> {
    return firstValueFrom(this.http.get<Lesson>(this.url(`/${id}`)));
  }

  create(input: { title: string; prompt: string; translation?: string; level?: string }): Promise<Lesson> {
    return firstValueFrom(this.http.post<Lesson>(this.url(''), input));
  }

  update(id: string, input: Partial<Lesson>): Promise<Lesson> {
    return firstValueFrom(this.http.patch<Lesson>(this.url(`/${id}`), input));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/${id}`));
  }

  private url(path: string): string {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken() ?? ''}` });
    return `${environment.apiBaseUrl}/lessons${path}`;
  }
}
