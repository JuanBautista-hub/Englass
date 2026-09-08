import { Injectable } from '@nestjs/common';
import {
  TTS_PROVIDER_TIMEOUT_MS,
  TtsProviderFailedError,
  type TtsProvider,
  type TtsSynthesizeOptions,
} from './tts-provider.interface';

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WSS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const TRUST_TOKEN_URL = 'https://api-edge.skype.com/trusttoken/v1/issue';

@Injectable()
export class EdgeTtsProvider implements TtsProvider {
  async synthesize(options: TtsSynthesizeOptions): Promise<Buffer> {
    const requestId = uuid();
    const timestamp = formatTimestamp();
    const ssml = buildSsml(options.text, options.voice, options.lang);
    const configPayload = buildConfig();

    let trustToken: string;
    try {
      trustToken = await this.fetchTrustToken();
    } catch (err) {
      if (err instanceof TtsProviderFailedError) {
        throw err;
      }
      throw new TtsProviderFailedError('edge_tts_token_failed', err);
    }

    const url = `${WSS_BASE}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
      `&Sec-MS-GEC=${encodeURIComponent(trustToken)}` +
      `&Sec-MS-GECVersion=1-130.0.2849.68` +
      `&ConnectionId=${uuid()}`;

    return this.streamSynthesis(url, requestId, timestamp, ssml, configPayload);
  }

  private async fetchTrustToken(): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch(TRUST_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new TtsProviderFailedError(`edge_tts_token_status_${res.status}`);
      }
      const data = (await res.json()) as { token?: string };
      if (typeof data.token !== 'string' || data.token.length === 0) {
        throw new TtsProviderFailedError('edge_tts_no_token');
      }
      return data.token;
    } catch (err) {
      if (err instanceof TtsProviderFailedError) {
        throw err;
      }
      if ((err as { name?: string })?.name === 'AbortError') {
        throw new TtsProviderFailedError('edge_tts_token_timeout');
      }
      throw new TtsProviderFailedError('edge_tts_token_network', err);
    } finally {
      clearTimeout(timeout);
    }
  }

  private streamSynthesis(
    url: string,
    requestId: string,
    timestamp: string,
    ssml: string,
    configPayload: string,
  ): Promise<Buffer> {
    const ws = new WebSocket(url);
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { ws.close(); } catch { /* ignore */ }
        reject(new TtsProviderFailedError('edge_tts_timeout'));
      }, TTS_PROVIDER_TIMEOUT_MS);

      const finishResolve = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try { ws.close(); } catch { /* ignore */ }
        resolve(Buffer.concat(chunks));
      };

      const finishReject = (err: TtsProviderFailedError): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try { ws.close(); } catch { /* ignore */ }
        reject(err);
      };

      ws.binaryType = 'arraybuffer';

      ws.onopen = (): void => {
        try {
          ws.send(
            `X-Timestamp:${timestamp}\r\n` +
              `Content-Type:application/json; charset=utf-8\r\n` +
              `Path:speech.config\r\n\r\n` +
              configPayload,
          );
          ws.send(
            `X-RequestId:${requestId}\r\n` +
              `Content-Type:application/ssml+xml\r\n` +
              `X-Timestamp:${timestamp}\r\n` +
              `Path:ssml\r\n\r\n` +
              ssml,
          );
        } catch (err) {
          finishReject(new TtsProviderFailedError('edge_tts_send_failed', err));
        }
      };

      ws.onmessage = (event: MessageEvent): void => {
        if (typeof event.data === 'string') {
          if (event.data.includes('Path:turn.end')) {
            finishResolve();
          }
          return;
        }
        if (event.data instanceof ArrayBuffer) {
          const buf = Buffer.from(event.data);
          const headerEnd = buf.indexOf('\r\n\r\n');
          if (headerEnd >= 0) {
            chunks.push(buf.subarray(headerEnd + 4));
          } else {
            chunks.push(buf);
          }
        }
      };

      ws.onerror = (): void => {
        finishReject(new TtsProviderFailedError('edge_tts_network'));
      };

      ws.onclose = (event: CloseEvent): void => {
        if (chunks.length > 0) {
          finishResolve();
          return;
        }
        if (!settled) {
          finishReject(new TtsProviderFailedError(`edge_tts_closed_${event.code}`));
        }
      };
    });
  }
}

function buildSsml(text: string, voice: string, lang: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ` +
    `xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="${lang}">` +
    `<voice name="${voice}"><prosody pitch="0%" rate="0%" volume="0%">` +
    `${escaped}</prosody></voice></speak>`
  );
}

function buildConfig(): string {
  return JSON.stringify({
    context: {
      system: {
        name: 'Microsoft Speech Service',
        version: '1.0.00000',
        build: 'Edge',
        lang: 'en-US',
        os: 'Win32',
      },
      os: { platform: 'Windows', name: 'Edge', version: '130.0.2849.68' },
      audio: {
        metadataOptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      },
    },
  });
}

function formatTimestamp(): string {
  const d = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const day = days[d.getUTCDay()];
  const date = String(d.getUTCDate()).padStart(2, '0');
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');
  const secs = String(d.getUTCSeconds()).padStart(2, '0');
  return `${day} ${date} ${month} ${year} ${hours}:${mins}:${secs} GMT+0000 (UTC)`;
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
