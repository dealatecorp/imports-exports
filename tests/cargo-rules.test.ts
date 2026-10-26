import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures';
import {incompatible,CARGO_RULES} from '../lib/cargo-rules';

test('Every separation rule works in both directions; matching produce is allowed',()=>{
 for(const [a,b] of CARGO_RULES){assert.equal(incompatible(a,b),true);assert.equal(incompatible(b,a),true);}
 assert.equal(incompatible('Vegetables and fruit','Vegetables and fruit'),false);
});
for(const direction of ['import','export'])test(`${direction}: incompatible items across orders cannot be assigned or loaded; stock stays unchanged`,()=>{
 const f=fixture();try{
 f.opening(100,0);f.s.run("INSERT INTO product_cargo_groups VALUES('p','Vegetables and fruit')");
 const a=f.setup(direction,'10');f.allocate(a,'10');
 const fish=f.call('product',{sku:'FISH',name:'Fish',unit:'unit',precision:0,cargo_group:'Fish and seafood'}).id;
 const b=f.setup(direction,'10');f.s.run('UPDATE order_lines SET product_id=? WHERE id=?',fish,b.line);
 const before=f.total(),count=f.s.get('SELECT COUNT(*) AS n FROM allocations')!.n;
 assert.throws(()=>f.allocate({...b,container:a.container},'10'),/cannot share a container/);
 assert.equal(f.total(),before);assert.equal(f.s.get('SELECT COUNT(*) AS n FROM allocations')!.n,count);
 const compatible=f.setup(direction,'5');f.allocate({...compatible,container:a.container},'5');
 if(direction==='export')f.call('load',{allocation_id:f.s.get('SELECT id FROM allocations WHERE line_id=?',a.line)!.id,from:'Reserved',quantity:'10'});
 }finally{f.s.db.close();}
});
