import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AnnotationInputComponent } from './annotation-input.component';
import type { Annotation } from '@engclass/shared';

const ANNOTATION: Annotation = {
  id: 'a-1',
  pageIndex: 0,
  x: 10,
  y: 20,
  text: 'hola',
  fontSize: 12,
};

describe('AnnotationInputComponent', () => {
  let fixture: ComponentFixture<AnnotationInputComponent>;
  let component: AnnotationInputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AnnotationInputComponent] }).compileComponents();
    fixture = TestBed.createComponent(AnnotationInputComponent);
    component = fixture.componentInstance;
    component.annotation = ANNOTATION;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('saves on Enter (without Shift)', () => {
    let saved: Annotation | undefined;
    component.save.subscribe((value) => (saved = value));
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    textarea.value = 'editado';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(saved?.text).toBe('editado');
  });

  it('inserts newline on Shift+Enter (does not save)', () => {
    const saveSpy = jest.fn();
    component.save.subscribe(saveSpy);
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    textarea.value = 'con\nsalto';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('cancels on Escape', () => {
    let cancelled = false;
    component.cancel.subscribe(() => (cancelled = true));
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelled).toBe(true);
  });
});