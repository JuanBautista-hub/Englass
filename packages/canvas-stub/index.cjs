class CanvasStub {
  width = 0;
  height = 0;
  getContext() {
    return null;
  }
}

module.exports = {
  Canvas: CanvasStub,
  Image: class ImageStub {},
  ImageData: class ImageDataStub {},
  createCanvas: () => new CanvasStub(),
  loadImage: () => Promise.resolve({}),
  registerFont: () => undefined,
  deregisterAllFonts: () => undefined,
  parseFont: () => ({}),
};