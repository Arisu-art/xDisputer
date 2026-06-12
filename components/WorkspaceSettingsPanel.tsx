'use client';

import { useState } from 'react';
import { rounds, type Round } from '../lib/reference-store';
import type { WorkspacePreferences } from '../lib/workspace-preferences';

type Props = {
  preferences: WorkspacePreferences;
  caseCount: number;
  filingCount: number;
  accountEmail?: string | null;
  accountRole?: 'admin' | 'client';
  onChange: (next: WorkspacePreferences) => void;
  onExportRecords: () => void;
  onClearRecords: () => void;
};

function Toggle({ checked, onChange, title, description }: { checked: boolean; onChange: (checked: boolean) => void; title: string; description: string }) {
  return <label className="settings-toggle">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span className="settings-switch" aria-hidden="true" />
    <span className="settings-toggle-copy"><strong>{title}</strong><small>{description}</small></span>
  </label>;
}

export default function WorkspaceSettingsPanel({ preferences, caseCount, filingCount, accountEmail, accountRole = 'client', onChange, onExportRecords, onClearRecords }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  function update(values: Partial<WorkspacePreferences>) { onChange({ ...preferences, ...values }); }

  return <section className="settings-workspace operations-workspace client-preferences-workspace">
    <section className="panel settings-group client-account-settings">
      <header>
        <div>
          <p className="eyebrow">Account</p>
          <h2>Client account settings</h2>
          <p>View account context and adjust local workspace preferences. These controls do not change backend roles, managers, billing, or permissions.</p>
        </div>
      </header>
      <div className="client-account-summary-grid">
        <article><span>Email</span><strong>{accountEmail || 'Signed in account'}</strong></article>
        <article><span>Workspace access</span><strong>{accountRole === 'admin' ? 'Manager view' : 'Client view'}</strong></article>
        <article><span>Local records</span><strong>{caseCount} cases · {filingCount} handoff items</strong></article>
      </div>
    </section>

    <section className="panel settings-group client-workflow-settings">
      <header>
        <div>
          <p className="eyebrow">Client Workflow</p>
          <h2>Package preparation preferences</h2>
          <p>Choose the default round and how strictly the app should guide each client package.</p>
        </div>
      </header>

      <div className="settings-grid compact-settings-grid">
        <label className="settings-select client-round-setting">
          <span><strong>Default round for new client packets</strong><small>This only affects new cases. Existing cases keep their selected round.</small></span>
          <select value={preferences.defaultRound} onChange={(event) => update({ defaultRound: event.target.value as Round })}>
            {rounds.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <div className="settings-required-rule client-template-rule">
          <strong>Template layout authority</strong>
          <p>The latest uploaded template controls the document layout. The app fills client data into detected template sections.</p>
          <span>Automatic</span>
        </div>
      </div>

      <div className="settings-grid compact-settings-grid">
        <Toggle checked={preferences.strictValidation} onChange={(checked) => update({ strictValidation: checked })} title="Require complete checklist before generation" description="Blocks package generation until the client profile, templates, evidence, and required fields are ready." />
        <Toggle checked={preferences.openTrackerAfterFinalization} onChange={(checked) => update({ openTrackerAfterFinalization: checked })} title="Open Client Center after package completion" description="Move to the client handoff center after the final package is prepared." />
      </div>
    </section>

    <section className="panel settings-group client-records-settings">
      <header><div><p className="eyebrow">Local Records</p><h3>Workspace history</h3><p>Export or clear local case and handoff history. Uploaded templates stay untouched.</p></div></header>
      <div className="settings-summary slim-settings-summary">
        <span><strong>{caseCount}</strong><small>Cases</small></span>
        <span><strong>{filingCount}</strong><small>Handoff items</small></span>
      </div>
      <div className="settings-record-actions-row">
        <button type="button" className="settings-record-action" onClick={onExportRecords}>
          <div><strong>Export local records</strong><small>Download case and handoff metadata only.</small></div><span>Export</span>
        </button>
        {!confirmClear ? <button type="button" className="settings-record-action danger" onClick={() => setConfirmClear(true)}>
          <div><strong>Clear local history</strong><small>Remove local case and handoff records only.</small></div><span>Clear</span>
        </button> : <div className="settings-clear-confirm compact-clear-confirm">
          <strong>Clear local case and handoff records?</strong>
          <p>Templates, source data, evidence files, account role, and backend access are not removed.</p>
          <div><button type="button" className="secondary-button" onClick={() => setConfirmClear(false)}>Cancel</button><button type="button" className="danger-button" onClick={() => { onClearRecords(); setConfirmClear(false); }}>Clear Records</button></div>
        </div>}
      </div>
    </section>
  </section>;
}
