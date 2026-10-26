export const ROUTES=[
 {id:'mumbai-dubai',port:'Mumbai',overseas:'Dubai',warehouse:'Mumbai Gateway',base:1800000,kg:1800,m3:900000},
 {id:'mumbai-rotterdam',port:'Mumbai',overseas:'Rotterdam',warehouse:'Mumbai Gateway',base:4200000,kg:3200,m3:1600000},
 {id:'chennai-singapore',port:'Chennai',overseas:'Singapore',warehouse:'Chennai Logistics',base:2200000,kg:2000,m3:1000000},
] as const;
export const money=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(paise/100);
export function priceBooking(route:typeof ROUTES[number],weight:number,volume:number,packages:number,service:string,handling:string){
 const freight=Math.max(Math.round(weight*route.kg),Math.round(volume*route.m3));
 const packing=packages*15000,care=handling==='fragile'?Math.round(freight*.15):handling==='chilled'?Math.round(freight*.25):0;
 const priority=service==='priority'?Math.round((route.base+freight+packing+care)*.2):0;
 return {version:'demo-rates-v1',currency:'INR',weight,volume,packages,service,handling,lines:[{label:'Route fee',amount:route.base},{label:'Freight (higher of weight or volume)',amount:freight},{label:'Package handling',amount:packing},{label:'Special handling',amount:care},{label:'Priority service',amount:priority}],total:route.base+freight+packing+care+priority};
}
