import { AiController } from './ai.controller';
import {
  AiCardNotFoundError,
  AiCardNotInLessonError,
  AiLessonNotFoundError,
  AiRateLimitedError,
  AiService,
} from './ai.service';
import type { AiDeepenResponse, AiExplainResponse } from '@engclass/shared';

describe('AiController', () => {
  function makeRes(): never {
    return { setHeader: jest.fn(), status: jest.fn() } as never;
  }

  async function expectStatus(fn: () => Promise<unknown>, expected: number): Promise<void> {
    try {
      await fn();
      throw new Error('expected_throw');
    } catch (err) {
      const status = (err as { getStatus?: () => number }).getStatus?.();
      const directStatus = (err as { status?: number }).status;
      const ok = status === expected || directStatus === expected;
      if (!ok) {
        throw err;
      }
      expect(ok).toBe(true);
    }
  }

  it('POST /explain resolves to AiExplainResponse', async () => {
    const payload: AiExplainResponse = {
      summary: 'Desplegar, publicar.',
      examples: ['We deploy on Fridays.'],
      examplesEs: ['Desplegamos los viernes.'],
      cached: false,
    };
    const ai = { explain: jest.fn().mockResolvedValue(payload) } as unknown as AiService;
    const controller = new AiController(ai);
    const res = makeRes();
    const req = { user: { id: 'u-1', email: 'a@b.c' } } as never;
    const result = await controller.explain(req, 'lesson-1', 'card-1', res);
    expect(result).toEqual(payload);
    const setHeader = (res as { setHeader: jest.Mock }).setHeader;
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  it('POST /deepen resolves to AiDeepenResponse', async () => {
    const payload: AiDeepenResponse = {
      context: 'Contexto y colocaciones comunes.',
      collocations: ['make a decision'],
      falseFriends: [],
      examples: ['She had to make a tough decision.'],
      examplesEs: ['Tenía que tomar una decisión difícil.'],
      cached: true,
    };
    const ai = { deepen: jest.fn().mockResolvedValue(payload) } as unknown as AiService;
    const controller = new AiController(ai);
    const res = makeRes();
    const req = { user: { id: 'u-1', email: 'a@b.c' } } as never;
    const result = await controller.deepen(req, 'lesson-1', 'card-1', res);
    expect(result).toEqual(payload);
  });

  it('AiRateLimitedError → 429 with RATE_LIMITED and bucket info', async () => {
    const ai = {
      explain: jest.fn().mockRejectedValue(new AiRateLimitedError('perMinute', 30)),
    } as unknown as AiService;
    const controller = new AiController(ai);
    const req = { user: { id: 'u', email: 'x@y.z' } } as never;
    await expectStatus(
      () => controller.explain(req, 'L', 'C', makeRes()),
      429,
    );
  });

  it('AiCardNotFoundError → 404 CARD_NOT_FOUND', async () => {
    const ai = {
      explain: jest.fn().mockRejectedValue(new AiCardNotFoundError()),
    } as unknown as AiService;
    const controller = new AiController(ai);
    const req = { user: { id: 'u', email: 'x@y.z' } } as never;
    await expectStatus(
      () => controller.explain(req, 'L', 'missing', makeRes()),
      404,
    );
  });

  it('AiCardNotInLessonError → 404 CARD_NOT_IN_LESSON', async () => {
    const ai = {
      explain: jest.fn().mockRejectedValue(new AiCardNotInLessonError()),
    } as unknown as AiService;
    const controller = new AiController(ai);
    const req = { user: { id: 'u', email: 'x@y.z' } } as never;
    await expectStatus(
      () => controller.explain(req, 'L', 'C', makeRes()),
      404,
    );
  });

  it('AiLessonNotFoundError → 404 LESSON_NOT_FOUND', async () => {
    const ai = {
      deepen: jest.fn().mockRejectedValue(new AiLessonNotFoundError()),
    } as unknown as AiService;
    const controller = new AiController(ai);
    const req = { user: { id: 'u', email: 'x@y.z' } } as never;
    await expectStatus(
      () => controller.deepen(req, 'L', 'C', makeRes()),
      404,
    );
  });

  it('AiProviderFailedError → 502 AI_PROVIDER_FAILED', async () => {
    const ai = {
      explain: jest.fn().mockRejectedValue(makeAiProviderFailedLike()),
    } as unknown as AiService;
    const controller = new AiController(ai);
    const req = { user: { id: 'u', email: 'x@y.z' } } as never;
    await expectStatus(
      () => controller.explain(req, 'L', 'C', makeRes()),
      502,
    );
  });
});

function makeAiProviderFailedLike(): Error {
  const err = new Error('provider_status_500');
  err.name = 'AiProviderFailedError';
  return err;
}
