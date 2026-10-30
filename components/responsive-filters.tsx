 'use client';
import {useState} from 'react';
import {SlidersHorizontal,ChevronDown} from 'lucide-react';
export function ResponsiveFilters({children,activeCount=0}:{children:React.ReactNode;activeCount?:number}){
 const [open,setOpen]=useState(false);
 return <div className="responsive-filters" data-open={open}><button type="button" className="secondary filter-toggle" aria-expanded={open} aria-controls="dashboard-filters" onClick={()=>setOpen(!open)}><SlidersHorizontal size={16}/>Filters{activeCount>0&&<span className="filter-count">{activeCount} active</span>}<ChevronDown size={16}/></button><div id="dashboard-filters" className="filter-content">{children}</div></div>;
}
