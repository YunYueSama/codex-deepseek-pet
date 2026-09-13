'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {classify}=require('../src/main/environment.cjs');
test('classification uses process names and does not invent webpage context',()=>{assert.equal(classify('Code'),'code');assert.equal(classify('chrome'),'other');assert.equal(classify('vlc'),'media');assert.equal(classify('SumatraPDF'),'reading');assert.equal(classify(''),'other');});
