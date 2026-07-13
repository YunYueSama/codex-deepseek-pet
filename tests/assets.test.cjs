'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ASSET_NAMES = [
  'idle',
  'curious',
  'shy',
  'happy',
  'excited',
  'wave',
  'surprised',
  'jump',
  'sleepy',
  'review',
  'run-left',
  'run-right',
];

function readPngHeader(filePath) {
  const buffer = fs.readFileSync(filePath);
  const pngSignature = '89504e470d0a1a0a';

  assert.equal(buffer.subarray(0, 8).toString('hex'), pngSignature);
  assert.equal(buffer.subarray(12, 16).toString('ascii'), 'IHDR');

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25),
  };
}

test('all runtime poses provide native-size transparent PNG assets', () => {
  for (const name of ASSET_NAMES) {
    const filePath = path.join(__dirname, '..', 'assets', 'pet', `${name}.png`);
    assert.ok(fs.existsSync(filePath), `missing pose asset: ${name}`);

    const metadata = readPngHeader(filePath);
    assert.ok(metadata.width >= 280, `${name} is too narrow: ${metadata.width}px`);
    assert.ok(metadata.height >= 400, `${name} is too short: ${metadata.height}px`);
    assert.ok([4, 6].includes(metadata.colorType), `${name} has no PNG alpha channel`);
  }
});
