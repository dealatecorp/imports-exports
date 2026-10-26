import {CustomerContact} from './customer-orders';
import {ORDER_STEPS} from '@/lib/order-steps';
import {ReceiveOrder} from './receive-order';
import Link from 'next/link';
import {Store,Row,units} from '@/lib/db';
import {orderWorkspace,lookups,list,itemSummary,recordName,orderLocked,receiptReview,handedOver,transportStarted,orderContainersLocked} from '@/lib/queries';
import {displayValue} from '@/lib/wording';
import {ActionForm} from './action-form';

export function OrderWorkspace({store:s,user:u,id,selectedContainer}:{store:Store;user:Row;id:string;selectedContainer?:string}){
 const {order:o,lines,shipments,allocations}=orderWorkspace(s,u,id);
 const all=lookups(s,u),eligible=all.shipments.filter((sh:Row)=>sh.warehouse_id===o.warehouse_id&&sh.direction===o.direction&&!sh.cancelled&&!transportStarted(s,sh));
 const L={...all,locations:all.locations.filter((l:Row)=>l.warehouse_id===o.warehouse_id),orderLines:all.orderLines.filter((l:Row)=>l.order_id===id),shipments:eligible,containers:all.containers.filter((c:Row)=>eligible.some((sh:Row)=>sh.id===c.shipment_id))};
 const act=(action:string,label:string,initial:Row={},data=L)=><ActionForm action={action} label={label} csrf={u.csrf} employee={{id:u.id,name:u.name,email:u.email}} lookups={data} initial={initial}/>;
 const date=(value:string)=>new Date(value).toLocaleString('en-IN',{timeZone:all.settings.timezone,dateStyle:'medium',timeStyle:'short'});
 const locked=orderLocked(s,o),containersLocked=orderContainersLocked(s,o),review=receiptReview(s,u,id);
 const steps=ORDER_STEPS;
 return <div className="order-workspace" id={'order-'+id}>
  <section className="panel prose">
   <div className="section-heading"><div><span className="eyebrow">ORDER WORKSPACE</span><h2>{o.display_name}</h2></div><span className="badge">{displayValue(o.status)}</span></div>
   <p>{o.party} · {o.warehouse} → {o.destination}</p><p className="muted">Reference: {o.ref} · Needed by {date(o.due)} · {displayValue(o.direction)}</p>
   <div className="action-bar">{u.role==='manager'&&act('delete-order','Delete order',{order_id:id})}{shipments.filter(sh=>!sh.cancelled).map(sh=><div key={sh.id}>{act('tracking',shipments.length===1?'Update order status':'Update status: '+sh.origin+' → '+sh.destination,{shipment_id:sh.id},{...L,shipments,containers:all.containers.filter((c:Row)=>c.shipment_id===sh.id)})}</div>)}</div>
   <div className="order-progress-track" role="progressbar" aria-label={o.display_name+' progress'} aria-valuemin={0} aria-valuemax={steps.length-1} aria-valuenow={o.step} aria-valuetext={steps[o.step]}><span style={{width:`${o.step/(steps.length-1)*100}%`}}/></div>
   <div className="order-timeline">{steps.map((step,i)=><div className={i<=o.step?'done':''} key={step} aria-current={i===o.step?'step':undefined}><span>{i+1}</span>{step}</div>)}</div>
   {review.unloaded&&o.status!=='Completed'&&<div className="notice"><h3>Waiting to receive</h3><ReceiveOrder key={review.version} orderId={id} version={review.version} csrf={u.csrf} employee={{id:u.id,name:u.name,email:u.email}} blockedReason={review.reason}/></div>}
   <CustomerContact store={s} orderId={id}/>
   <p className="muted">Progress covers the whole order. Separate containers may be at different stages.</p>
   <p className="notice" hidden={!locked}>The ordered quantities have already been sent, handed over or received. Adding items and containers is locked. You can still view its documents and history.</p>{containersLocked&&!locked&&<p className="notice">This order has been sent. New containers cannot be added.</p>}<nav className="workspace-jumps" aria-label={o.display_name+' sections'}><a href={'#items-'+id}>1. Order items</a><a href={'#shipping-'+id}>2. Shipping & containers</a><a href={'#updates-'+id}>3. Documents & updates</a></nav>
  </section>
  <section className="panel prose" id={'items-'+id}><div className="section-heading"><div><h2>1. Order items</h2><p className="muted">Add items here, then place them in containers below.</p></div>{!locked&&act('order-line','Add item to order',{order_id:id})}</div>
   <div className="table-wrap"><table><thead><tr>{['Item','Ordered','Assigned to containers','Still to assign','Received','Sent','Unit'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{lines.map(l=><tr key={l.id}><td>{l.product_name}</td>{[l.quantity,l.assigned,Math.max(0,l.quantity-l.closed-l.assigned),l.received,l.dispatched].map((n,i)=><td key={i}>{units(n).toLocaleString()}</td>)}<td>{l.unit}</td></tr>)}</tbody></table></div>
  </section>
  <section className="panel prose" id={'shipping-'+id}><div className="section-heading"><div><h2>2. Shipping details & containers</h2><p className="muted">Add the route and dates, then add containers and their items.</p></div><div className="action-bar">{!containersLocked&&act('shipment','Add shipping details',{order_id:id,warehouse_id:o.warehouse_id,direction:o.direction})}{!containersLocked&&eligible.some((sh:Row)=>!shipments.some(r=>r.id===sh.id))&&act('link-shipment','Use existing shipping details',{order_id:id},{...L,shipments:eligible.filter((sh:Row)=>!shipments.some(r=>r.id===sh.id))})}</div></div>
   {!shipments.length&&<p className="empty">No shipping details yet. Add them here to start adding containers. Everything is saved to this order.</p>}
   {shipments.map(sh=><article className="order-shipping" key={sh.id}>
    <div className="section-heading"><div><h3>{sh.origin} → {sh.destination}</h3><p>{sh.carrier} · {displayValue(sh.kind)} · {displayValue(sh.status)}</p></div>{!containersLocked&&!sh.cancelled&&!transportStarted(s,sh)&&act('container','Add container',{shipment_id:sh.id})}</div>
    <dl className="detail-grid"><div><dt>Shipping reference</dt><dd>{sh.ref}</dd></div><div><dt>Ship / trip</dt><dd>{sh.vessel||'Not entered'} / {sh.voyage||'Not entered'}</dd></div><div><dt>Leaving</dt><dd>{date(sh.departure)}</dd></div><div><dt>Expected arrival</dt><dd>{date(sh.eta)}</dd></div></dl>
    {sh.shared&&<p className="notice">These shipping details are shared with other orders. Sending, cancelling or updating the route affects all containers on this trip.</p>}
    {!sh.containers.length&&<p className="muted">No containers yet. Use Add container above.</p>}
    <div className="order-containers">{sh.containers.map((c:Row)=>{const rows=allocations.filter(a=>a.container_id===c.id);return <section className={'order-container '+(selectedContainer===c.id?'selected':'')} key={c.id} id={'container-'+c.id}>
     <div className="section-heading"><div><h3>{c.display_name}</h3><span className="badge">{displayValue(c.status)}</span></div>{!locked&&!sh.cancelled&&!sh.dispatched&&!handedOver(s,sh,c.id)&&act('allocate','Add items to this container',{container_id:c.id})}</div>
     <p className="muted">Reference: {c.number} · {c.type} · Seal: {c.seal}</p><p className="muted">Weight limit: {c.max_weight?units(c.max_weight)+' kg':'Not entered'} · Space limit: {c.max_volume?units(c.max_volume)+' m³':'Not entered'}</p>
     {!rows.length&&<p>No items from this order assigned yet.</p>}
     {rows.map(a=><div className="assigned-item" key={a.id}><div><strong>{a.product_name} — {units(a.quantity)} {a.unit}</strong><p className="muted">{a.location} · {a.packages||0} packages · Weight: {a.weight==null?'Not entered':units(a.weight)+' kg'} · Space: {a.volume==null?'Not entered':units(a.volume)+' m³'}{a.lot?' · Batch '+a.lot:''}</p><p>Set aside: {units(a.reserved)} · Loading area: {units(a.staged)} · Loaded: {units(a.loaded)} · Sent: {units(a.dispatched)} · Received: {units(a.received)} · On hold: {units(a.blocked)}</p></div>
      {a.cancelled?<p className="muted">Removed from container</p>:<div className="action-bar">{!sh.cancelled&&(o.direction==='export'?(!sh.dispatched&&!handedOver(s,sh,c.id)?<>{a.reserved>0&&act('stage','Move to loading area',{allocation_id:a.id})}{(a.reserved>0||a.staged>0)&&act('load','Load into container',{allocation_id:a.id})}{a.loaded>0&&act('unload','Unload from container',{allocation_id:a.id})}{act('cancel-allocation','Remove items',{allocation_id:a.id})}</>:u.role==='manager'&&act('return','Receive returned items',{allocation_id:a.id})):act('receive','Receive items',{allocation_id:a.id}))}{a.blocked>0&&act('inspect','Accept after inspection',{allocation_id:a.id})}</div>}
     </div>)}
     {sh.shared&&<details><summary>All items in this shared container</summary><p>{itemSummary(s,'containers',c.id)}</p></details>}
    </section>})}</div>
    {u.role==='manager'&&<div className="action-bar">{act('eta','Change expected arrival',{shipment_id:sh.id})}{o.direction==='export'&&!sh.dispatched&&!sh.cancelled&&!handedOver(s,sh)&&!locked&&act('dispatch','Mark goods as sent',{shipment_id:sh.id,version:sh.version})}{sh.dispatched&&!sh.cancelled&&!handedOver(s,sh)&&act('dispatch-correction','Undo sent status',{shipment_id:sh.id})}{!sh.cancelled&&act('cancel-shipment','Cancel this transport',{shipment_id:sh.id})}</div>}
   </article>)}
  </section>
  <section className="panel prose" id={'updates-'+id}><h2>3. Documents & progress updates</h2>{!shipments.length&&<p className="muted">Add shipping details above to attach documents and record progress here.</p>}{shipments.map(sh=>{const docs=list(s,u,'attachments',{shipment:sh.id},true).rows,events=list(s,u,'tracking',{shipment:sh.id},true).rows;return <div className="order-shipping" key={sh.id}><h3>{sh.origin} → {sh.destination} · {sh.ref}</h3><div className="action-bar">{act('document','Upload document',{shipment_id:sh.id})}</div><h4>Documents</h4>{!docs.length&&<p className="muted">No documents uploaded.</p>}{docs.map(d=><p key={d.id}>{d.name} · {d.type} · {displayValue(d.scan)} {d.scan==='Clean'&&<a className="text-button" href={'/api/documents?id='+d.id}>Download</a>}</p>)}<h4>Progress history</h4>{!events.length&&<p className="muted">No updates recorded.</p>}{events.map(e=><p key={e.id}><strong>{displayValue(e.stage)}</strong> · {e.place} · {date(e.event_time)} · {e.container_id?recordName(s,'containers',e.container_id):'All containers'}<br/>{e.notes}</p>)}</div>})}</section>
  {review.issues.length>0&&<section className="panel prose"><h2>Receiving issues to resolve</h2>{review.issues.map(issue=><div key={issue.id} className="assigned-item"><strong>{issue.kind} — {units(issue.quantity)}</strong><p>{issue.reason}</p>{u.role==='manager'&&act('resolve','Resolve receiving issue',{id:issue.id,version:issue.version})}</div>)}</section>}
  <Link className="text-button" href={o.direction==='export'?'/exports':'/imports'}>Back to orders</Link>
 </div>;
}
