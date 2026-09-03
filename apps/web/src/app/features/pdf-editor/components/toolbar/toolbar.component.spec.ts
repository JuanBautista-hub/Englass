import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ToolbarComponent } from './toolbar.component';
import type { UiError } from '../../services/pdf-editor.service';

describe('ToolbarComponent', () => {
  let fixture: ComponentFixture<ToolbarComponent>;
  let component: ToolbarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToolbarComponent] }).compileComponents();
    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
  });

  it('shows the requestId when an error is present', () => {
    const error: UiError = { message: 'bad input', code: 'VALIDATION', requestId: 'req-xyz' };
    component.error = signal(error);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('req-xyz');
    expect(text).toContain('VALIDATION');
  });

  it('disables Save when canSave is false', () => {
    component.canSave = signal(false);
    fixture.detectChanges();
    const saveBtn: HTMLButtonElement = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    )!;
    expect(saveBtn.disabled).toBe(true);
  });

  it('writes the requestId to the clipboard when Copy is clicked', () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const error: UiError = { message: 'rate-limited', code: 'RATE_LIMITED', requestId: 'rl-7' };
    component.error = signal(error);
    fixture.detectChanges();
    const copyBtn: HTMLButtonElement = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent?.includes('Copiar ID'))!;
    copyBtn.click();
    expect(writeText).toHaveBeenCalledWith('rl-7');
  });
});