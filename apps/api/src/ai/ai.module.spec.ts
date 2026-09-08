import { Test } from '@nestjs/testing';
import { AiModule } from './ai.module';
import { AiCacheStore } from './ai-cache.store';
import { AiRateLimitStore } from './ai-rate-limit.store';
import { MiniMaxProvider } from './minimax.provider';
import { APP_CONFIG } from '../common/config';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

const baseConfig = {
  lessonsViewFlagsEnabled: false,
  lessonsCatalogDeprecationSunsetDays: 30,
  aiEnabled: false,
  aiBaseUrl: 'http://localhost:0',
  aiApiKey: '',
  aiModel: 'MiniMax-M3',
  aiCacheTtlMs: 1000,
  aiRatePerMinute: 5,
  aiRatePerDay: 60,
};

describe('AiModule (DI wiring smoke)', () => {
  async function boot() {
    return Test.createTestingModule({
      imports: [AiModule, PrismaModule],
    })
      .overrideProvider(ConfigService)
      .useValue({ get: jest.fn(() => 'false') })
      .overrideProvider(APP_CONFIG)
      .useValue(baseConfig)
      .overrideProvider(PrismaService)
      .useValue({} as PrismaService)
      .compile();
  }

  it('resolves every provider through Nest DI', async () => {
    const moduleRef = await boot();
    expect(moduleRef.get(AiCacheStore)).toBeInstanceOf(AiCacheStore);
    expect(moduleRef.get(AiRateLimitStore)).toBeInstanceOf(AiRateLimitStore);
    expect(moduleRef.get(MiniMaxProvider)).toBeInstanceOf(MiniMaxProvider);

    await moduleRef.close();
  });

  it('routes AI_PROVIDER symbol to the MiniMaxProvider instance', async () => {
    const moduleRef = await boot();
    const { AI_PROVIDER } = await import('./ai-provider.interface');
    const provider = moduleRef.get<MiniMaxProvider>(AI_PROVIDER);
    expect(provider).toBeInstanceOf(MiniMaxProvider);

    await moduleRef.close();
  });
});
