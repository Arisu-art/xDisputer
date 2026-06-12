'use client';

import { memo, type ReactNode, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  eyebrow: string;
  title: string;
  summary: string;
  actionLabel?: string;
  trigger?: ReactNode;
  triggerClassName?: string;
  headerAction?: ReactNode;
  closeLabel?: string;
  children: ReactNode;
};

function TableFlyout({
  eyebrow,
  title,
  summary,
  actionLabel = 'Manage',
  trigger,
  triggerClassName,
  headerAction,
  closeLabel = 'Close',
  children
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const flyout = open ? <div className="table-flyout-overlay table-flyout-overlay-clear" role="presentation" onMouseDown={() => setOpen(false)}>
    <section className="table-flyout-card table-flyout-card-live table-flyout-card-active" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
      <header className="table-flyout-main-header">
        <div>
          <p>{eyebrow}</p>
          <h3 id={titleId}>{title}</h3>
        </div>
        <div className="table-flyout-header-actions">
          {headerAction}
          <button type="button" className="table-flyout-close danger" onClick={() => setOpen(false)} aria-label={closeLabel}>×</button>
        </div>
      </header>
      <div className="table-flyout-body">
        {children}
      </div>
    </section>
  </div> : null;

  return <>
    <button type="button" className={`table-flyout-summary-card ${triggerClassName || ''}`} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      {trigger || <><span>{summary}</span><small>{actionLabel}</small></>}
    </button>
    {mounted && flyout ? createPortal(flyout, document.body) : null}
  </>;
}

export default memo(TableFlyout);
