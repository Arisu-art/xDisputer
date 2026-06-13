'use client';

import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import CasePipelineStatus from './CasePipelineStatus';
import ClientCenterWorkspace from './ClientCenterWorkspace';
import DashboardOperationsWorkspace from './DashboardOperationsWorkspace';
import OutputLimitResetChip from './OutputLimitResetChip';
import GuidedSourceDataFlow from './GuidedSourceDataFlow';
import GenerationPreflightChecklist from './GenerationPreflightChecklist';
import OutputReviewWorkspace, { type ReviewOutput } from './OutputReviewWorkspace';
import TemplateProgressiveWorkspace from './TemplateProgressiveWorkspace';
import WorkspaceSettingsPanel from './WorkspaceSettingsPanel';
import WorkspacePortabilityPanel from './WorkspacePortabilityPanel';
import { clearOperationsRecords, exportOperationsRecords, loadClientCases, loadFilings, markFilingSent, upsertClientCase, type ClientCaseRecord, type ClientCaseStatus, type FilingRecord } from '../lib/client-operations-store';
import { addOrderedPacketFolders } from '../lib/ordered-packet-archive';
import { isDocx, renderReferenceDisputeDocx } from '../lib/docx-renderer';
import { highlightTextInDocx } from '../lib/docx-review-marker';
import { renderLatePaymentReference } from '../lib/late-reference-renderer';
import { generateFtcWorkflowOutput } from '../lib/ftc-workflow';
import { resolveAffidavitJurisdiction } from '../lib/affidavit-jurisdiction';
import { bureauInfo, bureaus, createNormalizedSourceCopy, detectRoutes, parseSource, type Bureau, type LetterRoute, type LetterType } from '../lib/letter-engine';
import { loadPacketAssets, type PacketAssets } from '../lib/packet-assets';
import { defaultReferences, loadReferenceMeta, readReferenceFile, removeReferenceFile, saveReferenceFile, saveReferenceMeta, recoverReferenceMetaFromFiles, type LetterReference, type Round } from '../lib/reference-store';
import { renderMappedAppendix } from '../lib/supplemental-template-renderer';
import { unresolvedCustomTemplateFields } from '../lib/template-contracts';
import { exhibitTitles, loadTemplateExhibits, readTemplateExhibit, type ExhibitKind, type TemplateExhibits } from '../lib/template-exhibits';
import { defaultWorkspacePreferences, loadWorkspacePreferences, saveWorkspacePreferences, type WorkspacePreferences } from '../lib/workspace-preferences';
import { packetOrderLabels, isFtcEnabled } from '../lib/workflow-framework';
import { activeWorkflowDiagnostics, assessRouteCoverage, requiredGenerationFailureMessage } from '../lib/workflow-execution';
import { evaluateGenerationPreflight, preflightFailureMessage } from '../lib/preflight-validation';
import { buildCasePipeline, nextCaseAction } from '../lib/case-pipeline';
import { resolveUxVisibility } from '../lib/ux-visibility-contract';
import { buildGenerationManifest, generationManifestText, normalizeGeneratedOutputForManifest, type GenerationManifest } from '../lib/generation-manifest';

type Panel = 'Dashboard' | 'Templates' | 'Source Data' | 'Outputs' | 'Client Center' | 'Settings';
type SourceDraftSnapshot = { text: string; normalized: boolean; label: string; capturedAt: string };
type StatusTone = 'info' | 'success' | 'error';

type RegistryTemplateAsset = {
  id: string;
  round_label: Round;
  template_kind: 'LETTER' | 'EXHIBIT';
  letter_type: LetterType | null;
  exhibit_kind: ExhibitKind | null;
  original_filename: string;
  mime_type: string;
  file_size: number | null;
  contract_json: unknown;
  validation_json?: Record<string, unknown> | null;
  content_hash?: string | null;
  version_number?: number | null;
};

const panels: Panel[] = ['Dashboard', 'Templates', 'Source Data', 'Outputs', 'Client Center', 'Settings'];
const labels: Record<LetterType, string> = { DISPUTE: 'Dispute Letter', LATE_PAYMENT: 'Late Payment Letter' };
const requirements: ExhibitKind[] = isFtcEnabled() ? ['FCRA', 'AFFIDAVIT', 'ATTACHMENT', 'FTC'] : ['FCRA', 'AFFIDAVIT', 'ATTACHMENT'];
const emptyEvidence = (): PacketAssets => ({ supporting: [], legalPdf: null });
const emptyTemplates = (): TemplateExhibits => ({ FCRA: null, AFFIDAVIT: null, ATTACHMENT: null, FTC: null });
const dateNow = () => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }).format(new Date());
const clean = (value: string) => (value || 'CLIENT').replace(/[\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
const order = (type: LetterType) => packetOrderLabels(type);
const GENERATION_TIMEOUT_MS = 90_000;
const ARCHIVE_TIMEOUT_MS = 120_000;

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
async function withTimeout<T>(phase: string, operation: () => Promise<T>, timeoutMs = GENERATION_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${phase} timed out after ${Math.round(timeoutMs / 1000)} seconds.`)), timeoutMs); })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'An unknown error occurred.';
}

function toTemplateFile(value: Blob, name: string): File {
  if (value instanceof File) return value;
  return new File([value], name, {
    type: value.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    lastModified: Date.now()
  });
}

export default function LetterGeneratorWorkspaceV2({ accountEmail, accountRole = 'client' }: { accountEmail?: string | null; accountRole?: 'admin' | 'client' }) {
  const [panel, setPanel] = useState<Panel>('Dashboard');
  const [round, setRound] = useState<Round>('1st Round');
  const [preferences, setPreferences] = useState<WorkspacePreferences>(defaultWorkspacePreferences);
  const [references, setReferences] = useState<LetterReference[]>(() => loadReferenceMeta());
  const [source, setSource] = useState('');
  const [originalSource, setOriginalSource] = useState('');
  const [recoveryDraft, setRecoveryDraft] = useState<SourceDraftSnapshot | null>(null);
  const [normalized, setNormalized] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [cases, setCases] = useState<ClientCaseRecord[]>([]);
  const [filings, setFilings] = useState<FilingRecord[]>([]);
  const [evidence, setEvidence] = useState<PacketAssets>(emptyEvidence);
  const [templates, setTemplates] = useState<TemplateExhibits>(emptyTemplates);
  const [registryAssets, setRegistryAssets] = useState<RegistryTemplateAsset[]>([]);
  const [docs, setDocs] = useState<ReviewOutput[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [orderedZip, setOrderedZip] = useState<{ name: string; blob: Blob } | null>(null);
  const [docDate, setDocDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [generateAttempted, setGenerateAttempted] = useState(false);
  const [status, setStatus] = useState('Configure packet templates, then load a client source file.');
  const [statusTone, setStatusTone] = useState<StatusTone>('info');

  useEffect(() => {
    const storedPreferences = loadWorkspacePreferences();
    setPreferences(storedPreferences);
    setRound(storedPreferences.defaultRound);
    setCases(loadClientCases());
    setFilings(loadFilings());
  }, []);
  useEffect(() => saveReferenceMeta(references), [references]);
  useEffect(() => {
    let cancelled = false;
    void recoverReferenceMetaFromFiles()
      .then((next) => { if (!cancelled) setReferences(next); })
      .catch(() => { if (!cancelled) setReferences(loadReferenceMeta()); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => setTemplates(loadTemplateExhibits(round)), [round]);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/template-assets?round=${encodeURIComponent(round)}`)
      .then((response) => response.ok ? response.json() : { assets: [] })
      .then((payload) => {
        if (!cancelled) setRegistryAssets(Array.isArray(payload.assets) ? payload.assets : []);
      })
      .catch(() => {
        if (!cancelled) setRegistryAssets([]);
      });

    return () => { cancelled = true; };
  }, [round]);

  const refs = references.filter((item) => item.round === round);
  const effectiveRefs = useMemo(() => refs.map((slot) => {
    const registryAsset = registryAssets.find((asset) =>
      asset.template_kind === 'LETTER' &&
      asset.letter_type === slot.type
    );

    if (!registryAsset || slot.file) return slot;

    return {
      ...slot,
      file: registryAsset.original_filename,
      size: registryAsset.file_size || undefined,
      contract: registryAsset.contract_json as any,
      assetId: registryAsset.id,
      source: 'SUPABASE_TEMPLATE_ASSET',
      versionNumber: registryAsset.version_number || null,
      contentHash: registryAsset.content_hash || null,
      validationJson: registryAsset.validation_json || null
    };
  }), [refs, registryAssets]);

  const effectiveTemplates = useMemo(() => {
    const next = { ...templates };

    (['FCRA', 'AFFIDAVIT', 'ATTACHMENT', 'FTC'] as ExhibitKind[]).forEach((kind) => {
      const registryAsset = registryAssets.find((asset) =>
        asset.template_kind === 'EXHIBIT' &&
        asset.exhibit_kind === kind
      );

      if (!registryAsset || next[kind]) return;

      next[kind] = {
        id: registryAsset.id,
        kind,
        mode: kind === 'FCRA' || kind === 'ATTACHMENT' ? 'STATIC_PDF' : 'GENERATED_DOCX',
        name: registryAsset.original_filename,
        type: registryAsset.mime_type,
        size: registryAsset.file_size || 0,
        contract: registryAsset.contract_json as any,
        assetId: registryAsset.id,
        source: 'SUPABASE_TEMPLATE_ASSET',
        versionNumber: registryAsset.version_number || null,
        contentHash: registryAsset.content_hash || null,
        validationJson: registryAsset.validation_json || null
      };
    });

    return next;
  }, [templates, registryAssets]);
  const parsed = useMemo(() => parseSource(source), [source]);
  const routes = useMemo(() => detectRoutes(parsed), [parsed]);
  const verified = normalized && Boolean(parsed.name);
  const evidenceKey = caseId ? `${round}::${caseId}` : '';
  const missingLetters = Array.from(new Set(routes.map((route) => route.type))).filter((type) => !refs.find((item) => item.type === type)?.file);
  const dispute = routes.some((route) => route.type === 'DISPUTE');
  const disputed = bureaus.some((bureau) => parsed.dispute[bureau].length > 0);
  const affidavitRequired = dispute && disputed;
  const affidavitJurisdiction = useMemo(() => resolveAffidavitJurisdiction(parsed), [parsed]);
  const affidavitSource = useMemo(() => ({ ...parsed, address: parsed.address.length ? parsed.address : ['N/A'], affidavitState: affidavitJurisdiction.state, affidavitCounty: affidavitJurisdiction.county }), [parsed, affidavitJurisdiction]);
  const sourceWarnings = [...activeWorkflowDiagnostics(parsed.diagnostics.filter((item) => item.level === 'warning')), ...(affidavitRequired && affidavitJurisdiction.reviewRequired ? [{ message: affidavitJurisdiction.explanation }] : [])];
  const affidavitReady = !affidavitRequired || Boolean(affidavitSource.affidavitState.trim() && affidavitSource.affidavitCounty.trim());
  const activeTemplateContracts = [effectiveTemplates.FCRA, effectiveTemplates.AFFIDAVIT, effectiveTemplates.ATTACHMENT, effectiveTemplates.FTC].map((item) => item?.contract);
  const customFields = unresolvedCustomTemplateFields([...effectiveRefs.map((item) => item.contract), ...activeTemplateContracts]);
  const customReady = customFields.every((item) => !item.required || Boolean(parsed.templateFields[item.key]?.trim()));
  const missingNodes = dispute ? requirements.filter((kind) => !effectiveTemplates[kind]) : [];
  const canGenerate = verified && routes.length > 0;
  const preflight = useMemo(() => evaluateGenerationPreflight({ round, source, normalized, parsed: affidavitRequired ? affidavitSource : parsed, routes, references: effectiveRefs, templates: effectiveTemplates, evidence, affidavitReady, customReady, strictValidation: preferences.strictValidation, preferences }), [source, normalized, parsed, affidavitRequired, affidavitSource, routes, effectiveRefs, effectiveTemplates, evidence, affidavitReady, customReady, preferences]);
  const pipelineStages = useMemo(() => buildCasePipeline({ round, hasCase: Boolean(caseId || parsed.name), clientName: parsed.name, routes, references: effectiveRefs, templates: effectiveTemplates, evidence, preflight, outputCount: docs.length, orderedZipReady: Boolean(orderedZip), reviewedCount: docs.length ? docs.length : 0, downloaded: false, filedCount: filings.length }), [round, caseId, parsed.name, routes, effectiveRefs, effectiveTemplates, evidence, preflight, docs.length, orderedZip, filings.length]);
  const pipelineNextAction = useMemo(() => nextCaseAction(pipelineStages), [pipelineStages]);
  const uxRules = useMemo(() => resolveUxVisibility({ panel, statusTone, hasSource: Boolean(source.trim()), hasPreflightBlockers: preflight.blockers.length > 0, hasPreflightWarnings: preflight.warnings.length > 0, generateAttempted, busy, hasGeneratedOutput: docs.length > 0 }), [panel, statusTone, source, preflight.blockers.length, preflight.warnings.length, generateAttempted, busy, docs.length]);

  useEffect(() => setEvidence(evidenceKey ? loadPacketAssets(evidenceKey) : emptyEvidence()), [evidenceKey]);

  function report(message: string, tone: StatusTone = 'info') { setStatus(message); setStatusTone(tone); }
  function clearOutputs() { setDocs([]); setWarnings([]); setOrderedZip(null); setDocDate(''); setGenerateAttempted(false); }
  async function persistGenerationRun(manifest: GenerationManifest) {
    try {
      const response = await fetch('/api/generation-runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientName: manifest.clientName, round: manifest.round, manifest, status: 'generated' }) });
      const payload = await response.json().catch(() => null);
      if (payload?.entitlement) window.dispatchEvent(new CustomEvent('xdisputer:output-entitlement-updated', { detail: payload.entitlement }));
      if (!response.ok) console.warn('Generation run was not saved.', payload || await response.text());
    } catch (error) { console.warn('Generation run persistence failed.', error); }
  }
  function captureDraft(label: string) { if (source.trim()) setRecoveryDraft({ text: source, normalized, label, capturedAt: new Date().toISOString() }); }
  function saveCase(statusValue: ClientCaseStatus, data: Partial<ClientCaseRecord> = {}) {
    const id = data.id || caseId;
    const name = data.clientName || parsed.name;
    if (!id || !name) return null;
    const previous = cases.find((item) => item.id === id);
    const record: ClientCaseRecord = { id, clientName: name, round, routeCount: routes.length, bureaus: Array.from(new Set(routes.map((route) => route.bureau))), evidenceCount: evidence.supporting.length, editableCount: docs.length, pdfCount: 0, status: statusValue, updatedAt: new Date().toISOString(), ...previous, ...data };
    const next = upsertClientCase(record);
    setCases(next);
    return record;
  }
  function begin() { const id = crypto.randomUUID(); setCaseId(id); setSource(''); setOriginalSource(''); setNormalized(false); clearOutputs(); setPanel('Templates'); report('New case started. Choose or verify templates first.', 'success'); }
  async function uploadRef(slot: LetterReference, file: File) {
    const contract = await saveReferenceFile(slot, file);
    const next = loadReferenceMeta().map((item) => item.id === slot.id ? { ...item, file: file.name, size: file.size, contract } : item);
    setReferences(next);
    clearOutputs(); report(labels[slot.type] + ' uploaded for ' + round + '.', 'success');
  }
  async function removeRef(slot: LetterReference) {
    await removeReferenceFile(slot.id);
    const next = loadReferenceMeta().map((item) => item.id === slot.id ? { ...item, file: '', size: undefined, contract: undefined } : item);
    setReferences(next);
    clearOutputs(); report(labels[slot.type] + ' removed for ' + round + '.');
  }
  function importSource(value: string, action: string) { captureDraft(action); setSource(value); setOriginalSource(value); setNormalized(false); clearOutputs(); setCaseId(crypto.randomUUID()); report(action + ' imported. Standardize it before generation.', 'success'); setPanel('Source Data'); }
  function standardizeDraft(value = source) { const next = createNormalizedSourceCopy(value); setSource(next.text); setNormalized(true); setRecoveryDraft(null); saveCase('SOURCE_LOCKED'); report('Source data standardized and locked for generation.', 'success'); }
  function startManualDraft(value: string) { setCaseId(crypto.randomUUID()); setSource(value); setOriginalSource(value); setNormalized(false); clearOutputs(); report('Manual draft started. Complete the source fields, then standardize.', 'success'); }
  function setLine(field: string, value: string) {
    const lines = source.split(/\r?\n/);
    const fixed: Record<string, string> = { name: 'Name', dob: 'DOB', ssn: 'SSN', address: 'Address', letterDate: 'Letter Date', affidavitState: 'Affidavit State', affidavitCounty: 'Affidavit County' };
    const label = field.startsWith('TEMPLATE FIELD ') ? field : fixed[field] || field;
    const next = label + ': ' + value;
    const index = lines.findIndex((line) => line.toLowerCase().startsWith(label.toLowerCase() + ':'));
    if (index >= 0) lines[index] = next; else lines.unshift(next);
    setSource(lines.join('\n')); setNormalized(false);
  }
  function restoreOriginal() { setSource(originalSource || source); setNormalized(false); report('Original source copy restored. Standardize again before generation.'); }
  function recoverDraft() { if (!recoveryDraft) return; setSource(recoveryDraft.text); setNormalized(recoveryDraft.normalized); report(`${recoveryDraft.label} draft restored.`, 'success'); }
  function refBlob(type: LetterType) { const slot = refs.find((item) => item.type === type); return slot ? readReferenceFile(slot.id) : Promise.resolve(null); }
  function exhibitBlob(kind: ExhibitKind) { return readTemplateExhibit(round, kind); }
  function disputeValues(route: LetterRoute, date: string) {
    return { consumerName: parsed.name, addressLines: parsed.address.length ? parsed.address : ['N/A'], dob: parsed.dob, ssn: parsed.ssn, letterDate: date, bureauName: bureauInfo[route.bureau].name, bureauAddressLines: bureauInfo[route.bureau].address.split('\n'), disputeItems: parsed.dispute[route.bureau].map((item) => item.displayText), hardInquiryItems: parsed.inquiry[route.bureau].map((item) => item.displayText), fraudItems: route.items.map((item) => item.displayText) };
  }
  function lateValues(route: LetterRoute, date: string) {
    return { consumerName: parsed.name, addressLines: parsed.address.length ? parsed.address : ['N/A'], dob: parsed.dob, ssn: parsed.ssn, letterDate: date, bureauName: bureauInfo[route.bureau].name, bureauAddressLines: bureauInfo[route.bureau].address.split('\n'), latePaymentItems: parsed.late[route.bureau].map((item) => item.displayText) };
  }
  function appendixContext(kind: 'AFFIDAVIT' | 'FTC', bureau: Bureau, date: string) {
    return { kind, bureau, documentDate: date, recipientName: bureauInfo[bureau].name, recipientAddressLines: bureauInfo[bureau].address.split('\n'), source: affidavitSource };
  }
  async function assetBlob(kind: ExhibitKind) {
    const local = exhibitBlob(kind);
    if (local) return local;
    const registryAsset = registryAssets.find((asset) => asset.template_kind === 'EXHIBIT' && asset.exhibit_kind === kind);
    if (!registryAsset) return null;
    const response = await fetch(`/api/template-assets/file?round=${encodeURIComponent(round)}&templateKind=EXHIBIT&exhibitKind=${kind}`);
    if (!response.ok) throw new Error(`Could not load ${kind} template: ${await response.text()}`);
    return await response.blob();
  }
  async function letterBlob(type: LetterType) {
    const local = refBlob(type);
    if (local) return local;
    const registryAsset = registryAssets.find((asset) => asset.template_kind === 'LETTER' && asset.letter_type === type);
    if (!registryAsset) return null;
    const response = await fetch(`/api/template-assets/file?round=${encodeURIComponent(round)}&templateKind=LETTER&letterType=${type}`);
    if (!response.ok) throw new Error(`Could not load ${labels[type]}: ${await response.text()}`);
    return await response.blob();
  }
  async function affidavit(bureau: Bureau, date: string) {
    const file = await assetBlob('AFFIDAVIT');
    return file ? renderMappedAppendix(toTemplateFile(file, 'AFFIDAVIT.docx'), appendixContext('AFFIDAVIT', bureau, date)) : null;
  }
  async function makeZip(files: ReviewOutput[], notes: string[], date: string) {
    const zip = new JSZip();
    const manifest = files.map((item) => ({ path: item.path, type: item.type, role: item.role, bureau: item.bureau, sequence: item.sequence, count: item.count, detail: item.detail }));
    const manifestJson = generationManifestText(buildGenerationManifest({
      round,
      parsed,
      routes,
      references: effectiveRefs,
      templates: effectiveTemplates,
      outputs: files.map((item, index) => normalizeGeneratedOutputForManifest({ id: item.id, path: item.path, type: item.type, role: item.role, bureau: item.bureau, sequence: item.sequence, count: item.count }, index)),
      warnings: notes
    }));
    await addOrderedPacketFolders(zip, files, round, evidenceKey, parsed.name || 'Client', routes.map((route) => ({ type: route.type, bureau: route.bureau })));
    zip.file('generation-manifest.json', manifestJson);
    return await zip.generateAsync({ type: 'blob' });
  }
  async function generate() {
    setGenerateAttempted(true);
    if (!preflight.ready) { report(preflightFailureMessage(preflight), 'error'); return; }
    setBusy(true); setWarnings([]); setOrderedZip(null); setDocDate(dateNow());
    const output: ReviewOutput[] = []; const notes: string[] = [];
    try {
      const date = dateNow();
      for (const route of routes) {
        try {
          report(`Generating ${labels[route.type]} for ${route.bureau}…`);
          const template = await letterBlob(route.type);
          if (!template) throw new Error(`${labels[route.type]} template is missing for ${round}.`);
          const blob = route.type === 'DISPUTE' ? await withTimeout(`Rendering ${labels[route.type]} for ${route.bureau}`, () => renderReferenceDisputeDocx(toTemplateFile(template, labels[route.type] + '.docx'), disputeValues(route, date))) : await withTimeout(`Rendering ${labels[route.type]} for ${route.bureau}`, () => renderLatePaymentReference(toTemplateFile(template, labels[route.type] + '.docx'), lateValues(route, date)));
          output.push({ id: `${route.type}-${route.bureau}-LETTER`, path: `Editable Documents/${clean(parsed.name)} ${route.bureau} ${labels[route.type]}.docx`, type: route.type, role: 'LETTER', sequence: 1, bureau: route.bureau, count: route.items.length, detail: route.reason, blob, packetSteps: order(route.type) });
        } catch (error) { notes.push(`${labels[route.type]} / ${route.bureau}: ${errorMessage(error)}`); }
      }
      const letterCoverage = assessRouteCoverage(routes, output);
      if (!letterCoverage.complete) {
        const technicalReason = notes.find((note) => /(?:Dispute|Late Payment) Letter\s*\//i.test(note));
        setWarnings(notes);
        report(requiredGenerationFailureMessage(letterCoverage, technicalReason ? `Resolve this template issue and retry: ${technicalReason}` : 'Resolve required templates and retry.'), 'error');
        return;
      }
      const context = routes.find((route) => route.type === 'DISPUTE');
      if (context) {
        if (isFtcEnabled()) {
          report('Generating FTC Identity Theft Report…');
          const ftcWorkflow = await withTimeout('Generating FTC Identity Theft Report workflow', () => generateFtcWorkflowOutput({ round, parsed, date, cleanName: clean, packetSteps: order('DISPUTE') }), 75_000);
          notes.push(...ftcWorkflow.notes);
          output.push(ftcWorkflow.output);
        }
        report('Generating client Affidavit…');
        const file = await withTimeout('Generating Affidavit', () => affidavit(context.bureau, date));
        if (!file) throw new Error('Required component missing: 04 Affidavit.docx could not be generated.');
        output.push({ id: 'CLIENT-AFFIDAVIT', path: `Editable Documents/${clean(parsed.name)} 05 ${exhibitTitles.AFFIDAVIT}.docx`, type: 'DISPUTE', role: 'AFFIDAVIT', sequence: 6, bureau: 'CLIENT', count: 1, detail: 'Shared client affidavit', blob: file, packetSteps: order('DISPUTE') });
      }
      report('Preparing complete ordered component package…');
      const zip = await withTimeout('Preparing ordered package ZIP', () => makeZip(output, notes, date), ARCHIVE_TIMEOUT_MS);
      const persistedManifest = buildGenerationManifest({
        round,
        parsed,
        routes,
        references: refs,
        templates,
        outputs: output.map((item, index) => normalizeGeneratedOutputForManifest({ id: item.id, path: item.path, type: item.type, role: item.role, bureau: item.bureau, sequence: item.sequence, count: item.count }, index)),
        warnings: notes
      });
      void persistGenerationRun(persistedManifest);
      const zipName = `${clean(parsed.name)}.zip`;
      setDocs(output); setWarnings(notes); setOrderedZip({ name: zipName, blob: zip }); setDocDate(date);
      saveCase('REVIEW_READY', { editableCount: output.length, evidenceCount: evidence.supporting.length, pdfCount: 0 });
      report('Complete ordered packet package is ready for review and download.', 'success');
      setPanel('Outputs');
    } catch (error) { const message = `Ordered package generation failed: ${errorMessage(error)}`; setWarnings([...notes, message]); setOrderedZip(null); report(message, 'error'); }
    finally { setBusy(false); }
  }
  async function saveEdited(output: ReviewOutput, file: File) {
    const next = docs.map((item) => item.path === output.path ? { ...item, blob: file } : item);
    try {
      const zip = await withTimeout('Rebuilding ordered component package', () => makeZip(next, warnings, docDate || dateNow()), ARCHIVE_TIMEOUT_MS);
      setDocs(next); setOrderedZip({ name: orderedZip?.name || 'ORDERED_PACKET_PACKAGE.zip', blob: zip }); report('Document edit saved and ordered package rebuilt.', 'success');
    } catch (error) { report(`Package rebuild failed: ${errorMessage(error)}`, 'error'); }
  }
  async function updateOutputEvidence(value: PacketAssets) {
    setEvidence(value);
    if (!docs.length) return;
    try {
      const zip = await withTimeout('Rebuilding package with updated supporting documents', () => makeZip(docs, warnings, docDate || dateNow()), ARCHIVE_TIMEOUT_MS);
      setOrderedZip({ name: orderedZip?.name || 'ORDERED_PACKET_PACKAGE.zip', blob: zip }); report('Supporting Documents updated and ordered package rebuilt.', 'success');
    } catch (error) { setOrderedZip(null); report(`Package rebuild failed: ${errorMessage(error)}`, 'error'); }
  }
  function applyWorkspaceImport(value: { round: Round; caseId: string; source: string; originalSource: string; normalized: boolean; references: LetterReference[]; templates: TemplateExhibits; evidence: PacketAssets; notices: string[] }) {
    const imported = parseSource(value.source);
    const detected = detectRoutes(imported);
    setRound(value.round);
    setCaseId(value.caseId || crypto.randomUUID());
    setSource(value.source);
    setOriginalSource(value.originalSource);
    setNormalized(value.normalized);
    setReferences(value.references);
    setTemplates(value.templates);
    setEvidence(value.evidence);
    clearOutputs();
    if (imported.name) {
      setCases(upsertClientCase({ id: value.caseId || crypto.randomUUID(), clientName: imported.name, round: value.round, routeCount: detected.length, bureaus: Array.from(new Set(detected.map((route) => route.bureau))), evidenceCount: value.evidence.supporting.length, editableCount: 0, pdfCount: 0, status: value.evidence.supporting.length ? 'EVIDENCE_READY' : 'SOURCE_LOCKED', updatedAt: new Date().toISOString() }));
    }
    setPanel('Source Data');
  }
  function dashboard() { return <DashboardOperationsWorkspace cases={cases} filings={filings} activeCaseId={caseId} onNewCase={begin} onOpenTemplates={() => setPanel('Templates')} onOpenOutputs={() => setPanel(orderedZip ? 'Outputs' : 'Dashboard')} onOpenTracker={() => setPanel('Client Center')} onContinueCase={(item) => setPanel(item.id === caseId && item.status !== 'PDF_READY' ? (item.status === 'REVIEW_READY' ? 'Outputs' : 'Source Data') : 'Client Center')} />; }
  function sourceView() { return <>{uxRules.showPreflightPanel && <GenerationPreflightChecklist result={preflight} />}<GuidedSourceDataFlow source={source} originalSource={originalSource} recoveryDraft={recoveryDraft} normalized={normalized} verified={verified} parsed={affidavitRequired ? affidavitSource : parsed} routes={routes} sourceWarnings={sourceWarnings} evidenceKey={evidenceKey} evidence={evidence} canGenerate={preflight.ready && canGenerate} missingLetters={missingLetters.map((item) => labels[item])} missingInsertCount={missingNodes.length} affidavitRequired={affidavitRequired} ftcRequired={Boolean(parsed.ftcAccounts.length)} customFields={customFields} strict={preferences.strictValidation} busy={busy} onImportSource={importSource} onStandardizeDraft={standardizeDraft} onStartManualDraft={startManualDraft} onEditSource={(value) => { setSource(value); setNormalized(false); clearOutputs(); }} onSourceFieldChange={setLine} onFtcAccountChange={() => {}} onFtcAccountAdd={() => {}} onFtcAccountRemove={() => {}} onFtcAccountSeed={() => {}} onRestoreOriginal={restoreOriginal} onRecoverDraft={recoverDraft} onEvidenceChanged={(value) => { setEvidence(value); clearOutputs(); saveCase(value.supporting.length ? 'EVIDENCE_READY' : 'SOURCE_LOCKED', { evidenceCount: value.supporting.length, editableCount: 0 }); }} onMessage={(message) => report(message)} onGenerate={generate} /></>; }
  function settingsView() { return <><WorkspaceSettingsPanel preferences={preferences} caseCount={cases.length} filingCount={filings.length} accountEmail={accountEmail} accountRole={accountRole} onChange={(value) => setPreferences(saveWorkspacePreferences(value))} onExportRecords={() => download('XDISPUTER_LOCAL_WORKSPACE_RECORDS.json', new Blob([JSON.stringify(exportOperationsRecords(), null, 2)], { type: 'application/json' }))} onClearRecords={() => { const value = clearOperationsRecords(); setCases(value.cases); setFilings(value.filings); }} /><WorkspacePortabilityPanel round={round} caseId={caseId} clientName={parsed.name} source={source} originalSource={originalSource} normalized={normalized} preferences={preferences} disabled={busy} onImported={applyWorkspaceImport} onMessage={(message, tone) => report(message, tone)} /></>; }
  return <main className="app-shell"><aside className="sidebar"><div className="brand"><span /><div><strong>xDisputer</strong><small>Client workspace</small></div></div><nav>{panels.map((item) => <button key={item} className={panel === item ? 'active' : ''} disabled={item === 'Outputs' && !orderedZip} onClick={() => setPanel(item)}><strong>{item}</strong></button>)}</nav><div className="workspace-account-card"><div><span>{(accountEmail || 'CL').slice(0, 2).toUpperCase()}</span><div><strong>{accountRole === 'admin' ? 'Admin account' : 'Client account'}</strong><small>{accountEmail || 'Signed in'}</small></div></div><button type="button" onClick={() => setPanel('Settings')}>Account settings</button><form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div></aside><section className="main-area"><header className="header"><div><p className="eyebrow">{panel === 'Dashboard' ? 'Client operations' : panel === 'Client Center' ? 'Client workspace' : `${round} workflow`}</p><h1>{panel}</h1>{uxRules.showStatusText && <p className={`workspace-operation-status ${statusTone}`} role={statusTone === 'error' ? 'alert' : 'status'} aria-live="polite">{status}</p>}</div><div className="workspace-header-actions">{panel === 'Dashboard' && <OutputLimitResetChip />}{uxRules.showHeaderNextAction && <CasePipelineStatus stages={pipelineStages} nextAction={pipelineNextAction} status={status} statusTone={statusTone} />}</div></header>{panel === 'Dashboard' && dashboard()}{panel === 'Templates' && <TemplateProgressiveWorkspace round={round} slots={refs} supportingReady={evidence.supporting.length > 0} onSelectRound={(value) => { setRound(value); clearOutputs(); report(`${value} selected. Templates and generation will use this round.`, 'success'); }} onUploadLetter={uploadRef} onRemoveLetter={removeRef} onExhibitsChange={(value) => { setTemplates(value); clearOutputs(); }} onMessage={(message) => report(message)} onUseRoundForSourceData={() => { clearOutputs(); report(`${round} is active. Source Data generation will use this round's templates.`, 'success'); setPanel('Source Data'); }} />}{panel === 'Source Data' && sourceView()}{panel === 'Outputs' && <OutputReviewWorkspace round={round} outputs={docs} expectedRoutes={routes} zipName={orderedZip?.name} warnings={uxRules.showOutputWarnings ? warnings : []} evidenceKey={evidenceKey} evidence={evidence} onEvidenceChanged={(value) => void updateOutputEvidence(value)} onMessage={(message) => report(message)} onZip={() => orderedZip && download(orderedZip.name, orderedZip.blob)} onReplace={saveEdited} />}{panel === 'Client Center' && <ClientCenterWorkspace cases={cases} filings={filings} activeCaseId={caseId} outputsAvailable={Boolean(orderedZip)} onOpenTemplates={() => setPanel('Templates')} onOpenSource={() => setPanel('Source Data')} onOpenOutputs={() => setPanel('Outputs')} onStartCase={begin} onMarkSent={(id) => setFilings(markFilingSent(id))} />}{panel === 'Settings' && settingsView()}</section></main>;
}
