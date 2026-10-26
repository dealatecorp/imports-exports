import {Store,Fault} from './db';
import {incompatible} from './cargo-rules';
export function checkContainerItems(s:Store,containerId:string,productId?:string){
 const items=s.all(`SELECT DISTINCT p.id,p.name,COALESCE(g.cargo_group,'General goods') AS cargo_group FROM allocations a JOIN order_lines ol ON ol.id=a.line_id JOIN products p ON p.id=ol.product_id LEFT JOIN product_cargo_groups g ON g.product_id=p.id WHERE a.container_id=? AND a.cancelled=0`,containerId);
 if(productId){const p=s.get(`SELECT p.id,p.name,COALESCE(g.cargo_group,'General goods') AS cargo_group FROM products p LEFT JOIN product_cargo_groups g ON g.product_id=p.id WHERE p.id=?`,productId);if(p)items.push(p);}
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)if(incompatible(items[i].cargo_group,items[j].cargo_group))throw new Fault(`${items[i].name} (${items[i].cargo_group}) and ${items[j].name} (${items[j].cargo_group}) cannot share a container. Choose a separate container.`,409);
}
