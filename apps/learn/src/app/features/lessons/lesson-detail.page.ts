import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LessonsService } from '../../core/services/lessons.service';
import { TtsService } from '../../core/services/tts.service';
import { Lesson } from '../../core/models';

@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a routerLink="/lessons">← Back</a>
    @if (lesson(); as l) {
      <section class="card" style="margin-top:0.75rem;">
        <h2>{{ l.title }}</h2>
        <p style="color:#64748b;">[{{ l.level }}]</p>
        <p>{{ l.prompt }}</p>
        @if (l.translation) {
          <p style="color:#475569;">{{ l.translation }}</p>
        }
        <div class="row">
          <button class="primary" (click)="play()" [disabled]="playing()">{{ playing() ? 'Playing…' : 'Play TTS' }}</button>
          @if (lastVoice()) {
            <span style="color:#475569;font-size:0.85rem;">voice: {{ lastVoice() }} ({{ lastDuration() }} ms)</span>
          }
        </div>
        @if (audioUrl(); as url) {
          <audio #player [src]="url" controls style="display:block;margin-top:0.5rem;width:100%;"></audio>
        }
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
      </section>
    } @else if (loading()) {
      <p>Loading…</p>
    } @else {
      <p>Lesson not found.</p>
    }
  `,
})
export class LessonDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly lessons = inject(LessonsService);
  private readonly tts = inject(TtsService);

  protected readonly lesson = signal<Lesson | null>(null);
  protected readonly loading = signal(true);
  protected readonly playing = signal(false);
  protected readonly audioUrl = signal<string | null>(null);
  protected readonly lastVoice = signal<string | null>(null);
  protected readonly lastDuration = signal<number>(0);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    try {
      this.lesson.set(await this.lessons.get(id));
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'load_failed');
    } finally {
      this.loading.set(false);
    }
  }

  async play(): Promise<void> {
    const l = this.lesson();
    if (!l) {
      return;
    }
    this.playing.set(true);
    this.error.set(null);
    try {
      const prev = this.audioUrl();
      if (prev) {
        this.tts.release(prev);
      }
      const result = await this.tts.synthesize(l.prompt);
      this.audioUrl.set(result.url);
      this.lastVoice.set(result.voice);
      this.lastDuration.set(result.durationMs);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'tts_failed');
    } finally {
      this.playing.set(false);
    }
  }

  ngOnDestroy(): void {
    const url = this.audioUrl();
    if (url) {
      this.tts.release(url);
    }
  }
}
