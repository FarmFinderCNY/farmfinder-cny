const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(path, mocks = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const result = {};
  new Function('require', 'exports', compiled)((name) => mocks[name] ?? require(name), result);
  return result;
}
const helpers = load('lib/customer-favorites.ts');
const A = '7dcbf2ab-2d75-4e71-a8ea-42e7e8c567d0';
const B = '92cad8fe-4ca0-4691-8055-260fec2db63a';

test('favorites normalize duplicates and reject malformed account data', () => {
  assert.deepEqual(helpers.savedFarmIds({[helpers.FAVORITES_KEY]:[A,A,null,'not-an-id',B]}),[A,B]);
  assert.deepEqual(helpers.savedFarmIds({[helpers.FAVORITES_KEY]:'bad'}),[]);
  assert.deepEqual(helpers.savedFarmIds(undefined),[]);
});
test('saving is idempotent, removal preserves other farms, and IDs are validated', () => {
  const metadata = {[helpers.FAVORITES_KEY]:[A],owner_access_invitation_count:2};
  assert.deepEqual(helpers.changeSavedFarms(metadata,A,true),[A]);
  assert.deepEqual(helpers.changeSavedFarms(metadata,B,true),[A,B]);
  assert.deepEqual(helpers.changeSavedFarms(metadata,A,false),[]);
  assert.equal(metadata.owner_access_invitation_count,2);
  assert.throws(()=>helpers.changeSavedFarms(metadata,'invalid',true));
});
test('favorites have a bounded account payload without dropping an existing favorite', () => {
  const ids=Array.from({length:100},(_,i)=>`${i.toString(16).padStart(8,'0')}-0000-0000-0000-000000000000`);
  assert.throws(()=>helpers.changeSavedFarms({[helpers.FAVORITES_KEY]:ids},A,true),/100/);
  assert.deepEqual(helpers.changeSavedFarms({[helpers.FAVORITES_KEY]:ids},ids[0],true),ids);
});

function providerHarness() {
  let index=0, mounted=false, callback;
  const states=[],refs=[],effects=[];
  const user={id:'customer-one',email:'first@example.test',user_metadata:{[helpers.FAVORITES_KEY]:[A],owner_access_invitation_count:2}};
  let current=user, failure=false, paused;
  const auth={
    onAuthStateChange: fn => {callback=fn;return {data:{subscription:{unsubscribe(){}}}};},
    getSession:async()=>({data:{session:current?{user:current}:null},error:null}),
    getUser:async()=>({data:{user:current},error:null}),
    updateUser:async attributes=>{
      if(paused) await paused;
      if(failure) return {data:{user:null},error:new Error('offline')};
      current={...current,user_metadata:{...current.user_metadata,...attributes.data}};
      callback('USER_UPDATED',{user:current});
      return {data:{user:current},error:null};
    },
  };
  const fakeReact={...React,
    useState:initial=>{const slot=index++;if(!(slot in states))states[slot]=initial;return [states[slot],value=>{states[slot]=typeof value==='function'?value(states[slot]):value;}];},
    useRef:initial=>{const slot=index++;return refs[slot]??(refs[slot]={current:initial});},
    useCallback:fn=>fn,
    useEffect:fn=>{if(!mounted)effects.push(fn);},
  };
  const module=load('components/customer-favorites.tsx',{'react':fakeReact,'next/link':{default:'a'},'@/lib/customer-favorites':helpers,'@/lib/supabase-browser':{getBrowserSupabaseClient:()=>({auth})}});
  const render=()=>{index=0;const element=module.CustomerFavoritesProvider({children:null});mounted=true;return element.props.value;};
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.test';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='public-test-key';
  render(); effects.forEach(fn=>fn());
  return {render,auth,setFailure:value=>failure=value,event:(event,next)=>{current=next;callback(event,next?{user:next}:null);},pause:promise=>paused=promise,current:()=>current};
}
test('favorites persist to the authenticated account and preserve owner metadata', async () => {
  const harness=providerHarness();
  await harness.render().retry();
  await harness.render().setSaved(B,true);
  assert.deepEqual(harness.current().user_metadata[helpers.FAVORITES_KEY],[A,B]);
  assert.equal(harness.current().user_metadata.owner_access_invitation_count,2);
  assert.deepEqual(harness.render().savedIds,[A,B]);
});
test('failed saves retain the previous favorites and release the busy state', async () => {
  const harness=providerHarness();await harness.render().retry();harness.setFailure(true);
  await assert.rejects(harness.render().setSaved(B,true),/couldn’t be updated/);
  assert.deepEqual(harness.render().savedIds,[A]);assert.equal(harness.render().busy,false);
});
test('sign-out and account switching do not show another account favorites', async () => {
  const harness=providerHarness();await harness.render().retry();
  harness.event('SIGNED_OUT',null);assert.deepEqual(harness.render().savedIds,[]);
  harness.event('SIGNED_IN',{id:'customer-two',user_metadata:{[helpers.FAVORITES_KEY]:[B]}});
  assert.deepEqual(harness.render().savedIds,[B]);
});
test('overlapping save actions are blocked until the first completes', async () => {
  const harness=providerHarness();await harness.render().retry();let release;
  harness.pause(new Promise(resolve=>release=resolve));
  const first=harness.render().setSaved(B,true);
  await assert.rejects(harness.render().setSaved(A,false),/wait/);
  release();await first;assert.deepEqual(harness.render().savedIds,[A,B]);
});
test('password recovery is surfaced separately and clears on sign-out', async () => {
  const harness=providerHarness();await harness.render().retry();
  harness.event('PASSWORD_RECOVERY',harness.current());assert.equal(harness.render().recovery,true);
  harness.event('SIGNED_OUT',null);assert.equal(harness.render().recovery,false);
});

function renderDashboard(context,stands=[],params={}) {
  const module=load('components/customer-dashboard.tsx',{
    'next/link':{default:props=>React.createElement('a',props)},
    'next/navigation':{useRouter:()=>({replace(){},refresh(){}}),useSearchParams:()=>({get:name=>params[name]??null})},
    '@/components/customer-favorites':{useCustomerFavorites:()=>context},
    '@/components/stand-card':{StandCard:({stand})=>React.createElement('article',null,stand.name)},
    '@/lib/supabase-browser':{},'@/lib/customer-favorites':helpers,
  });
  return renderToStaticMarkup(React.createElement(module.CustomerDashboard,{stands}));
}
const context={user:null,ready:true,recovery:false,savedIds:[],busy:false,error:'',retry(){},finishRecovery(){},setSaved(){}};
test('anonymous users see account choices and a pending save without exposing favorites',()=>{
  const html=renderDashboard(context,[{id:A,name:'Test farm'}],{save:A});
  assert.ok(html.includes('Welcome back'));assert.ok(html.includes('Test farm'));assert.ok(html.includes('Create an account'));
});
test('saved dashboard uses farmer dates, orders recent updates first and retains unavailable IDs',()=>{
  const stands=[{id:A,name:'Old farm',farmer_inventory_updated_at:'2020-01-01T12:00:00Z'},{id:B,name:'New farm',farmer_inventory_updated_at:new Date().toISOString()}];
  const html=renderDashboard({...context,user:{email:'first@example.test'},savedIds:[A,B,'00000000-0000-0000-0000-000000000000']},stands);
  assert.ok(html.indexOf('New farm')<html.indexOf('Old farm'));
  assert.ok(html.includes('January 1, 2020'));assert.ok(html.includes('Unavailable listings'));
  assert.ok(html.includes('An older update does not mean a farm is closed'));
});

test('save controls send anonymous customers to sign-in and show saved state to account owners',()=>{
  function buttonHtml(value){
    const module=load('components/customer-favorites.tsx',{'react':{...React,useContext:()=>value},'next/link':{default:props=>React.createElement('a',props)},'@/lib/customer-favorites':helpers,'@/lib/supabase-browser':{}});
    return renderToStaticMarkup(React.createElement(module.SaveFarmButton,{farmId:A,farmName:'Test farm'}));
  }
  assert.ok(buttonHtml(context).includes(`/my-farms?save=${A}`));
  const savedHtml=buttonHtml({...context,user:{id:'one'},savedIds:[A]});
  assert.ok(savedHtml.includes('aria-pressed="true"'));assert.ok(savedHtml.includes('♥ Saved'));
  assert.ok(buttonHtml({...context,user:{id:'one'},busy:true}).includes('disabled=""'));
});

test('a delayed account refresh cannot bring back favorites after sign-out', async()=>{
  const harness=providerHarness();await harness.render().retry();const previous=harness.current();let release;
  harness.auth.getUser=()=>new Promise(resolve=>{release=()=>resolve({data:{user:previous},error:null});});
  const refresh=harness.render().retry();
  await new Promise(resolve=>setImmediate(resolve));
  harness.event('SIGNED_OUT',null);release();await refresh;
  assert.equal(harness.render().user,null);assert.deepEqual(harness.render().savedIds,[]);
});
