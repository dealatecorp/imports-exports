import {Store,Row,id,now} from './db';
import {orderTimeline,recordName} from './queries';
import {ORDER_STEPS} from './order-steps';
export const WHATSAPP_SENDER='7981456043';
export function whatsappLink(phone:string,message:string){return 'https://wa.me/'+phone.replace(/\D/g,'')+'?text='+encodeURIComponent(message);}
export function customerEvent(s:Store,bookingId:string,eventKey:string,message:string){s.run('INSERT OR IGNORE INTO customer_updates VALUES(?,?,?,?,?)',id(),bookingId,eventKey,message,now());}
export function recordCustomerChanges(s:Store,action:string,d:Row,_result:Row,key:string){
 const ids=new Set<string>();if(d.order_id)ids.add(d.order_id);
 if(d.line_id){const line=s.get('SELECT order_id FROM order_lines WHERE id=?',d.line_id);if(line)ids.add(line.order_id);}
 if(d.allocation_id){const a=s.get('SELECT ol.order_id FROM allocations a JOIN order_lines ol ON ol.id=a.line_id WHERE a.id=?',d.allocation_id);if(a)ids.add(a.order_id);}
 let shipmentId=d.shipment_id;
 if(d.container_id){for(const o of s.all('SELECT DISTINCT ol.order_id FROM allocations a JOIN order_lines ol ON ol.id=a.line_id WHERE a.container_id=? AND a.cancelled=0',d.container_id))ids.add(o.order_id);shipmentId=null;}
 if(action==='resolve'&&d.id){const o=s.get('SELECT ol.order_id FROM discrepancies d JOIN allocations a ON a.id=d.allocation_id JOIN order_lines ol ON ol.id=a.line_id WHERE d.id=?',d.id);if(o)ids.add(o.order_id);}
 if(shipmentId)for(const o of s.all(`SELECT order_id FROM order_shipments WHERE shipment_id=? UNION SELECT ol.order_id FROM allocations a JOIN order_lines ol ON ol.id=a.line_id JOIN containers c ON c.id=a.container_id WHERE c.shipment_id=? AND a.cancelled=0`,shipmentId,shipmentId))ids.add(o.order_id);
 const links:Row[]=[];
 const labels:Record<string,string>={'tracking':'Progress updated','eta':'Expected arrival updated','allocate':'Items added to a container','container':'Container added','shipment':'Shipping details added','link-shipment':'Shipping details connected','order-line':'Order items updated','stage':'Items moved to the loading area','load':'Items loaded','unload':'Items unloaded','dispatch':'Goods sent','receive':'Items received','receive-order':'Order received and completed','delete-order':'Order removed from the active staff list','document-upload':'Document added','cancel-shipment':'Transport cancelled','cancel-allocation':'Container items changed','dispatch-correction':'Sending details corrected','return':'Returned items received','inspect':'Item inspection updated','resolve':'Receiving issue updated'};
 if(!labels[action])return links;
 for(const orderId of ids){const b=s.get('SELECT b.id,c.name,COALESCE(bc.phone,c.phone) AS phone,COALESCE(bc.whatsapp,c.whatsapp) AS whatsapp FROM customer_bookings b JOIN customers c ON c.id=b.customer_id LEFT JOIN customer_booking_contacts bc ON bc.booking_id=b.id WHERE b.order_id=?',orderId),o=s.get('SELECT * FROM orders WHERE id=?',orderId);if(!b||!o)continue;
 const message=`HarborTrack update for ${recordName(s,'orders',orderId)}: ${labels[action]}. Current progress: ${ORDER_STEPS[orderTimeline(s,o)]}.${action==='tracking'?' Checkpoint: '+String(d.stage)+' at '+String(d.place)+'.':''}${action==='eta'?' Expected arrival: '+String(d.eta)+'.':''} View your customer dashboard for details.`;
 customerEvent(s,b.id,key,message);if(b.whatsapp)links.push({name:b.name,url:whatsappLink(b.phone,message)});
 }return links;
}
