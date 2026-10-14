const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(path,mocks={}){
  const exports={};
  const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS}}).outputText;
  new Function('require','exports',code)(name=>mocks[name]??require(name),exports);
  return exports;
}
const favorites=load('lib/customer-favorites.ts');
const summary=load('lib/account-summary.ts',{'@/lib/customer-favorites':favorites});
const id='7dcbf2ab-2d75-4e71-a8ea-42e7e8c567d0';
const now=Date.parse('2026-10-14T21:00:00Z');
const accounts=[
 {id:'one',created_at:new Date(now-86400000).toISOString(),email_confirmed_at:'confirmed',user_metadata:{farmfinder_saved_farms:[id]}},
 {id:'two',created_at:new Date(now-15*86400000).toISOString(),email_confirmed_at:null},
 {id:'three',created_at:'2020-01-01T12:00:00Z',email_confirmed_at:'confirmed',user_metadata:{farmfinder_saved_farms:['invalid']}},
 {id:'four',created_at:new Date(now+86400000).toISOString()},
];
test('summary counts all accounts, confirms separately and deduplicates owner accounts',()=>{
 assert.deepEqual(summary.summarizeAccounts(accounts,['one','one','three','orphan'],now),{total:4,email_confirmed:2,with_saved_farms:1,activated_owners:2,new_last_7_days:1,new_last_30_days:2});
});
test('recent windows exclude exact cutoff dates, invalid dates and future dates',()=>{
 const rows=[{id:'a',created_at:new Date(now-7*86400000).toISOString()},{id:'b',created_at:new Date(now-30*86400000).toISOString()},{id:'c',created_at:'bad'}];
 const result=summary.summarizeAccounts(rows,[],now);assert.equal(result.new_last_7_days,0);assert.equal(result.new_last_30_days,1);
});
function routeHarness({admin=true,authenticated=true,listError=false,adminError=false}={}){
 let listCalls=0,clientCalls=0;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.test';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='public';process.env.SUPABASE_SERVICE_ROLE_KEY='server-test';
 const client={auth:{getUser:async()=>({data:{user:authenticated?{id:'admin'}:null},error:null})},from:table=>{
  const query={select(){return this;},eq(){return this;},not(){return this;},order(){return this;},maybeSingle:async()=>({data:admin?{user_id:'admin'}:null,error:adminError?new Error('offline'):null}),range:async()=>({data:[{owner_user_id:'one'},{owner_user_id:'one'}],error:null})};
  return query;
 }};
 const route=load('app/api/admin-accounts/route.ts',{
 '@supabase/supabase-js':{createClient:()=>{clientCalls++;return client;}},
 'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},
 '@/lib/supabase-admin-users':{listAllAuthUsers:async()=>{listCalls++;return {users:accounts,error:listError?new Error('offline'):null};}},
 '@/lib/account-summary':summary,
 });
 return {GET:route.GET,listCalls:()=>listCalls,clientCalls:()=>clientCalls};
}
test('anonymous requests are rejected before any privileged database access',async()=>{
 const h=routeHarness();const r=await h.GET(new Request('https://example.test/api/admin-accounts'));assert.equal(r.status,401);assert.equal(h.clientCalls(),0);assert.equal(h.listCalls(),0);
});
test('authenticated customers cannot retrieve account totals',async()=>{
 const h=routeHarness({admin:false});const r=await h.GET(new Request('https://example.test',{headers:{authorization:'Bearer customer'}}));assert.equal(r.status,403);assert.equal(h.listCalls(),0);
});
test('invalid tokens are rejected and admin verification failures do not expose counts',async()=>{
 for(const options of [{authenticated:false},{adminError:true}]){
 const h=routeHarness(options);const r=await h.GET(new Request('https://example.test',{headers:{authorization:'Bearer bad'}}));assert.equal(r.status,options.authenticated===false?401:503);assert.equal(h.listCalls(),0);
 }
});
test('authorized admins receive only aggregate counts with no-store protection',async()=>{
 const h=routeHarness();const r=await h.GET(new Request('https://example.test',{headers:{authorization:'Bearer admin'}}));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');const body=await r.json();assert.equal(body.summary.total,4);assert.equal(body.summary.activated_owners,1);assert.equal(body.users,undefined);assert.ok(body.checked_at);
});
test('account enumeration failures return an error rather than misleading zero counts',async()=>{
 const h=routeHarness({listError:true});const r=await h.GET(new Request('https://example.test',{headers:{authorization:'Bearer admin'}}));assert.equal(r.status,503);assert.equal((await r.json()).summary,undefined);
});
