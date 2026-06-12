'use client';

import { type ReactNode, useEffect, useId, useState } from 'react';

type Props = {
  eyebrow: string;
  title: string;
  summary: string;
  actionLabel?: string;
  children: ReactNode;
};

export default function TableFlyout({ eyebrow, title, summary, actionLabel = 'Manage', children }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return <>
    <button type="button" className="table-flyout-summary-card" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      <span>{summary}</span>
      <small>{actionLabel}</small>
    </button>

    {open && <div className="table-flyout-overlay" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className="table-flyout-card table-flyout-card-live" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
        <header className="table-flyout-main-header">
          <div>
            <p>{eyebrow}</p>
            <h3 id={titleId}>{title}</h3>
          </div>
          <button type="button" className="table-flyout-close" onClick={() => setOpen(false)} aria-label="Close account controls">×</button>
        </header>
        {children}
      </section>
    </div>}
  </>;
}
