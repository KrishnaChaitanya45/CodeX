// Simple debug utilities gated by window.DevsArena.ENABLE_DEBUG_MODE or env var
export function isDebug(): boolean {
  if (typeof window !== 'undefined') {
    const w: any = window as any;
    if (!w.DevsArena) w.DevsArena = {};
    return !!w.DevsArena.ENABLE_DEBUG_MODE;
  }
  if (typeof process !== 'undefined') {
    return process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true';
  }
  return false;
}

export const dlog = (...args: any[]) => { if (isDebug()) console.log(...args); };
export const dwarn = (...args: any[]) => { if (isDebug()) console.warn(...args); };
export const derror = (...args: any[]) => { if (isDebug()) console.error(...args); };

// Helper to wrap a function call only in debug
export function debugFn<T extends (...p: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    if (isDebug()) return fn(...args);
    return undefined as any;
  }) as T;
}
