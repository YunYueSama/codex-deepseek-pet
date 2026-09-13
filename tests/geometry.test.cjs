'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {clampWindowBounds,fixedSizeBounds}=require('../src/main/geometry.cjs');
test('clampWindowBounds leaves a visible grip on screen', () => {
  const result = clampWindowBounds(
    { x: 5_000, y: -5_000, width: 360, height: 460 },
    { x: 0, y: 0, width: 1920, height: 1040 },
    28,
  );

  assert.deepEqual(result, {
    x: 1892,
    y: -432,
    width: 360,
    height: 460,
  });
});

test('fixedSizeBounds discards dimensions polluted while moving the window', () => {
  assert.deepEqual(
    fixedSizeBounds({ x: 819.4, y: 182.2, width: 387, height: 314 }, { width: 240, height: 312 }),
    { x: 819, y: 182, width: 240, height: 312 },
  );
});
