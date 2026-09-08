import { AiService, AiCardNotFoundError, AiCardNotInLessonError, AiLessonNotFoundError, AiRateLimitedError, AiDisabledError } from './ai.service';
import { AiCacheStore, aiCacheKey } from './ai-cache.store';
import { AiAudioCacheStore } from './ai-audio-cache.store';
import { AiRateLimitStore } from './ai-rate-limit.store';
import type { AiProvider } from './ai-provider.interface';
import type { TtsProvider } from './tts-provider.interface';
import type { AppConfig } from '../common/config';

describe('AiService (cache + rate-limit + provider orchestration)', () => {
  const config = {
    lessonsViewFlagsEnabled: true,
    lessonsCatalogDeprecationSunsetDays: 30,
    aiEnabled: true,
    aiBaseUrl: 'https://api.MiniMax.dev/v1',
    aiApiKey: 'sk-test',
    aiModel: 'MiniMax-M3',
    aiTtsModel: 'gemini-2.5-flash-preview-tts',
    aiCacheTtlMs: 24 * 60 * 60 * 1000,
    aiRatePerMinute: 5,
    aiRatePerDay: 60,
  };

  function makeService(opts?: { aiEnabled?: boolean }) {
    const prisma = {
      vocabularyCard: {
        findUnique: jest.fn().mockResolvedValue({
          term: 'deploy',
          level: 'A2',
          lesson: { id: 'lesson-1', ownerId: 'user-1', sourceLessonId: null },
        }),
      },
      lesson: { findFirst: jest.fn().mockResolvedValue({ id: 'clone-1' }) },
    };
    const provider: AiProvider = {
      complete: jest.fn().mockResolvedValue({
        text: '{"summary":"Significa desplegar.","examples":["x","y","z"],"examplesEs":["a","b","c"]}',
        tokensUsed: 7,
      }),
    };
    const ttsProvider: TtsProvider = {
      synthesize: jest.fn().mockResolvedValue(Buffer.from('RIFF')),
    };
    const cache = new AiCacheStore();
    const audioCache = new AiAudioCacheStore({ ...config });
    const rateLimit = new AiRateLimitStore({ ...config });
    const service = new AiService(
      prisma as never,
      { ...config, aiEnabled: opts?.aiEnabled ?? true },
      provider,
      ttsProvider,
      cache,
      audioCache,
      rateLimit,
    );
    return { service, prisma, provider, cache, audioCache, rateLimit };
  }

  it('cache hit returns cached:true and does not call provider', async () => {
    const { service, cache, provider } = makeService();
    const key = aiCacheKey({ lessonId: 'lesson-1', cardId: 'card-1', mode: 'explain', level: 'A2' });
    cache.set(
      key,
      { summary: 'cached summary', examples: ['cached-1', 'cached-2'], examplesEs: ['es-1', 'es-2'] },
      60_000,
    );
    const out = await service.explain('user-1', 'lesson-1', 'card-1');
    expect(out.cached).toBe(true);
    expect(out.summary).toBe('cached summary');
    expect(out.examples).toEqual(['cached-1', 'cached-2']);
    expect(out.examplesEs).toEqual(['es-1', 'es-2']);
    expect((provider.complete as jest.Mock).mock.calls.length).toBe(0);
  });

  it('cache miss invokes provider and stores the parsed value', async () => {
    const { service, cache, provider } = makeService();
    const out = await service.explain('user-1', 'lesson-1', 'card-1');
    expect(out.cached).toBe(false);
    expect(out.summary).toBe('Significa desplegar.');
    expect(out.examples).toEqual(['x', 'y', 'z']);
    expect(out.examplesEs).toEqual(['a', 'b', 'c']);
    expect((provider.complete as jest.Mock).mock.calls.length).toBe(1);
    const key = aiCacheKey({ lessonId: 'lesson-1', cardId: 'card-1', mode: 'explain', level: 'A2' });
    expect(cache.get(key)).toEqual({
      summary: 'Significa desplegar.',
      examples: ['x', 'y', 'z'],
      examplesEs: ['a', 'b', 'c'],
    });
  });

  it('AiRateLimitedError is thrown when the bucket is full (provider not called)', async () => {
    const { service, rateLimit, provider } = makeService();
    const now = Date.now();
    for (let i = 0; i < config.aiRatePerMinute; i++) {
      rateLimit.consume('user-1', 'explain', now + i);
    }
    await expect(service.explain('user-1', 'lesson-1', 'card-1')).rejects.toBeInstanceOf(AiRateLimitedError);
    expect((provider.complete as jest.Mock).mock.calls.length).toBe(0);
  });

  it('propagates errors from the provider', async () => {
    const { service, provider } = makeService();
    const err = new Error('provider_status_500');
    Object.defineProperty(err, 'name', { value: 'AiProviderFailedError' });
    (provider.complete as jest.Mock).mockRejectedValueOnce(err);
    await expect(service.explain('user-1', 'lesson-1', 'card-1')).rejects.toBe(err);
  });

  it('AiDisabledError is thrown when aiEnabled is false', async () => {
    const { service } = makeService({ aiEnabled: false });
    await expect(service.explain('user-1', 'lesson-1', 'card-1')).rejects.toBeInstanceOf(AiDisabledError);
  });

  it('AiCardNotFoundError when card does not exist', async () => {
    const { service, prisma } = makeService();
    (prisma.vocabularyCard.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.explain('user-1', 'lesson-1', 'card-1')).rejects.toBeInstanceOf(AiCardNotFoundError);
  });

  it('AiCardNotInLessonError when lessonId does not match', async () => {
    const { service, prisma } = makeService();
    (prisma.vocabularyCard.findUnique as jest.Mock).mockResolvedValueOnce({
      term: 'deploy',
      level: 'A2',
      lesson: { id: 'other-lesson', ownerId: 'user-1', sourceLessonId: null },
    });
    await expect(service.explain('user-1', 'lesson-1', 'card-1')).rejects.toBeInstanceOf(AiCardNotInLessonError);
  });

  it('AiLessonNotFoundError when foreign (non-catalog) lesson', async () => {
    const { service, prisma } = makeService();
    (prisma.vocabularyCard.findUnique as jest.Mock).mockResolvedValueOnce({
      term: 'deploy',
      level: 'A2',
      lesson: { id: 'lesson-1', ownerId: 'someone-else', sourceLessonId: null },
    });
    (prisma.lesson.findFirst as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.explain('user-1', 'lesson-1', 'card-1')).rejects.toBeInstanceOf(AiLessonNotFoundError);
  });

  it('cache stores deepen payload when provider returns valid JSON', async () => {
    const { service, cache, provider } = makeService();
    (provider.complete as jest.Mock).mockResolvedValueOnce({
      text: '{"context":"Contexto en español.","collocations":["make a decision"],"falseFriends":[],"examples":["She had to make a tough decision."],"examplesEs":["Tenía que tomar una decisión difícil."]}',
      tokensUsed: 5,
    });
    await service.deepen('user-1', 'lesson-1', 'card-1');
    expect((provider.complete as jest.Mock).mock.calls.length).toBe(1);
    const key = aiCacheKey({ lessonId: 'lesson-1', cardId: 'card-1', mode: 'deepen', level: 'A2' });
    expect(cache.get(key)).toMatchObject({
      context: 'Contexto en español.',
      collocations: ['make a decision'],
      examples: ['She had to make a tough decision.'],
      examplesEs: ['Tenía que tomar una decisión difícil.'],
    });
  });

  it('strips prose before the JSON when the model adds commentary', async () => {
    const { service, provider } = makeService();
    (provider.complete as jest.Mock).mockResolvedValueOnce({
      text:
        'Sure! Here is the explanation you requested.\n\n' +
        '{"summary":"Significa desplegar.","examples":["x","y","z"],"examplesEs":["a","b","c"]}',
      tokensUsed: 7,
    });
    const out = await service.explain('user-1', 'lesson-1', 'card-1');
    expect(out.summary).toBe('Significa desplegar.');
    expect(out.examples).toEqual(['x', 'y', 'z']);
    expect(out.examplesEs).toEqual(['a', 'b', 'c']);
  });

  it('strips markdown code fences around the JSON', async () => {
    const { service, provider } = makeService();
    (provider.complete as jest.Mock).mockResolvedValueOnce({
      text:
        '```json\n{"summary":"Desplegar.","examples":["x"],"examplesEs":["y"]}\n```',
      tokensUsed: 5,
    });
    const out = await service.explain('user-1', 'lesson-1', 'card-1');
    expect(out.summary).toBe('Desplegar.');
    expect(out.examples).toEqual(['x']);
  });

  it('strips <reasoning> chain-of-thought blocks before parsing', async () => {
    const { service, provider } = makeService();
    (provider.complete as jest.Mock).mockResolvedValueOnce({
      text:
        '<reasoning>The user wants explain mode with Spanish summary and English examples.</reasoning>' +
        '{"summary":"Resumen.","examples":["x","y","z"],"examplesEs":["a","b","c"]}',
      tokensUsed: 8,
    });
    const out = await service.explain('user-1', 'lesson-1', 'card-1');
    expect(out.summary).toBe('Resumen.');
    expect(out.examples).toEqual(['x', 'y', 'z']);
  });

  it('extracts balanced JSON when nested braces are present', async () => {
    const { service, provider } = makeService();
    (provider.complete as jest.Mock).mockResolvedValueOnce({
      text:
        'note: see {\"junk\":1} then {"summary":"OK","examples":["a","b","c"],"examplesEs":["d","e","f"]} bye',
      tokensUsed: 9,
    });
    const out = await service.explain('user-1', 'lesson-1', 'card-1');
    expect(out.summary).toBe('OK');
    expect(out.examples).toEqual(['a', 'b', 'c']);
  });

  it('repairs trailing commas when the model emits invalid JSON', async () => {
    const { service, provider } = makeService();
    (provider.complete as jest.Mock).mockResolvedValueOnce({
      text:
        '{"summary":"Resumen.","examples":["x","y","z"],,"examplesEs":["a","b","c"],}',
      tokensUsed: 7,
    });
    const out = await service.explain('user-1', 'lesson-1', 'card-1');
    expect(out.summary).toBe('Resumen.');
    expect(out.examples).toEqual(['x', 'y', 'z']);
  });

  it('throws AiInvalidPayloadError when the response contains no JSON at all', async () => {
    const { service, provider } = makeService();
    (provider.complete as jest.Mock).mockResolvedValueOnce({
      text: 'Lo siento, no puedo generar una respuesta en este momento.',
      tokensUsed: 3,
    });
    await expect(service.explain('user-1', 'lesson-1', 'card-1')).rejects.toThrow('invalid_explain_payload');
  });

  it('extracts JSON after a long <think> block that ended just before max_tokens', async () => {
    const { service, provider } = makeService();
    const reasoning =
      '<think>The user wants me to explain the English grammar concept "regular +ed" ' +
      'for a Spanish-speaking learner at A2 level. I need to create a JSON object with ' +
      'summary, examples, and examplesEs. Let me think through each example carefully ' +
      'before producing the JSON output. I have to make sure the JSON is well-formed. ' +
      'Now I will draft it below. Let me reconsider word choices and finalize the structure. ' +
      'Almost done, let me write the response now. ' +
      'Actually let me reconsider one more example to make sure it is correct. ' +
      'Now writing. ';
    (provider.complete as jest.Mock).mockResolvedValueOnce({
      text:
        reasoning +
        '{"summary":"Se forma añadiendo -ed al verbo para hablar del pasado.","examples":["I played football yesterday.","She walked to school.","They talked for hours."],"examplesEs":["Jugué al fútbol ayer.","Ella caminó al colegio.","Hablaron durante horas."]}',
      tokensUsed: 1100,
    });
    const out = await service.explain('user-1', 'lesson-1', 'card-1');
    expect(out.summary).toBe('Se forma añadiendo -ed al verbo para hablar del pasado.');
    expect(out.examples).toEqual([
      'I played football yesterday.',
      'She walked to school.',
      'They talked for hours.',
    ]);
  });

  it('recovers a JSON object truncated mid-string by appending a closing quote and brace', async () => {
    const { service, provider } = makeService();
    (provider.complete as jest.Mock).mockResolvedValueOnce({
      text:
        '{"summary":"Verbo regular en pasado","examples":["I playe',
      tokensUsed: 50,
    });
    const out = await service.explain('user-1', 'lesson-1', 'card-1');
    expect(out.summary).toBe('Verbo regular en pasado');
    expect(out.examples.length).toBeGreaterThan(0);
  });

  it('keeps only the JSON that follows the LAST closing think tag', async () => {
    const { service, provider } = makeService();
    (provider.complete as jest.Mock).mockResolvedValueOnce({
      text:
        '<think>first draft: {"summary":"wrong","examples":[]}</think>' +
        '<think>reconsidering: {"summary":"also wrong","examples":[]}</think>' +
        '{"summary":"correcto","examples":["a","b","c"],"examplesEs":["x","y","z"]}',
      tokensUsed: 12,
    });
    const out = await service.explain('user-1', 'lesson-1', 'card-1');
    expect(out.summary).toBe('correcto');
  });

  it('strips unclosed trailing <think> tag and parses the JSON before it', async () => {
    const { service, provider } = makeService();
    (provider.complete as jest.Mock).mockResolvedValueOnce({
      text:
        '{"summary":"primero","examples":["a","b","c"],"examplesEs":["x","y","z"]}' +
        '<think>wait, let me reword the examples a bit and...',
      tokensUsed: 10,
    });
    const out = await service.explain('user-1', 'lesson-1', 'card-1');
    expect(out.summary).toBe('primero');
    expect(out.examples).toEqual(['a', 'b', 'c']);
  });
});
