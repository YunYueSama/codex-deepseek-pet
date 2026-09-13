'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http');const {endpoint,complete}=require('../src/main/chat.cjs');
test('endpoint allows TLS and loopback, rejects credential URLs and remote HTTP',()=>{
 assert.equal(endpoint('http://127.0.0.1:1234/v1/'),'http://127.0.0.1:1234/v1/chat/completions');
 assert.equal(endpoint('https://api.deepseek.com/v1/chat/completions'),'https://api.deepseek.com/v1/chat/completions');
 for(const url of ['http://example.com/v1','file:///etc/passwd','https://user:secret@example.com','https://example.com?key=123'])assert.throws(()=>endpoint(url));
});
test('request only includes bounded user history and explicit image, returns actual text',async()=>{
 let received;const server=http.createServer((req,res)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{received=JSON.parse(b);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:'我想明白了。'}}]}));});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const answer=await complete({baseUrl:`http://127.0.0.1:${server.address().port}/v1`,model:'test',messages:[{role:'user',content:'你好'}],image:'data:image/png;base64,AA==',memory:'称呼我小林'});
 assert.equal(answer,'我想明白了。');assert.equal(received.messages[0].role,'system');assert.equal(received.messages.at(-1).content[1].type,'image_url');assert.equal(received.stream,false);assert.equal(received.max_tokens,1200);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('provider errors do not expose response body',async()=>{await assert.rejects(()=>complete({baseUrl:'https://example.com',model:'test',messages:[],fetchImpl:async()=>new Response('secret-provider-body',{status:401})}),e=>!e.message.includes('secret')&&e.message.includes('密钥'));});
test('cancellation stops request',async()=>{const controller=new AbortController();controller.abort();await assert.rejects(()=>complete({baseUrl:'http://127.0.0.1:1234',model:'test',messages:[],signal:controller.signal}),e=>e.name==='AbortError');});
test('malformed successful response and empty choices are rejected',async()=>{
 for(const body of ['not-json','{"choices":[]}'])await assert.rejects(()=>complete({baseUrl:'https://example.com',model:'test',messages:[],fetchImpl:async()=>new Response(body)}));
});
