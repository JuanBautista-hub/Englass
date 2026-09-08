import { CatalogDeprecationService } from './catalog-deprecation.service';

describe('CatalogDeprecationService', () => {
  it('computes a Sunset date roughly N days from now', () => {
    const svc = new CatalogDeprecationService({
      lessonsViewFlagsEnabled: true,
      lessonsCatalogDeprecationSunsetDays: 7,
      aiEnabled: false,
      aiBaseUrl: '',
      aiApiKey: '',
      aiModel: 'MiniMax-M3',
      aiTtsModel: 'gemini-2.5-flash-preview-tts',
      aiCacheTtlMs: 1000,
      aiRatePerMinute: 5,
      aiRatePerDay: 60,
    });
    expect(svc.daysUntilSunset()).toBeGreaterThanOrEqual(6);
    expect(svc.daysUntilSunset()).toBeLessThanOrEqual(7);
    expect(svc.sunsetDateHttp()).toMatch(/^[A-Z][a-z]{2}, /);
  });

  it('records deprecation hits', () => {
    const svc = new CatalogDeprecationService({
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
    expect(svc.hitsSinceStart()).toBe(0);
    svc.recordHit();
    svc.recordHit();
    expect(svc.hitsSinceStart()).toBe(2);
  });

  it('returns the canonical successor URL', () => {
    const svc = new CatalogDeprecationService({
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
    expect(svc.successorUrl('abc')).toBe('/api/v1/lessons/abc');
  });
});
