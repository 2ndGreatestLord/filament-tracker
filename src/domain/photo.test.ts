import { describe, expect, it } from 'vitest';
import { fitWithin } from './photo';

describe('fitWithin', () => {
  it('shrinks landscape photos to 1280 wide', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1280, height: 960 });
  });

  it('shrinks portrait photos to 1280 tall', () => {
    expect(fitWithin(3000, 4000)).toEqual({ width: 960, height: 1280 });
  });

  it('never enlarges a small photo', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('leaves an exact fit alone', () => {
    expect(fitWithin(1280, 720)).toEqual({ width: 1280, height: 720 });
  });

  it('never rounds a side down to nothing', () => {
    expect(fitWithin(10000, 1)).toEqual({ width: 1280, height: 1 });
  });
});
