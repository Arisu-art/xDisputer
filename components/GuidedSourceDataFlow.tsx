'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import SupportingDocumentsSetup from './SupportingDocumentsSetup';
import { bureauInfo, bureaus, type Bureau, type LetterRoute, type ParsedSource, type SourceItem } from '../lib/letter-engine';
import type { PacketAssets } from '../lib/packet-assets';
import type { TemplateFieldContract } from '../lib/template-contracts';
import { packetOrderText } from '../lib/workflow-framework';
import { runSharedTransition } from '../lib/shared-transition';

type Stage = 'SOURCE' | 'REVIEW' | 'EVIDENCE' | 'GENERATE';
type SourceMethod = 'CHOOSE' | 'UPLOAD' | 'PASTE';
type SourceDraftSnapshot = { text: string; normalized: boolean; label: string; capturedAt: string };
type PendingImport = { text: string; action: string } | null;

type Props = {
  source: string;
  originalSource: string;
  recoveryDraft: SourceDraftSnapshot | null;
  normalized: boolean;
  verified: boolean;
  parsed: ParsedSource;
  routes: LetterRoute[];
  sourceWarnings: Array<{ message: string }>;
  evidenceKey: string;
  evidence: PacketAssets;
  canGenerate: boolean;
  /** Legacy prop kept for compatibility while older workspace repairs are removed. */
  generationBlockers?: string[];
  missingLetters: string[];
  missingInsertCount: number;
  affidavitRequired: boolean;
  customFields: TemplateFieldContract[];
  strict: boolean;
  busy: boolean;
  onImportSource: (value: string, action: string) => void;
  onStandardizeDraft: (value: string) => void;
  onStartManualDraft: (value: string) => void;
  onEditSource: (value: string) => void;
  onSourceFieldChange: (field: string, value: string) => void;
  onRestoreOriginal: () => void;
  onRecoverDraft: () => void;
  onEvidenceChanged: (assets: PacketAssets) => void;
  onMessage: (message: string) => void;
  onGenerate: () => void | Promise<void>;
  /** Deprecated transition props: accepted until the parent controller is decomposed, never used here. */
  ftcRequired?: boolean;
  onFtcAccountChange?: (...args: any[]) => void;
  onFtcAccountAdd?: () => void;
  onFtcAccountRemove?: (...args: any[]) => void;
  onFtcAccountSeed?: () => void;
};

const BLANK_SOURCE = 'NAME:\nFIRST NAME:\nMIDDLE NAME:\nLAST NAME:\nADDRESS:\nCOUNTRY: USA\nDOB:\nSSN:\nPHONE:\nEMAIL:\nAFFIDAVIT STATE:\nAFFIDAVIT COUNTY:\n\nDISPUTE ACCOUNTS\n\nTRANSUNION\n\nEQUIFAX\n\nEXPERIAN\n\nHARD INQUIRIES\n\nLATE PAYMENTS\n';

function SourceStageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <header className="source-progressive-command simplified-source-command"><div className="source-progressive-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>{children && <div className="source-command-actions">{children}</div>}</header>;
}

function TextField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className={required && !value.trim() ? 'missing' : ''}><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function CalculatedField({ label, value }: { label: string; value: string }) {
  return <label><span>{label}</span><input value={value} readOnly aria-readonly="true" /></label>;
}

function savedTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function accountNameOf(displayText: string) {
  return displayText.match(/^Account Name:\s*(.+)$/im)?.[1]?.trim() || displayText.split('\n')[0]?.trim() || 'Review item';
}

function accountNumberOf(displayText: string) {
  return displayText.match(/^Account Number:\s*(.+)$/im)?.[1]?.trim() || '';
}

function accountMeta(item: SourceItem) {
  const name = accountNameOf(item.displayText);
  const number = accountNumberOf(item.displayText);
  return { name, number };
}

function itemLabel(kind: 'dispute' | 'inquiry' | 'late') {
  if (kind === 'dispute') return 'Dispute account';
  if (kind === 'late') return 'Late payment';
  return 'Hard inquiry';
}

function PacketReviewSection({ title, kind, items }: { title: string; kind: 'dispute' | 'inquiry' | 'late'; items: SourceItem[] }) {
  if (!items.length) return <section className="packet-review-empty"><div><strong>{title}</strong><span>No items detected</span></div></section>;

  return <section className={`packet-review-section ${kind}`}>
    <header><strong>{title}</strong><span>{items.length} item{items.length === 1 ? '' : 's'}</span></header>
    <div className="packet-review-item-list">
      {items.map((item, index) => {
        const meta = accountMeta(item);
        return <article className="packet-review-item" key={`${kind}-${index}-${item.displayText.slice(0, 24)}`}>
          <div className="packet-review-item-index">{String(index + 1).padStart(2, '0')}</div>
          <div className="packet-review-item-copy">
            <strong>{meta.name}</strong>
            <small>{meta.number ? `Account Number: ${meta.number}` : item.displayText}</small>
          </div>
          <span>{itemLabel(kind)}</span>
        </article>;
      })}
    </div>
  </section>;
}

export default function GuidedSourceDataFlow({ source, originalSource, recoveryDraft, normalized, verified, parsed, routes, sourceWarnings, evidenceKey, evidence, canGenerate, missingLetters, missingInsertCount, affidavitRequired, customFields, strict, busy, onImportSource, onStandardizeDraft, onStartManualDraft, onEditSource, onSourceFieldChange, onRestoreOriginal, onRecoverDraft, onEvidenceChanged, onMessage, onGenerate }: Props) {
  const [stage, setStage] = useState<Stage>('SOURCE');
  const [method, setMethod] = useState<SourceMethod>(source ? 'PASTE' : 'CHOOSE');
  const [pendingImport, setPendingImport] = useState<PendingImport>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const affidavitPanel = useRef<HTMLElement | null>(null);

  const evidenceReady = evidence.supporting.length > 0;
  const affidavitReady = !affidavitRequired || Boolean(parsed.affidavitState.trim() && parsed.affidavitCounty.trim());
  const customReady = customFields.every((field) => !field.required || Boolean(parsed.templateFields[field.key]?.trim()));
  const blocked = !canGenerate || !evidenceReady || !affidavitReady || !customReady || (strict && missingLetters.length > 0) || !scopeConfirmed;
  const showStage = (next: Stage) => runSharedTransition(() => setStage(next), 'stage');

  const reviewTotals = useMemo(() => {
    const dispute = bureaus.reduce((sum, bureau) => sum + parsed.dispute[bureau].length, 0);
    const inquiry = bureaus.reduce((sum, bureau) => sum + parsed.inquiry[bureau].length, 0);
    const late = bureaus.reduce((sum, bureau) => sum + parsed.late[bureau].length, 0);
    const activeBureaus = bureaus.filter((bureau) => parsed.dispute[bureau].length || parsed.inquiry[bureau].length || parsed.late[bureau].length).length;
    return { dispute, inquiry, late, activeBureaus, routes: routes.length };
  }, [parsed, routes.length]);

  useEffect(() => {
    setStage('SOURCE');
    setMethod(source ? 'PASTE' : 'CHOOSE');
    setPendingImport(null);
    setConfirmRestore(false);
    setValidationMessage('');
    setScopeConfirmed(false);
  }, [evidenceKey, source]);

  async function uploadFile(file?: File) {
    if (!file) return;
    const value = await file.text();
    setMethod('UPLOAD');
    if (source.trim()) {
      setPendingImport({ text: value, action: 'Uploaded Notepad/TXT' });
      return;
    }
    onImportSource(value, 'Uploaded Notepad/TXT');
  }

  function confirmImport() {
    if (!pendingImport) return;
    onImportSource(pendingImport.text, pendingImport.action);
    setPendingImport(null);
    setConfirmRestore(false);
    setValidationMessage('');
    setScopeConfirmed(false);
  }

  function requestRestore() {
    if (source.trim() === originalSource.trim()) {
      onMessage('The editor is already showing the imported original.');
      return;
    }
    setConfirmRestore(true);
    setPendingImport(null);
  }

  function performRestore() {
    onRestoreOriginal();
    setConfirmRestore(false);
    setValidationMessage('');
    setScopeConfirmed(false);
  }

  function lockSource() {
    if (!verified) {
      const message = 'Standardize the working Notepad draft before reviewing packet scope.';
      setValidationMessage(message);
      onMessage(message);
      return;
    }
    if (!affidavitReady) {
      const message = 'Affidavit execution jurisdiction could not be mapped from the current address.';
      setValidationMessage(message);
      affidavitPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onMessage(message);
      return;
    }
    if (!customReady) {
      const message = 'Complete the additional template fields required by the configured DOCX template.';
      setValidationMessage(message);
      onMessage(message);
      return;
    }
    if (!routes.length) {
      const message = 'No dispute, inquiry, or late-payment routes were detected. Review the Notepad headings before continuing.';
      setValidationMessage(message);
      onMessage(message);
      return;
    }
    setValidationMessage('');
    setScopeConfirmed(false);
    showStage('REVIEW');
    onMessage('Source data locked. Review and confirm packet scope by bureau.');
  }

  function confirmScope() {
    setScopeConfirmed(true);
    showStage('EVIDENCE');
    onMessage('Packet scope confirmed. Upload Supporting Documents evidence to continue.');
  }

  function confirmEvidence() {
    if (!evidenceReady) {
      onMessage('Supporting Documents are required. Upload at least one evidence image to continue.');
      return;
    }
    showStage('GENERATE');
    onMessage('Supporting Documents confirmed. Review routes and generate the package.');
  }

  return <div className="guided-source-workspace progressive-source-workspace">
    {stage === 'SOURCE' && method === 'CHOOSE' && !source && <section className="panel source-progressive-stage source-intake-stage shared-stage-surface" style={{ viewTransitionName: 'source-work-stage' }}>
      <SourceStageHeader eyebrow="Step 01 · Source Notepad" title="Upload or review client Notepad data" description="Upload a Notepad/TXT source file into a clean canvas. The original is protected, the working draft stays editable, and FTC fields are not added during normalization." />
      <div className="source-method-grid">
        <label className="source-method-card source-method-primary"><span className="source-method-number">01</span><strong>Upload Notepad/TXT</strong><p>Drop in the client source file, preserve the original, then clean only the fields needed for dispute packet generation.</p><span className="source-method-action">Choose file →</span><input type="file" accept=".txt,text/plain" onChange={(event) => { void uploadFile(event.target.files?.[0]); event.target.value = ''; }} /></label>
        <button type="button" className="source-method-card" onClick={() => { setMethod('PASTE'); onStartManualDraft(BLANK_SOURCE); }}><span className="source-method-number">02</span><strong>Manual draft</strong><p>Begin with the active packet schema, then standardize only when ready.</p><span className="source-method-action">Open editor →</span></button>
      </div>
      <div className="source-stage-note"><strong>Protected</strong><span>Replacing or restoring source data stores a recovery copy before changing your active draft.</span></div>
    </section>}

    {stage === 'SOURCE' && (method !== 'CHOOSE' || Boolean(source)) && <section className="panel source-progressive-stage source-editor-stage shared-stage-surface" style={{ viewTransitionName: 'source-work-stage' }}>
      <SourceStageHeader eyebrow="Step 01 · Source Notepad" title="Review normalized Notepad canvas" description="Review the normalized source canvas. FTC fields are intentionally excluded from Notepad normalization for now."><div className="source-header-controls"><span className={`pill ${verified ? 'success' : 'neutral'}`}>{verified ? 'Standardized draft' : 'Editing draft'}</span>{source && !normalized && <button type="button" className="action-button" onClick={() => onStandardizeDraft(source)}>Standardize</button>}{recoveryDraft && <button type="button" className="secondary-button" onClick={onRecoverDraft} title={recoveryDraft.label}>Recover draft</button>}{originalSource && <button type="button" className="secondary-button" onClick={requestRestore}>Restore original</button>}</div></SourceStageHeader>
      <div className="source-editor-layout"><aside className="source-editor-tools compact"><div className="source-input-summary"><p className="eyebrow">Source status</p><strong>{originalSource ? 'Protected original retained' : 'Manual working draft'}</strong><small>{recoveryDraft ? `Recovery saved ${savedTime(recoveryDraft.capturedAt)}` : verified ? 'Ready for validation' : 'Standardize after editing'}</small></div><label className="source-tool-upload"><span>Import new Notepad/TXT</span><input className="file-input" type="file" accept=".txt,text/plain" onChange={(event) => { void uploadFile(event.target.files?.[0]); event.target.value = ''; }} /></label>{source && !originalSource && <button type="button" className="secondary-button" onClick={() => onImportSource(source, 'Saved manual draft as original')}>Protect this draft</button>}{verified && <div className="source-record-summary"><p className="eyebrow">Detected client</p><strong>{parsed.name}</strong><span>{routes.length} output route{routes.length === 1 ? '' : 's'} detected</span></div>}</aside><textarea className="guided-source-text source-focused-text" value={source} onChange={(event) => { setValidationMessage(''); setScopeConfirmed(false); onEditSource(event.target.value); }} placeholder="Type or paste Notepad/TXT source data here. Pasting edits this draft and does not replace the protected original." /></div>
      {pendingImport && <div className="source-safety-confirm" role="alertdialog" aria-label="Confirm source replacement"><div><strong>Replace working source with this Notepad/TXT?</strong><p>Your current working draft will be saved as a recovery copy before the new source is imported. Existing generated outputs will be cleared because source data changed.</p></div><div><button type="button" className="secondary-button" onClick={() => setPendingImport(null)}>Cancel</button><button type="button" className="action-button" onClick={confirmImport}>Save draft and import</button></div></div>}
      {confirmRestore && <div className="source-safety-confirm" role="alertdialog" aria-label="Confirm restore original source"><div><strong>Restore the protected imported original?</strong><p>Your current draft will first be stored as a recovery copy. Supporting evidence stays attached; generated output is cleared until you regenerate from the restored source.</p></div><div><button type="button" className="secondary-button" onClick={() => setConfirmRestore(false)}>Cancel</button><button type="button" className="action-button" onClick={performRestore}>Save draft and restore</button></div></div>}
      {affidavitRequired && <section ref={affidavitPanel} className={`affidavit-source-panel ${affidavitReady ? 'ready' : 'required'}`} aria-label="Affidavit information"><header><div><p className="eyebrow">Affidavit information</p><h3>Execution jurisdiction</h3><p>Mapped automatically from the current address: state and county are inserted into the generated affidavit.</p></div><span>{affidavitReady ? 'Ready' : 'Review'}</span></header><div className="affidavit-source-grid"><CalculatedField label="State of · mapped from state" value={parsed.affidavitState} /><CalculatedField label="County of · mapped from city" value={parsed.affidavitCounty} /><article><span>Mapped from source data</span><strong>{parsed.name || 'Client name unavailable'}</strong><small>{parsed.address.join(' ') || 'Address unavailable'} · SSN {parsed.ssn || 'Unavailable'}</small></article></div></section>}
      {customFields.length > 0 && <section className={`custom-template-source-panel ${customReady ? 'ready' : 'required'}`} aria-label="Additional template fields"><header><div><p className="eyebrow">Template fields</p><h3>Additional document values</h3><p>These inputs were detected from placeholders in your configured DOCX template.</p></div><span>{customReady ? 'Ready' : 'Required'}</span></header><div className="custom-template-field-grid">{customFields.map((field) => <TextField key={field.key} label={field.label} value={parsed.templateFields[field.key] || ''} onChange={(value) => onSourceFieldChange(`TEMPLATE FIELD ${field.key}`, value)} required={field.required} />)}</div></section>}
      {validationMessage && <p className="workflow-validation-message" role="alert">{validationMessage}</p>}
      <footer className="guided-stage-footer source-progressive-footer"><span>{!affidavitReady ? 'Review affidavit jurisdiction before continuing.' : !customReady ? 'Complete template-required fields to continue.' : verified ? 'Working draft is standardized. Lock to review packet scope.' : 'Standardize the Notepad draft to continue.'}</span><button type="button" className="action-button" disabled={!source.trim()} onClick={lockSource}>Lock Source Data</button></footer>
    </section>}

    {stage === 'REVIEW' && <section className="panel source-progressive-stage packet-review-stage shared-stage-surface" style={{ viewTransitionName: 'source-work-stage' }}>
      <SourceStageHeader eyebrow="Step 02 · Review packet scope" title="Confirm accounts by bureau" description="Review what will be inserted into the generated letters before packet generation."><div className="packet-review-metrics"><span>{reviewTotals.activeBureaus} bureau group{reviewTotals.activeBureaus === 1 ? '' : 's'}</span><span>{reviewTotals.dispute} dispute</span><span>{reviewTotals.inquiry} inquiry</span><span>{reviewTotals.late} late</span></div></SourceStageHeader>
      <div className="packet-review-client-card"><div><p className="eyebrow">Detected client</p><h3>{parsed.name || 'Client name unavailable'}</h3><p>{parsed.address.join(' ') || 'Address unavailable'} · DOB {parsed.dob || 'N/A'} · SSN {parsed.ssn || 'N/A'}</p></div><strong>{reviewTotals.routes} output route{reviewTotals.routes === 1 ? '' : 's'}</strong></div>
      <div className="packet-review-grid">{bureaus.map((bureau) => <article className="packet-review-bureau-card" key={bureau}><header><div><span>{bureauInfo[bureau].name}</span><h3>{bureau}</h3></div><strong>{parsed.dispute[bureau].length + parsed.inquiry[bureau].length + parsed.late[bureau].length} item{parsed.dispute[bureau].length + parsed.inquiry[bureau].length + parsed.late[bureau].length === 1 ? '' : 's'}</strong></header><PacketReviewSection title="For dispute letter" kind="dispute" items={parsed.dispute[bureau]} /><PacketReviewSection title="Hard inquiries" kind="inquiry" items={parsed.inquiry[bureau]} /><PacketReviewSection title="Late payment letter" kind="late" items={parsed.late[bureau]} /></article>)}</div>
      <footer className="packet-review-footer"><button type="button" className="secondary-button" onClick={() => showStage('SOURCE')}>Back to Notepad</button><button type="button" className="action-button" onClick={confirmScope}>Confirm packet scope</button></footer>
    </section>}

    {stage === 'EVIDENCE' && <section className="guided-evidence-stage source-progressive-evidence required-evidence-stage shared-stage-surface" style={{ viewTransitionName: 'source-work-stage' }}><SourceStageHeader eyebrow="Step 03 · Required evidence" title="Supporting documents" description="Upload and arrange evidence for packet position 02. The resulting PDF is included in every applicable final packet."><div className="source-stage-actions"><button type="button" className="secondary-button" onClick={() => showStage('REVIEW')}>Back to Review</button><button type="button" className="action-button" disabled={!evidenceReady} onClick={confirmEvidence}>Continue to Generate</button></div></SourceStageHeader>{evidenceKey && <SupportingDocumentsSetup embedded storageKey={evidenceKey} clientName={parsed.name} onChanged={onEvidenceChanged} onMessage={onMessage} />}</section>}

    {stage === 'GENERATE' && <section className="panel source-progressive-stage routes-stage generation-stage shared-stage-surface" style={{ viewTransitionName: 'source-work-stage' }}><SourceStageHeader eyebrow="Step 04 · Generate" title="Review and generate packets" description={`Final dispute packet order: ${packetOrderText('DISPUTE')}.`}><span className="pill neutral">{routes.length} output{routes.length === 1 ? '' : 's'}</span></SourceStageHeader><div className="guided-route-grid">{bureaus.map((bureau) => <article className="guided-route-card" key={bureau}><strong>{bureau}</strong><div><span>{parsed.dispute[bureau].length} dispute</span><span>{parsed.inquiry[bureau].length} inquiry</span><span>{parsed.late[bureau].length} late</span></div></article>)}</div>{(sourceWarnings.length > 0 || missingLetters.length > 0 || !affidavitReady || !customReady || !scopeConfirmed) && <div className="source-review"><strong>Needs attention</strong>{!scopeConfirmed && <p>Confirm packet scope before generation.</p>}{missingLetters.length > 0 && <p>Required letter template missing: {missingLetters.join(', ')}.</p>}{!affidavitReady && <p>Affidavit address-mapped execution jurisdiction requires review.</p>}{!customReady && <p>Additional fields detected from configured templates must be completed.</p>}{sourceWarnings.slice(0, 3).map((warning, index) => <p key={index}>{warning.message}</p>)}</div>}<div className="guided-generation-summary"><span className="complete">{evidence.supporting.length} evidence file(s) ready</span><span className={affidavitReady ? 'complete' : ''}>Affidavit {affidavitReady ? 'mapped' : 'needs review'}</span><span className={missingInsertCount === 0 ? 'complete' : ''}>Packet inserts {missingInsertCount === 0 ? 'ready' : 'missing'}</span><span className="complete">Scope confirmed</span></div><footer className="guided-stage-footer generate-footer"><button type="button" className="secondary-button" onClick={() => showStage('EVIDENCE')}>Back to Evidence</button><button type="button" className="action-button" aria-disabled={blocked || busy} disabled={busy} onClick={() => void onGenerate()}>{busy ? 'Generating packet…' : 'Generate Ordered Review Package'}</button></footer></section>}
  </div>;
}
