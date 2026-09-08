import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { CatalogDeprecationService } from './catalog-deprecation.service';
import type { EnrollResult, LessonView } from '@engclass/shared';

describe('LessonsController', () => {
  let controller: LessonsController;
  let deprecation: CatalogDeprecationService;
  let findOneAsCatalogSpy: jest.Mock;
  let enrollInCatalogSpy: jest.Mock;

  const sampleLesson: LessonView = {
    id: 'lesson-1',
    title: 'T',
    description: null,
    level: 'A1',
    categoryId: 'cat-1',
    ownerId: 'seed-system-user',
    sourceLessonId: null,
    cards: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    isCatalog: true,
    isOwned: false,
    canEdit: false,
    canEnroll: true,
    alreadyEnrolled: false,
  };

  beforeEach(() => {
    findOneAsCatalogSpy = jest.fn().mockResolvedValue(sampleLesson);
    enrollInCatalogSpy = jest.fn();

    deprecation = new CatalogDeprecationService({
      lessonsViewFlagsEnabled: true,
      lessonsCatalogDeprecationSunsetDays: 30,
      aiEnabled: false,
      aiBaseUrl: '',
      aiApiKey: '',
      aiModel: 'MiniMax-M3',
      aiTtsModel: 'gemini-2.5-flash-preview-tts',
      aiCacheTtlMs: 1000,
      aiRatePerMinute: 5,
      aiRatePerDay: 60,
    });

    controller = new LessonsController(
      { findOneAsCatalog: findOneAsCatalogSpy } as unknown as LessonsService,
      deprecation,
    );
  });

  describe('GET /lessons/catalog/:id', () => {
    it('returns the lesson from the service', async () => {
      const res = { setHeader: jest.fn(), status: jest.fn() } as never;
      const req = { user: { id: 'u', email: 'a@b.c' } } as never;
      const result = await controller.catalogLesson(req, 'lesson-1', res);
      expect(result).toEqual(sampleLesson);
      expect(findOneAsCatalogSpy).toHaveBeenCalledWith('lesson-1', 'u');
    });

    it('sets Sunset + Link headers and increments hit counter', async () => {
      const setHeader = jest.fn();
      const res = { setHeader, status: jest.fn() } as never;
      const req = { user: { id: 'u', email: 'a@b.c' } } as never;
      await controller.catalogLesson(req, 'lesson-1', res);
      expect(deprecation.hitsSinceStart()).toBe(1);
      const sunsetCall = setHeader.mock.calls.find((c) => c[0] === 'Sunset');
      const linkCall = setHeader.mock.calls.find((c) => c[0] === 'Link');
      expect(sunsetCall).toBeDefined();
      expect((linkCall?.[1] as string) ?? '').toContain('/api/v1/lessons/lesson-1');
    });
  });

  describe('POST /lessons/catalog/:id/enroll', () => {
    it('returns 201 when created=true', async () => {
      const result: EnrollResult = {
        lesson: { ...sampleLesson, isOwned: true, canEdit: true, canEnroll: false, isCatalog: true, alreadyEnrolled: false },
        created: true,
        clonedFromId: 'lesson-1',
      };
      enrollInCatalogSpy.mockResolvedValue(result);
      controller = new LessonsController(
        { findOneAsCatalog: findOneAsCatalogSpy, enrollInCatalog: enrollInCatalogSpy } as unknown as LessonsService,
        deprecation,
      );
      const status = jest.fn();
      const res = { status } as never;
      const req = { user: { id: 'u', email: 'a@b.c' } } as never;
      const body = await controller.enroll(req, 'lesson-1', res);
      expect(body.created).toBe(true);
      expect(status).toHaveBeenCalledWith(201);
    });

    it('returns 200 when created=false (idempotent re-enroll)', async () => {
      const result: EnrollResult = {
        lesson: { ...sampleLesson, isOwned: true, canEdit: true, canEnroll: false, isCatalog: true, alreadyEnrolled: true },
        created: false,
        clonedFromId: 'lesson-1',
      };
      enrollInCatalogSpy.mockResolvedValue(result);
      controller = new LessonsController(
        { findOneAsCatalog: findOneAsCatalogSpy, enrollInCatalog: enrollInCatalogSpy } as unknown as LessonsService,
        deprecation,
      );
      const status = jest.fn();
      const res = { status } as never;
      const req = { user: { id: 'u', email: 'a@b.c' } } as never;
      const body = await controller.enroll(req, 'lesson-1', res);
      expect(body.created).toBe(false);
      expect(status).not.toHaveBeenCalledWith(201);
    });
  });
});
