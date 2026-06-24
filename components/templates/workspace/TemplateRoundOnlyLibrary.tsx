'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { rounds, type Round } from '../../../lib/reference-store';

type TemplateAsset = {
  id: string;
  round_label?: string | null;
  template_kind?: 'LETTER' | 'EXHIBIT' | string | null;
  letter_type?: string | null;
  exhibit_kind?: string | null;
  original_filename?: string | null;
  version_number?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  validation_json?: {
    status?: string | null;
    confidence?: number | string | null;
    warnings?: unknown[];
    errors?: unknown[];
    missingFields?: unknown[];
    unknownRequiredFields?: unknown[];
  } | null;
};

type TemplateStorageState = { mode?: string | null; mutationMode?: string | null; warning?: string | null } | null;

type ManagerTemplateScopeUi = {
  canManageTemplates?: boolean;
  managerUserId?: string | null;
  mode?: string | null;
};

type TemplateSlot = {
  key: string;
  title: string;
  description: string;
  templateKind: 'LETTER' | 'EXHIBIT';
  letterType: 'DISPUTE' | 'LATE_PAYMENT' | '';
  exhibitKind: 'FCRA' | 'AFFIDAVIT' | 'ATTACHMENT' | 'FTC' | '';
  accepts: string;
  expected: string;
};

const templateSlots: TemplateSlot[] = [
  { key: 'DISPUTE', title: 'Dispute Letter', description: 'Main dispute letter template for the selected round.', templateKind: 'LETTER', letterType: 'DISPUTE', exhibitKind: '', accepts: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', expected: 'DOCX' },
  { key: 'LATE_PAYMENT', title: 'Late Payment Letter', description: 'Late payment correction letter template for the selected round.', templateKind: 'LETTER', letterType: 'LATE_PAYMENT', exhibitKind: '', accepts: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', expected: 'DOCX' },
  { key: 'FCRA', title: 'FCRA Supporting Document', description: 'PDF supporting document used with generated dispute packets.', templateKind: 'EXHIBIT', letterType: '', exhibitKind: 'FCRA', accepts: '.pdf,application/pdf', expected: 'PDF' },
  { key: 'AFFIDAVIT', title: 'Affidavit Template', description: 'DOCX affidavit template with manager-approved wording.', templateKind: 'EXHIBIT', letterType: '', exhibitKind: 'AFFIDAVIT', accepts: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', expected: 'DOCX' },
  { key: 'ATTACHMENT', title: 'Attachment PDF', description: 'Static PDF attachment template for packet assembly.', templateKind: 'EXHIBIT', letterType: '', exhibitKind: 'ATTACHMENT', accepts: '.pdf,application/pdf', expected: 'PDF' },
  { key: 'FTC', title: 'FTC Template', description: 'DOCX FTC-style supporting template for the selected round.', templateKind: 'EXHIBIT', letterType: '', exhibitKind: 'FTC', accepts: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', expected: 'DOCX' }
];

function slotKeyForAsset(asset: TemplateAsset) {
  return asset.template_kind === 'LETTER' ? String(asset.letter_type || '') : String(asset.exhibit_kind || '');
}

function statusLabel(loading: boolean, error: string | null, canManage?: boolean) {
  if (loading) return 'Checking';
  if (error) return 'Needs check';
  return canManage ? 'Ready to upload' : 'Read only';
}

function activeAssetLabel(asset: TemplateAsset | null) {
  if (!asset) return 'No active template';
  const version = asset.version_number ? `v${asset.version_number}` : 'Active';
  return `${version} · ${asset.original_filename || 'Template file'}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not uploaded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not uploaded';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function validationSummary(asset: TemplateAsset | null) {
  if (!asset?.validation_json) return 'Template has not been validated yet.';
  const warnings = asset.validation_json.warnings?.length || 0;
  const errors = asset.validation_json.errors?.length || 0;
  const missing = (asset.validation_json.missingFields?.length || 0) + (asset.validation_json.unknownRequiredFields?.length || 0);
  if (errors) return `${errors} validation error(s) need attention.`;
  if (missing) return `${missing} required field(s) need mapping in Template Studio.`;
  if (warnings) return `${warnings} warning(s) found. Review before release.`;
  return 'Validated and ready for Template Studio review.';
}

function payloadData(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  return (record.data && typeof record.data === 'object' ? record.data : record) as Record<string, unknown>;
}

function messageFromPayload(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  const nestedError = record.error && typeof record.error === 'object' ? record.error as Record<string, unknown> : null;
  return String(record.message || nestedError?.message || record.error || fallback);
}

export default function TemplateRoundOnlyLibrary() {
  const [round, setRound] = useState<Round>('1st Round');
  const [assets, setAssets] = useState<TemplateAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [scope, setScope] = useState<ManagerTemplateScopeUi | null>(null);
  const [storage, setStorage] = useState<TemplateStorageState>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const assetsBySlot = useMemo(() => {
    const map = new Map<string, TemplateAsset>();
    assets.forEach((asset) => {
      const key = slotKeyForAsset(asset);
      if (key && !map.has(key)) map.set(key, asset);
    });
    return map;
  }, [assets]);

  const loadRound = useCallback(async (selectedRound: Round) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/template-assets?round=${encodeURIComponent(selectedRound)}&t=${Date.now()}`, { cache: 'no-store', headers: { accept: 'application/json', 'cache-control': 'no-store' } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFromPayload(payload, 'Could not verify manager templates.'));
      const data = payloadData(payload);
      setScope(data?.managerTemplateScope as ManagerTemplateScopeUi | null || null);
      setStorage(data?.templateStorage as TemplateStorageState || null);
      setAssets(Array.isArray(data?.assets) ? data.assets as TemplateAsset[] : []);
    } catch (error) {
      setScope(null);
      setStorage(null);
      setAssets([]);
      setLoadError(error instanceof Error ? error.message : 'Could not verify manager templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRound(round); }, [round, loadRound]);

  async function uploadTemplate(event: FormEvent<HTMLFormElement>, slot: TemplateSlot) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem(`file-${slot.key}`) as HTMLInputElement | null;
    const file = input?.files?.[0] || null;
    if (!file) {
      setNotice({ tone: 'error', message: `Choose a ${slot.expected} file for ${slot.title}.` });
      return;
    }
    setBusyKey(`upload-${slot.key}`);
    setNotice({ tone: 'info', message: `Uploading ${slot.title}...` });
    try {
      const formData = new FormData();
      formData.set('round', round);
      formData.set('templateKind', slot.templateKind);
      formData.set('letterType', slot.letterType);
      formData.set('exhibitKind', slot.exhibitKind);
      formData.set('file', file);
      const response = await fetch('/api/template-assets', { method: 'POST', body: formData, headers: { accept: 'application/json', 'x-template-upload': 'workspace' } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFromPayload(payload, 'Template upload failed.'));
      setNotice({ tone: 'success', message: messageFromPayload(payload, `${slot.title} saved as active template.`) });
      form.reset();
      await loadRound(round);
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Template upload failed.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function removeTemplate(slot: TemplateSlot) {
    setBusyKey(`delete-${slot.key}`);
    setNotice({ tone: 'info', message: `Removing ${slot.title}...` });
    try {
      const response = await fetch('/api/template-assets', {
        method: 'DELETE',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'x-template-upload': 'workspace' },
        body: JSON.stringify({ round, templateKind: slot.templateKind, letterType: slot.letterType, exhibitKind: slot.exhibitKind })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFromPayload(payload, 'Template removal failed.'));
      setNotice({ tone: 'success', message: messageFromPayload(payload, `${slot.title} removed.`) });
      await loadRound(round);
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Template removal failed.' });
    } finally {
      setBusyKey(null);
    }
  }

  const canManage = scope?.canManageTemplates === true;
  const uploadedCount = templateSlots.filter((slot) => assetsBySlot.has(slot.key)).length;

  return <section className="template-round-only-library template-library-upload-workspace" aria-label="Template Library upload workspace" data-template-library-minimal="upload-enabled">
    <header className="template-round-only-heading template-library-command-card">
      <div>
        <p className="eyebrow">Manager-approved reusable templates</p>
        <h2>Template Library</h2>
        <p>Choose a round, upload the required manager template files, and keep one active version for each slot.</p>
      </div>
      <div className="template-library-status-stack">
        <span className={`template-round-only-status ${loadError ? 'error' : loading ? 'loading' : 'ready'}`}>{statusLabel(loading, loadError, canManage)}</span>
        <small>{uploadedCount}/{templateSlots.length} active for {round}</small>
      </div>
    </header>

    <div className="template-library-layout-grid">
      <aside className="template-library-round-panel" aria-label="Round selector">
        <strong>Round</strong>
        <div className="template-round-selection-grid compact">
          {rounds.map((item, index) => <button type="button" key={item} className={`template-round-choice ${item === round ? 'current' : ''}`} onClick={() => { setRound(item); setNotice(null); }}>
            <span className="template-choice-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="template-choice-copy"><strong>{item}</strong><small>{item === round ? 'Current round' : 'Select round'}</small></span>
          </button>)}
        </div>
        <div className="template-library-storage-note">
          <span>Storage</span>
          <strong>{storage?.mode || 'Manager template storage'}</strong>
          {storage?.warning ? <small>{storage.warning}</small> : <small>Active versions sync to assigned Disputer workspaces.</small>}
        </div>
      </aside>

      <div className="template-library-upload-panel">
        {notice ? <p className={`template-library-notice ${notice.tone}`}>{notice.message}</p> : null}
        {loadError ? <p className="template-round-only-error">{loadError}</p> : null}
        {!canManage && !loading && !loadError ? <p className="template-library-notice error">This account can view templates but cannot upload manager template versions.</p> : null}
        <div className="template-upload-slot-grid">
          {templateSlots.map((slot) => {
            const asset = assetsBySlot.get(slot.key) || null;
            const uploadBusy = busyKey === `upload-${slot.key}`;
            const deleteBusy = busyKey === `delete-${slot.key}`;
            return <article key={slot.key} className={`template-upload-slot-card ${asset ? 'ready' : 'missing'}`}>
              <div className="template-upload-slot-copy">
                <span>{slot.expected}</span>
                <strong>{slot.title}</strong>
                <small>{slot.description}</small>
              </div>
              <div className="template-upload-active-state">
                <strong>{activeAssetLabel(asset)}</strong>
                <small>{asset ? `Updated ${formatDate(asset.updated_at || asset.created_at)}` : 'Upload a file to activate this slot.'}</small>
                <em>{validationSummary(asset)}</em>
              </div>
              <form className="template-upload-form" onSubmit={(event) => void uploadTemplate(event, slot)}>
                <input type="hidden" name="round" value={round} />
                <input type="hidden" name="templateKind" value={slot.templateKind} />
                <input type="hidden" name="letterType" value={slot.letterType} />
                <input type="hidden" name="exhibitKind" value={slot.exhibitKind} />
                <label>
                  <span>Replace active file</span>
                  <input name={`file-${slot.key}`} type="file" accept={slot.accepts} disabled={!canManage || Boolean(busyKey)} />
                </label>
                <div className="template-upload-actions">
                  <button type="submit" className="admin-action-button primary" disabled={!canManage || Boolean(busyKey)}>{uploadBusy ? 'Uploading...' : asset ? 'Replace template' : 'Upload template'}</button>
                  <button type="button" className="admin-action-button" disabled={!canManage || !asset || Boolean(busyKey)} onClick={() => void removeTemplate(slot)}>{deleteBusy ? 'Removing...' : 'Remove'}</button>
                </div>
              </form>
            </article>;
          })}
        </div>
      </div>
    </div>
  </section>;
}
