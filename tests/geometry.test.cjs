'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  clampWindowBounds,
  directionFromDelta,
  fixedSizeBounds,
  lookFrameFromDelta,
  pointerVector,
} = require('../src/main/geometry.cjs');

test('directionFromDelta covers all eight screen directions', () => {
  const cases = [
    [[100, 0], 'east'],
    [[100, 100], 'south-east'],
    [[0, 100], 'south'],
    [[-100, 100], 'south-west'],
    [[-100, 0], 'west'],
    [[-100, -100], 'north-west'],
    [[0, -100], 'north'],
    [[100, -100], 'north-east'],
  ];

  for (const [[dx, dy], expected] of cases) {
    assert.equal(directionFromDelta(dx, dy), expected);
  }
});

test('directionFromDelta has a stable center dead zone', () => {
  assert.equal(directionFromDelta(0, 0), 'center');
  assert.equal(directionFromDelta(12, -10), 'center');
  assert.equal(directionFromDelta(40, 0), 'east');
});

test('lookFrameFromDelta maps all 16 frames clockwise from north', () => {
  for (let index = 0; index < 16; index += 1) {
    const angle = index * Math.PI * 2 / 16;
    const dx = Math.sin(angle) * 100;
    const dy = -Math.cos(angle) * 100;
    assert.equal(lookFrameFromDelta(dx, dy), index, `look frame ${index}`);
  }
});

test('lookFrameFromDelta keeps the neutral frame inside the dead zone', () => {
  assert.equal(lookFrameFromDelta(0, 0), null);
  assert.equal(lookFrameFromDelta(12, -10), null);
  assert.equal(lookFrameFromDelta(0, -40), 0);
  assert.equal(lookFrameFromDelta(40, 0), 4);
  assert.equal(lookFrameFromDelta(0, 40), 8);
  assert.equal(lookFrameFromDelta(-40, 0), 12);
});

test('pointerVector normalizes distant coordinates and preserves direction', () => {
  const result = pointerVector({ x: 500, y: 100 }, { x: 100, y: 100 }, 200, 20);

  assert.equal(result.direction, 'east');
  assert.equal(result.distance, 400);
  assert.equal(result.lookIndex, 4);
  assert.equal(result.x, 1);
  assert.equal(result.y, 0);
});

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
