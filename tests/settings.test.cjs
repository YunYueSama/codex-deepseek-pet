'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeSettings, DEFAULT_SETTINGS } = require('../src/main/settings.cjs');

test('sanitizeSettings accepts supported values', () => {
  assert.deepEqual(sanitizeSettings({
    alwaysOnTop: false,
    autoWander: false,
    clickThrough: true,
    startAtLogin: true,
    scale: 0.42,
    position: { x: -120.2, y: 88.8 },
  }), {
    ...DEFAULT_SETTINGS,
    alwaysOnTop: false,
    autoWander: false,
    clickThrough: true,
    startAtLogin: true,
    scale: 0.42,
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


test('size accepts every percentage including zero and clamps legacy settings',()=>{
 for(let n=0;n<=100;n++)assert.equal(sanitizeSettings({scale:n/100}).scale,n/100);
 assert.equal(sanitizeSettings({scale:1.2}).scale,1);assert.equal(sanitizeSettings({scale:-1}).scale,0);
 assert.equal(sanitizeSettings({scale:NaN}).scale,1);assert.equal(sanitizeSettings({scale:'0.5'}).scale,1);
});
