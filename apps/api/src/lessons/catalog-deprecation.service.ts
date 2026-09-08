import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../common/config';

@Injectable()
export class CatalogDeprecationService {
  /**
   * In-memory deprecation telemetry for `GET /lessons/catalog/:id`.
   *
   * The contract with `openspec/changes/move-business-logic-from-learn-to-backend`
   * (task 11.2) is: when `hitsSinceStart()` is observed to be 0 for 7 consecutive
   * days in production telemetry (not this in-memory counter, which resets on
   * process restart — wire it to your metrics exporter), the endpoint and its
   * controller method may be removed. See apps/api/CHANGELOG.md.
   */
  private hits = 0;
  private readonly sunsetDate: Date;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const now = new Date();
    this.sunsetDate = new Date(now.getTime() + config.lessonsCatalogDeprecationSunsetDays * 86_400_000);
  }

  recordHit(): void {
    this.hits += 1;
  }

  hitsSinceStart(): number {
    return this.hits;
  }

  sunsetDateHttp(): string {
    return this.sunsetDate.toUTCString();
  }

  daysUntilSunset(): number {
    const now = new Date();
    return Math.max(0, Math.ceil((this.sunsetDate.getTime() - now.getTime()) / 86_400_000));
  }

  successorUrl(lessonId: string): string {
    return `/api/v1/lessons/${lessonId}`;
  }
}
