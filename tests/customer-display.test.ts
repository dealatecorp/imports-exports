import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingDisplayStatus,customerDisplayName,customerUpdateText} from '../lib/customer-display';

test('Legacy payment history keeps its no-charge disclosure without changing customer-written text',()=>{
 const history=[
  'Your quote is ready. Complete demo checkout to submit your order. No real money will be charged.',
  'Demo payment approved. Order 10 is confirmed and ready for the operations team. No money was charged.',
  'Demo payment declined. You can retry checkout. No money was charged.',
  'Demo checkout cancelled. No money was charged.',
 ];
 for(const message of history){
  const displayed=customerUpdateText(message);
  assert.doesNotMatch(displayed,/demo/i);
  assert.match(displayed,/No (real )?money (will be|was) charged/);
 }
 const customerText='Demo payment approved. Customer asked for a demo shipment.';
 assert.equal(customerUpdateText(customerText),customerText);
 assert.equal(customerDisplayName('Demo Customer'),'Customer');
 assert.equal(customerDisplayName('Demo Customer Supplies'),'Demo Customer Supplies');
 assert.equal(bookingDisplayStatus('Paid (demo)'),'Payment approved');
 assert.equal(bookingDisplayStatus('Awaiting payment'),'Awaiting payment');
});
