'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');

test('browser preview hides desktop-calibrated pupils without requiring the Electron bridge', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'src', 'renderer', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(projectRoot, 'src', 'renderer', 'styles.css'), 'utf8');
  const app = fs.readFileSync(path.join(projectRoot, 'src', 'renderer', 'app.js'), 'utf8');

  assert.match(html, /data-runtime="browser"/);
  assert.match(
    css,
    /\.pet-root\[data-runtime="browser"\] \.eye-layer\s*{\s*display:\s*none;/,
  );
  assert.match(app, /const petApi = window\.petApi \|\|/);
  assert.doesNotMatch(app, /window\.petApi\.(?:onPointer|onAction|onWalk|onSettings|ready)/);
});
