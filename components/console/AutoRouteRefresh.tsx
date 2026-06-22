'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AutoRouteRefresh() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (timer) return;
      timer = window.setTimeout(() => {
        timer = null;
        router.refresh();
      }, 300);
    };

    const focusHandler = () => refresh();
    const visibilityHandler = () => {
      if (!document.hidden) refresh();
    };

    const interval = window.setInterval(refresh, 12000);
    const stopInterval = window.setTimeout(() => window.clearInterval(interval), 90000);

    window.addEventListener('focus', focusHandler);
    window.addEventListener('online', focusHandler);
    document.addEventListener('visibilitychange', visibilityHandler);
    refresh();

    return () => {
      if (timer) window.clearTimeout(timer);
      window.clearInterval(interval);
      window.clearTimeout(stopInterval);
      window.removeEventListener('focus', focusHandler);
      window.removeEventListener('online', focusHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [router]);

  return null;
}
