'use client';

import {useEffect, useMemo, useRef} from 'react';
import styles from './animated-number.module.css';

type AnimatedNumberProps = {
  value: number;
  maximumFractionDigits?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

/** A readable server-rendered value with a short, in-view count transition. */
export function AnimatedNumber({
  value,
  maximumFractionDigits = 0,
  prefix = '',
  suffix = '',
  className,
}: AnimatedNumberProps) {
  const target = Number.isFinite(value) ? value : 0;
  const digits = Math.max(0, Math.min(20, Math.trunc(maximumFractionDigits)));
  const formatter = useMemo(() => new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: /[₹$€£]/.test(prefix) ? Math.min(2, digits) : 0,
  }), [digits, prefix]);
  const finalText = `${prefix}${formatter.format(target)}${suffix}`;
  const root = useRef<HTMLSpanElement>(null);
  const visual = useRef<HTMLSpanElement>(null);
  const displayedValue = useRef(target);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = root.current;
    const output = visual.current;
    if (!element || !output) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let started = false;
    let finished = false;
    const finish = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      finished = true;
      displayedValue.current = target;
      hasAnimated.current = true;
      output.textContent = finalText;
    };
    const start = () => {
      if (started || finished) return;
      started = true;
      if (reducedMotion.matches || document.visibilityState !== 'visible') {
        finish();
        return;
      }

      const from = hasAnimated.current ? displayedValue.current : 0;
      const duration = hasAnimated.current ? 420 : 650;
      hasAnimated.current = true;
      if (from === target) {
        finish();
        return;
      }
      const began = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - began) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = from + (target - from) * eased;
        displayedValue.current = current;
        output.textContent = `${prefix}${formatter.format(current)}${suffix}`;
        if (progress < 1) frame = requestAnimationFrame(tick);
        else finish();
      };
      frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') finish();
    };
    const onMotionPreference = () => {
      if (reducedMotion.matches) finish();
    };

    let observer: IntersectionObserver | undefined;
    if (reducedMotion.matches || document.visibilityState !== 'visible') finish();
    else if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) start();
        else if (started) finish();
      }, {threshold: 0.2});
      observer.observe(element);
    } else start();

    document.addEventListener('visibilitychange', onVisibility);
    reducedMotion.addEventListener('change', onMotionPreference);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reducedMotion.removeEventListener('change', onMotionPreference);
    };
  }, [target, finalText, formatter, prefix, suffix]);

  return <span ref={root} className={[styles.number, className].filter(Boolean).join(' ')}>
    <span className={styles.sizer} aria-hidden="true">{finalText}</span>
    <span ref={visual} className={styles.visual} aria-hidden="true">{finalText}</span>
    <span className={styles.accessible}>{finalText}</span>
  </span>;
}
