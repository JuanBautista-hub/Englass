import { AiProviderFailedError } from './ai-provider.interface';
import { MiniMaxProvider } from './minimax.provider';

describe('MiniMaxProvider', () => {
  const baseConfig = {
    lessonsViewFlagsEnabled: true,
    lessonsCatalogDeprecationSunsetDays: 30,
    aiEnabled: true,
    aiBaseUrl: 'https://api.MiniMax.dev/v1',
    aiApiKey: 'sk-test',
    aiModel: 'MiniMax-M3',
      aiTtsModel: 'gemini-2.5-flash-preview-tts',
      aiCacheTtlMs: 1000,
    aiRatePerMinute: 5,
    aiRatePerDay: 60,
  };

  function makeProvider(fetchMock: jest.Mock): MiniMaxProvider {
    Object.assign(global, { fetch: fetchMock });
    return new MiniMaxProvider(baseConfig);
  }

  it('sends POST {baseUrl}/chat/completions with Authorization + correct body shape', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"summary":"Desplegar.","examples":["x"],"examplesEs":["y"]}' } }], usage: { total_tokens: 42 } }),
    });
    const provider = makeProvider(fetchMock);
    const result = await provider.complete({
      system: 'sys',
      user: '{"term":"deploy","level":"A2","mode":"explain"}',
      mode: 'explain',
      maxTokens: 256,
      temperature: 0.4,
    });
    expect(result.text).toBe('{"summary":"Desplegar.","examples":["x"],"examplesEs":["y"]}');
    expect(result.tokensUsed).toBe(42);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.MiniMax.dev/v1/chat/completions');
    const headers = (init as { headers: Record<string, string> }).headers;
    expect(headers.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse((init as { body: string }).body);
    expect(body.model).toBe('MiniMax-M3');
    expect(body.temperature).toBe(0.4);
    expect(body.max_tokens).toBe(256);
    expect(body.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: '{"term":"deploy","level":"A2","mode":"explain"}' },
    ]);
  });

  it('forwards max_tokens from options (explain vs deepen)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{}' } }], usage: { total_tokens: 1 } }),
    });
    const provider = makeProvider(fetchMock);
    await provider.complete({ system: 's', user: 'u', mode: 'explain', maxTokens: 1200, temperature: 0.4 });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).max_tokens).toBe(1200);
    await provider.complete({ system: 's', user: 'u', mode: 'deepen', maxTokens: 1600, temperature: 0.4 });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).max_tokens).toBe(1600);
  });

  it('throws AiProviderFailedError on 5xx', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 503, ok: false, json: async () => ({}) });
    const provider = makeProvider(fetchMock);
    await expect(
      provider.complete({ system: 's', user: 'u', mode: 'explain', maxTokens: 256, temperature: 0.4 }),
    ).rejects.toBeInstanceOf(AiProviderFailedError);
  });

  it('throws AiProviderFailedError on malformed JSON (no choices)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({}),
    });
    const provider = makeProvider(fetchMock);
    await expect(
      provider.complete({ system: 's', user: 'u', mode: 'explain', maxTokens: 256, temperature: 0.4 }),
    ).rejects.toBeInstanceOf(AiProviderFailedError);
  });

  it('throws AiProviderFailedError on empty content', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    });
    const provider = makeProvider(fetchMock);
    await expect(
      provider.complete({ system: 's', user: 'u', mode: 'explain', maxTokens: 256, temperature: 0.4 }),
    ).rejects.toBeInstanceOf(AiProviderFailedError);
  });

  it('throws AiProviderFailedError on network error', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
    const provider = makeProvider(fetchMock);
    await expect(
      provider.complete({ system: 's', user: 'u', mode: 'explain', maxTokens: 256, temperature: 0.4 }),
    ).rejects.toBeInstanceOf(AiProviderFailedError);
  });
});
