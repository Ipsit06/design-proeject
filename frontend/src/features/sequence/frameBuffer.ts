export class SlidingFeatureBuffer {
  private buffer: number[][] = [];
  private windowSize: number;

  constructor(windowSize = 30) {
    this.windowSize = windowSize;
  }

  addFrame(features: number[]) {
    this.buffer.push([...features]);
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }
  }

  getFrames(): number[][] {
    return [...this.buffer];
  }

  isFull(): boolean {
    return this.buffer.length >= this.windowSize;
  }

  clear() {
    this.buffer = [];
  }
}
