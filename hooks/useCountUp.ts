import { useEffect, useRef, useState } from "react";

/**
 * Animate a number from its previous value to `target` over `durationMs`,
 * easing out. Drives KPI/metric headlines so they count up the way top-tier
 * dashboards do instead of snapping.
 *
 * RAF-based (not reanimated) on purpose: a handful of KPI tiles re-rendering a
 * cheap number for ~half a second is trivial, and it behaves identically on web
 * and native without worklet/New-Architecture caveats.
 */
export function useCountUp(target: number, durationMs = 650): number {
  const [value, setValue] = useState(target);
  // Latest rendered value — the start point when `target` changes mid-flight.
  const valueRef = useRef(target);
  valueRef.current = value;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = valueRef.current;
    if (!isFinite(target) || from === target) {
      setValue(target);
      return;
    }

    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}
