module.exports = function canvasStub() {
  return {
    Canvas: class {},
    Image: class {},
    createCanvas: () => ({ getContext: () => null }),
    loadImage: () => Promise.resolve({}),
  };
};