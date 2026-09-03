import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { isDraft, isImmutable } from '@engclass/shared';
import { PdfEditorPage } from './pdf-editor.page';
import { PdfEditorService } from '../services/pdf-editor.service';

describe('pdf-editor page status logic', () => {
  it.each([
    ['DRAFT', false],
    ['SUBMITTED', true],
    ['GRADED', true],
  ] as const)('isImmutable(%s) === %s', (status, expected) => {
    expect(isImmutable(status)).toBe(expected);
  });

  it('isDraft is true only for DRAFT', () => {
    expect(isDraft('DRAFT')).toBe(true);
    expect(isDraft('SUBMITTED')).toBe(false);
    expect(isDraft('GRADED')).toBe(false);
  });
});

describe('PdfEditorService cap helpers', () => {
  let service: PdfEditorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PdfEditorService);
  });

  it('enforces the 500-annotation cap', () => {
    expect(service.canAddMore(499)).toBe(true);
    expect(service.canAddMore(500)).toBe(false);
  });

  it('exposes a router via provideRouter', () => {
    expect(provideRouter([])).toBeDefined();
  });
});

// Smoke test: instantiate the page once to verify ngOnInit wiring compiles.
describe('PdfEditorPage smoke', () => {
  it('constructs without throwing', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    expect(() => {
      const fixture = TestBed.createComponent(PdfEditorPage);
      void fixture.componentInstance;
    }).not.toThrow();
  });
});