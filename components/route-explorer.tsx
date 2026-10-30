 'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowRight,MapPin,Ship} from 'lucide-react';
import {ROUTES} from '@/lib/customer-pricing';
export function RouteExplorer(){
 const [routeId,setRoute]=useState<string>(ROUTES[0].id),[direction,setDirection]=useState('export');
 const route=ROUTES.find(r=>r.id===routeId)||ROUTES[0];
 const origin=direction==='export'?route.port:route.overseas,destination=direction==='export'?route.overseas:route.port;
 return <section className="route-explorer" aria-labelledby="explore-routes"><div className="route-explorer-heading"><h2 id="explore-routes">Find your next route.</h2><p>Explore the routes available for your import or export.</p></div><div className="route-explorer-controls"><label>Direction<select value={direction} onChange={e=>setDirection(e.target.value)}><option value="export">Export from India</option><option value="import">Import to India</option></select></label><label>Route<select value={routeId} onChange={e=>setRoute(e.target.value)}>{ROUTES.map(r=><option key={r.id} value={r.id}>{r.port} ↔ {r.overseas}</option>)}</select></label></div><div className="explorer-journey" key={routeId+direction} aria-live="polite" aria-atomic="true"><div><MapPin size={18}/><span>Origin<strong>{origin}</strong></span></div><span className="journey-connection" aria-hidden="true"><Ship size={20}/><ArrowRight size={18}/></span><div><MapPin size={18}/><span>Destination<strong>{destination}</strong></span></div></div><div className="explorer-footer"><p>Warehouse: {route.warehouse}</p><Link className="primary" href="/customer">Start a booking <ArrowRight size={16}/></Link></div></section>;
}
