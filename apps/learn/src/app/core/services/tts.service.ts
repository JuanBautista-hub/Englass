import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface SynthesisResult {
  url: string;
  voice: string;
  durationMs: number;
  provider: string;
}

@Injectable({ providedIn: 'root' })
export class TtsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  async synthesize(text: string): Promise<SynthesisResult> {
    const token = this.auth.getToken();
    const res = await fetch(`${environment.apiBaseUrl}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      throw new Error(`tts_failed_${res.status}`);
    }
    const voice = res.headers.get('X-TTS-Voice') ?? 'unknown';
    const durationMs = Number(res.headers.get('X-TTS-Duration-Ms') ?? '0');
    const provider = res.headers.get('X-TTS-Provider') ?? 'unknown';
    const blob = await res.blob();
    return {
      url: URL.createObjectURL(blob),
      voice,
      durationMs,
      provider,
    };
  }

  release(url: string): void {
    URL.revokeObjectURL(url);
  }

  ping(): Promise<string> {
    return firstValueFrom(this.http.get<string>(`${environment.apiBaseUrl.replace(/\/api\/v1$/, '')}/api/v1/health`));
  }
}
