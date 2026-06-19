'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const RenderDebugger = dynamic(() => import('./RenderDebugger'), {
  ssr: false,
  loading: () => null
});

function debugRequested() {
  if (process.env.NODE_ENV !== 'production') return true;
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  return params.get('debugPanel') === '1'
    || params.get('xdisputerDebug') === 'panel'
    || params.get('xdisputerDebug') === '1'
    || params.get('debug') === 'ui'
    || params.get('debug') === 'ui-panel';
}

export default function RenderDebuggerMount() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(debugRequested());
  }, []);

  if (!enabled) return null;
  return <RenderDebugger />;
}
