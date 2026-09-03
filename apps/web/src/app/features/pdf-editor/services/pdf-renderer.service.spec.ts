import { PdfRendererService } from './pdf-renderer.service';

describe('PdfRendererService', () => {
  let service: PdfRendererService;

  beforeEach(() => {
    service = new PdfRendererService();
  });

  it('throws when getting a page before any document is loaded', async () => {
    await expect(service.getPage(0)).rejects.toThrow('No PDF document loaded');
  });

  it('throws when computing pixel positions without a cached viewport', () => {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('data-pdf-scale', '1');
    expect(() => service.screenToPdfPoint(canvas, 10, 10, 0)).toThrow(
      /Viewport not cached/,
    );
  });

  it('exposes a signal for the loaded document', () => {
    expect(service.pdfDocument()).toBeNull();
  });
});