'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeSettings } = require('../src/main/settings.cjs');

test('sanitizeSettings accepts supported values', () => {
  assert.deepEqual(sanitizeSettings({
    alwaysOnTop: false,
    autoWander: false,
    clickThrough: true,
    startAtLogin: true,
    scale: 1.2,
    position: { x: -120.2, y: 88.8 },
  }), {
    alwaysOnTop: false,
    autoWander: false,
    clickThrough: true,
    startAtLogin: true,
    scale: 1.2,
    position: { x: -120, y: 89 },
  });
});

test('sanitizeSettings rejects malformed scale and position', () => {
  const result = sanitizeSettings({
    scale: 9,
    position: { x: 'left', y: null },
  });

  assert.equal(result.scale, 1);
  assert.equal(result.position, null);
});
