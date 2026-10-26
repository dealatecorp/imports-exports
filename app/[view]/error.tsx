'use client';
import Link from 'next/link';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="loading-state"><h1>We couldn’t load this workspace</h1><p>Your posted operations remain saved. Retry the page to continue.</p><button className="primary" onClick={reset}>Retry</button><Link href="/overview">Back to overview</Link></main>}
