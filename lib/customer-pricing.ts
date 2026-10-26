export const ROUTES=[
 {id:'mumbai-dubai',port:'Mumbai',overseas:'Dubai',warehouse:'Mumbai Gateway',base:1800000,kg:1800,m3:900000},
 {id:'mumbai-rotterdam',port:'Mumbai',overseas:'Rotterdam',warehouse:'Mumbai Gateway',base:4200000,kg:3200,m3:1600000},
 {id:'chennai-singapore',port:'Chennai',overseas:'Singapore',warehouse:'Chennai Logistics',base:2200000,kg:2000,m3:1000000},
] as const;
export const money=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(paise/100);
export type QuoteItem={name:string;quantity:number;cargo_group?:string};
const itemRates:Record<string,number>={'General goods':2000,'Vegetables and fruit':3000,'Fish and seafood':5000,'Raw meat':5000,'Dry food':2000,'Cleaning products':4000,'Clothing':1500,'Fragile goods':4500,'Heavy equipment':6000};
export function priceBooking(route:typeof ROUTES[number],weight:number,volume:number,packages:number,service:string,handling:string,items:QuoteItem[]=[],direction='export'){
 const weightCharge=Math.round(weight*route.kg),spaceCharge=Math.round(volume*route.m3),freight=weightCharge+spaceCharge;
 const itemLines=items.map(item=>({label:`${item.name} handling (${item.quantity})`,amount:Math.round(item.quantity*(itemRates[item.cargo_group||'General goods']||2000))}));
 const itemTotal=itemLines.reduce((sum,item)=>sum+item.amount,0),importFee=direction==='import'?250000:0;
 const packing=Math.round(packages*15000),care=handling==='fragile'?Math.round(freight*.15):handling==='chilled'?Math.round(freight*.25):0;
 const subtotal=route.base+freight+packing+care+itemTotal+importFee,priority=service==='priority'?Math.round(subtotal*.2):0;
 return {version:'demo-rates-v2',currency:'INR',weight,volume,packages,service,handling,direction,lines:[{label:'Route fee',amount:route.base},{label:'Weight charge',amount:weightCharge},{label:'Space charge',amount:spaceCharge},{label:'Package handling',amount:packing},...itemLines,{label:'Import processing',amount:importFee},{label:'Special handling',amount:care},{label:'Priority service',amount:priority}],total:subtotal+priority};
}
