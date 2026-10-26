// Demo business rules, independent of product names and order direction.
export const CARGO_GROUPS=['General goods','Vegetables and fruit','Fish and seafood','Raw meat','Dry food','Cleaning products','Clothing','Fragile goods','Heavy equipment'] as const;
export type CargoGroup=typeof CARGO_GROUPS[number];
export const CARGO_RULES:readonly (readonly [CargoGroup,CargoGroup])[]=[
 ['Vegetables and fruit','Fish and seafood'],['Vegetables and fruit','Raw meat'],
 ['Dry food','Fish and seafood'],['Dry food','Raw meat'],['Fish and seafood','Raw meat'],
 ['Clothing','Fish and seafood'],['Clothing','Raw meat'],['Fragile goods','Heavy equipment'],
 ...CARGO_GROUPS.filter(g=>g!=='Cleaning products').map(g=>[g,'Cleaning products'] as const),
];
export function incompatible(a:string,b:string){return CARGO_RULES.some(([x,y])=>a===x&&b===y||a===y&&b===x);}
