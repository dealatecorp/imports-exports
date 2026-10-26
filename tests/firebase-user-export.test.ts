import test from 'node:test';
import assert from 'node:assert/strict';
import {hashSync,compareSync} from 'bcryptjs';
import {firebaseUserExport} from '../lib/firebase-user-export';

test('Firebase export preserves password hashes, IDs and disabled staff status',()=>{
 const password=hashSync('MigrationTest!2026',4);
 const result=firebaseUserExport([{id:'staff',email:'staff@example.com',name:'Staff',password,active:0,role:'employee'}],[{id:'customer',email:'customer@example.com',name:'Customer',password}]);
 assert.equal(result.users[0].localId,'staff');assert.equal(result.users[0].disabled,true);
 assert.equal(result.users[1].disabled,false);
 assert.equal(Buffer.from(result.users[0].passwordHash,'base64').toString(),password);
 assert.ok(compareSync('MigrationTest!2026',Buffer.from(result.users[1].passwordHash,'base64').toString()));
});
test('Firebase export rejects duplicate identities, unsupported hashes and unmigrated MFA',()=>{
 const a={id:'one',email:'same@example.com',name:'Test',password:hashSync('MigrationTest!2026',4)};
 assert.throws(()=>firebaseUserExport([a],[{...a,id:'two'}]),/overlap/);
 assert.throws(()=>firebaseUserExport([a],[{...a,email:'different@example.com'}]),/Duplicate/);
 assert.throws(()=>firebaseUserExport([{...a,password:'invalid'}],[]),/unsupported/);
 assert.throws(()=>firebaseUserExport([{...a,mfa:'enabled'}],[]),/second factor/);
});
