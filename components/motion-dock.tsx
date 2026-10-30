'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useLayoutEffect, useRef} from 'react';
import {LayoutDashboard, Package, ArrowUpRight, ArrowDownLeft, Ship, Users, ClipboardCheck, FileBarChart} from 'lucide-react';
import styles from './motion-dock.module.css';

const items = [
  ['overview', 'Dashboard', LayoutDashboard],
  ['inventory', 'Stock', Package],
  ['exports', 'Exports', ArrowUpRight],
  ['imports', 'Imports', ArrowDownLeft],
  ['orders', 'Orders', Ship],
  ['customer-orders', 'Customer orders', Users],
  ['receiving', 'Waiting to receive', ClipboardCheck],
  ['reports', 'Reports', FileBarChart],
] as const;

export function MotionDock() {
  const path = usePathname();
  const root = useRef<HTMLElement>(null);
  const frame = useRef(0);
  const reduced = useRef(true);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced.current = media.matches; };
    update();
    media.addEventListener('change', update);
    return () => { media.removeEventListener('change', update); cancelAnimationFrame(frame.current); };
  }, []);

  useLayoutEffect(() => {
    const nav = root.current;
    if (!nav) return;
    const position = () => {
      const active = nav.querySelector<HTMLAnchorElement>('[aria-current="page"]');
      nav.style.setProperty('--marker-opacity', active?.offsetWidth ? '1' : '0');
      if (active) {
        nav.style.setProperty('--marker-x', `${active.offsetLeft}px`);
        nav.style.setProperty('--marker-y', `${active.offsetTop}px`);
        nav.style.setProperty('--marker-width', `${active.offsetWidth}px`);
        nav.style.setProperty('--marker-height', `${active.offsetHeight}px`);
      }
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [path]);

  function reset() {
    cancelAnimationFrame(frame.current);
    root.current?.querySelectorAll<HTMLAnchorElement>('a').forEach(link => link.style.setProperty('--proximity', '0'));
  }

  return <nav ref={root} className={styles.dock} aria-label="Main navigation"
    onPointerLeave={reset} onBlur={reset}
    onPointerMove={event => {
      if (event.pointerType !== 'mouse' || reduced.current) return;
      const x = event.clientX;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const links = Array.from(root.current?.querySelectorAll<HTMLAnchorElement>('a') || []);
        const distances = links.map(link => { const r = link.getBoundingClientRect(); return Math.max(0, 1 - Math.abs(x - r.left - r.width / 2) / 90); });
        links.forEach((link, i) => link.style.setProperty('--proximity', String(distances[i])));
      });
    }}>
    <span className={styles.marker} aria-hidden="true"/>
    {items.map(([key, label, Icon], index) => <Link key={key} href={'/' + key}
      aria-label={label} aria-current={path === '/' + key ? 'page' : undefined}
      className={`${styles.item} ${index > 4 ? styles.desktopOnly : ''}`}>
      <span className={styles.icon}><Icon size={19}/></span>
      <span className={styles.label}>{label}</span>
    </Link>)}
  </nav>;
}
