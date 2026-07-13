'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  clampWindowBounds,
  directionFromDelta,
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

test('pointerVector normalizes distant coordinates and preserves direction', () => {
  const result = pointerVector({ x: 500, y: 100 }, { x: 100, y: 100 }, 200, 20);

  assert.equal(result.direction, 'east');
  assert.equal(result.distance, 400);
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
