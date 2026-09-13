'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('local page resources resolve without remote font or script dependencies',()=>{
 for(const file of ['index.html','companion.html']){
 const html=fs.readFileSync(path.join(__dirname,'../src/renderer',file),'utf8');
 assert.match(html,/Content-Security-Policy/);assert.doesNotMatch(html,/<(?:script|link)[^>]+https?:/);
 for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))assert.ok(fs.existsSync(path.resolve(__dirname,'../src/renderer',m[1])),m[1]);
 }
});
