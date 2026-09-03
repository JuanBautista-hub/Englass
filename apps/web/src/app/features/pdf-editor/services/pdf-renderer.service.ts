import { Injectable, signal } from '@angular/core';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';

const COORDINATE_PRECISION = 100;

function round(value: number): number {
  return Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION;
}

interface CachedViewport {
  convertToPdfPoint: (x: number, y: number) => [number, number];
  convertToViewportPoint: (x: number, y: number) => [number, number];
}

@Injectable({ providedIn: 'root' })
export class PdfRendererService {
  readonly pdfDocument = signal<PDFDocumentProxy | null>(null);
  private readonly viewports = new Map<number, CachedViewport>();

  async loadDocument(arrayBuffer: ArrayBuffer): Promise<void> {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = this.resolveWorkerSrc();
    const task = pdfjs.getDocument({ data: arrayBuffer });
    const document = await task.promise;
    this.viewports.clear();
    this.pdfDocument.set(document);
  }

  async getPage(pageIndex: number): Promise<PDFPageProxy> {
    const doc = this.pdfDocument();
    if (!doc) {
      throw new Error('No PDF document loaded');
    }
    return doc.getPage(pageIndex + 1);
  }

  async renderPage(
    pageIndex: number,
    canvas: HTMLCanvasElement,
    scale: number,
  ): Promise<RenderTask> {
    const page = await this.getPage(pageIndex);
    const viewport = page.getViewport({ scale });
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    this.viewports.set(pageIndex, {
      convertToPdfPoint: (x: number, y: number) => viewport.convertToPdfPoint(x, y) as [number, number],
      convertToViewportPoint: (x: number, y: number) =>
        viewport.convertToViewportPoint(x, y) as [number, number],
    });
    return page.render({ canvasContext: ctx, viewport });
  }

  screenToPdfPoint(
    canvas: HTMLCanvasElement,
    screenX: number,
    screenY: number,
    pageIndex: number,
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const offsetX = screenX - rect.left;
    const offsetY = screenY - rect.top;
    const viewport = this.requireViewport(pageIndex);
    const [pdfX, pdfY] = viewport.convertToPdfPoint(offsetX, offsetY);
    return { x: round(pdfX), y: round(pdfY) };
  }

  pixelPositionOnCanvas(
    canvas: HTMLCanvasElement,
    pageIndex: number,
    pdfX: number,
    pdfY: number,
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const viewport = this.requireViewport(pageIndex);
    const [screenX, screenY] = viewport.convertToViewportPoint(pdfX, pdfY);
    return { x: screenX + rect.left, y: screenY + rect.top };
  }

  pixelPositionOnCanvasLocal(
    canvas: HTMLCanvasElement,
    pageIndex: number,
    pdfX: number,
    pdfY: number,
  ): { x: number; y: number } {
    const viewport = this.requireViewport(pageIndex);
    const [screenX, screenY] = viewport.convertToViewportPoint(pdfX, pdfY);
    return { x: screenX, y: screenY };
  }

  private requireViewport(pageIndex: number): CachedViewport {
    const cached = this.viewports.get(pageIndex);
    if (!cached) {
      throw new Error(
        `Viewport not cached for page ${pageIndex}. Call renderPage() first.`,
      );
    }
    return cached;
  }

private resolveWorkerSrc(): string {
    return 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}