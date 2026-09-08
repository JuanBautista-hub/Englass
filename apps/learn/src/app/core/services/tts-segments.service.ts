import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BilingualSegment } from '../models';

@Injectable({ providedIn: 'root' })
export class TtsSegmentsService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Promise<BilingualSegment[]>>();

  get(cardId: string): Promise<BilingualSegment[]> {
    const existing = this.cache.get(cardId);
    if (existing) {
      return existing;
    }
    const inflight = firstValueFrom(
      this.http.get<BilingualSegment[]>(
        `${environment.apiBaseUrl}/cards/${cardId}/tts-segments`,
      ),
    );
    this.cache.set(cardId, inflight);
    return inflight;
  }

  clear(): void {
    this.cache.clear();
  }
}