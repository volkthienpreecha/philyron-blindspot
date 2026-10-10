import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Philyron · Reporting gaps',description:'Investigate sensor patterns with missing captain reports. Independent synthetic interview demo.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
