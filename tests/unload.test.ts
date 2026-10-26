import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures';
import {id} from '../lib/db';

test('Unload automatically matches multiple loads and restores each original stock status exactly once',()=>{
 const f=fixture();try{
 f.opening(100,0);const a=f.allocate(f.setup(),'60');
 f.call('stage',{allocation_id:a,quantity:'30'});
 f.call('load',{allocation_id:a,quantity:'20',from:'Reserved'});
 f.call('load',{allocation_id:a,quantity:'30',from:'Staged'});
 const request={allocation_id:a,quantity:'40',reason:'Container change'},key=id();
 f.call('unload',request,f.e,key);f.call('unload',request,f.e,key);
 assert.equal(f.balance('Loaded'),10);assert.equal(f.balance('Reserved'),20);assert.equal(f.balance('Staged'),30);assert.equal(f.total(),100);
 assert.equal(f.s.get("SELECT COUNT(DISTINCT reversal) AS n FROM movements WHERE kind='Unload'")!.n,2);
 f.call('unload',{allocation_id:a,quantity:'10'});
 assert.equal(f.balance('Loaded'),0);assert.equal(f.balance('Reserved'),30);
 assert.throws(()=>f.call('unload',{allocation_id:a,quantity:'1'}),/currently loaded/);
 f.call('load',{allocation_id:a,from:'Reserved',quantity:'5'});
 f.call('unload',{allocation_id:a,quantity:'5'});assert.equal(f.balance('Loaded'),0);
 }finally{f.s.db.close();}
});
