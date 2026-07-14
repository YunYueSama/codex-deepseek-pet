'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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

test('all 16 clockwise look frames are transparent, high-resolution, and distinct', () => {
  const hashes = new Set();

  for (let index = 0; index < 16; index += 1) {
    const name = `look-${String(index).padStart(2, '0')}.png`;
    const filePath = path.join(__dirname, '..', 'assets', 'pet', 'look', name);
    assert.ok(fs.existsSync(filePath), `missing look asset: ${name}`);

    const metadata = readPngHeader(filePath);
    assert.equal(metadata.width, 768, `${name} has the wrong width`);
    assert.equal(metadata.height, 832, `${name} has the wrong height`);
    assert.ok([4, 6].includes(metadata.colorType), `${name} has no PNG alpha channel`);
    hashes.add(crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'));
  }

  assert.equal(hashes.size, 16, 'look frames must not contain duplicated files');
});
