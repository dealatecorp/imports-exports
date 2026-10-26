import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Harbor | Import & Export Operations',description:'Warehouse inventory, container operations and shipment visibility'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
