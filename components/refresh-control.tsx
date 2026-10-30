 'use client';
import {useEffect,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {RefreshCw,WifiOff} from 'lucide-react';
export function RefreshControl(){
 const router=useRouter(),[pending,startTransition]=useTransition(),[online,setOnline]=useState(true),[requested,setRequested]=useState(false);
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 return <div className="refresh-control"><span role="status" aria-live="polite">{!online?'Offline':pending?'Refreshing…':requested?'View refreshed':''}</span><button className="icon-button" type="button" disabled={pending||!online} aria-label={!online?'Offline — refresh unavailable':'Refresh current view'} onClick={()=>{setRequested(true);startTransition(()=>router.refresh());}}>{online?<RefreshCw size={18} className={pending?'spin':undefined}/>:<WifiOff size={18}/>}</button></div>;
}
