import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { AiTransport } from './ai.service';

@Injectable({ providedIn: 'root' })
export class HttpClientAiTransport implements AiTransport {
  constructor(private readonly http: HttpClient) {}

  async post<T>(url: string, body: Record<string, never>): Promise<T> {
    try {
      return await firstValueFrom(this.http.post<T>(url, body));
    } catch (err) {
      throw normalizeHttpError(err);
    }
  }

  async postBlob(url: string, body: Record<string, unknown>): Promise<Blob> {
    try {
      let params = new HttpParams();
      for (const [k, v] of Object.entries(body)) {
        if (typeof v === 'string') {
          params = params.set(k, v);
        }
      }
      return await firstValueFrom(
        this.http.post(url, body, { params, responseType: 'blob' }),
      );
    } catch (err) {
      throw normalizeHttpError(err);
    }
  }

  async get<T>(url: string): Promise<T> {
    try {
      return await firstValueFrom(this.http.get<T>(url));
    } catch (err) {
      throw normalizeHttpError(err);
    }
  }

  async delete(url: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<void>(url));
    } catch (err) {
      throw normalizeHttpError(err);
    }
  }
}

function normalizeHttpError(err: unknown): unknown {
  if (err instanceof HttpErrorResponse) {
    return {
      status: err.status,
      error: err.error,
      headers: { get: (k: string) => err.headers.get(k) },
    };
  }
  return err;
}
