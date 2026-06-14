'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import TemplateProgressiveWorkspace from './TemplateProgressiveWorkspace';
import ManagerTemplateLibraryStatus from './ManagerTemplateLibraryStatus';
import { defaultReferences, type LetterReference, type Round } from '../lib/reference-store';
import { exhibitModes, exhibitTitles, type ExhibitAsset, type ExhibitKind, type TemplateExhibits } from '../lib/template-exhibits';
import type { ManagerTemplateScopeUi } from '../lib/manager-template-ui';

type TemplateAsset = {
  id: string;
  round_label: Round;
  template_kind: 'LETTER' | 'EXHIBIT';
  letter_type: LetterReference['type'] | null;
  exhibit_kind: ExhibitKind | null;
  original_filename: string;
  mime_type?: string | null;
  file_size?: number | null;
  content_hash?: string | null;
  version_number?: number | null;
  validation_json?: Record<string, unknown> | null;
};

const emptyExhibits: TemplateExhibits = { FCRA: null, AFFIDAVIT: null, ATTACHMENT: null, FTC: null };

function assetToLetter(slot: LetterReference, asset?: TemplateAsset): LetterReference {
  if (!asset) return slot;
  return { ...slot, file: asset.original_filename, size: asset.file_size || undefined, assetId: asset.id, source: 'MANAGER_TEMPLATE_ASSET', versionNumber: asset.version_number || null, contentHash: asset.content_hash || null, validationJson: asset.validation_json || null };
}

function assetToExhibit(asset: TemplateAsset): ExhibitAsset | null {
  if (!asset.exhibit_kind) return null;
  return { id: asset.id, kind: asset.exhibit_kind, mode: exhibitModes[asset.exhibit_kind], name: asset.original_filename || exhibitTitles[asset.exhibit_kind], type: asset.mime_type || 'application/octet-stream', size: asset.file_size || 0, assetId: asset.id, source: 'MANAGER_TEMPLATE_ASSET', versionNumber: asset.version_number || null, contentHash: asset.content_hash || null, validationJson: asset.validation_json || null };
}

function assetsToExhibits(assets: TemplateAsset[]): TemplateExhibits {
  const next: TemplateExhibits = { ...emptyExhibits };
  assets.filter((asset) => asset.template_kind === 'EXHIBIT').forEach((asset) => { const exhibit = assetToExhibit(asset); if (exhibit) next[exhibit.kind] = exhibit; });
  return next;
}

function workflowStatus(loading: boolean, scope: ManagerTemplateScopeUi | null, error: string | null) {
  if (loading) return 'Loading manager template authority…';
  if (error) return 'Manager template workflow blocked';
  if (scope?.canManageTemplates) return 'Manager template workflow ready';
  return 'Manager template uploads locked';
}

export default function ManagerTemplateWorkspaceClient() {
  const [round, setRound] = useState<Round>('1st Round');
  const [assets, setAssets] = useState<TemplateAsset[]>([]);
  const [managerTemplateScope, setManagerTemplateScope] = useState<ManagerTemplateScopeUi | null>(null);
  const [message, setMessage] = useState('Loading manager template authority. Upload controls stay locked until the API returns a manager template scope.');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAssets = useCallback(async (selectedRound: Round) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/template-assets?round=${encodeURIComponent(selectedRound)}`, { headers: { accept: 'application/json' } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || payload?.message || 'Could not load manager templates.');
      setAssets(Array.isArray(payload.assets) ? payload.assets : []);
      setManagerTemplateScope(payload.managerTemplateScope || null);
      setMessage(payload.managerTemplateScope?.canManageTemplates ? `${selectedRound} manager template authority verified. Upload controls are enabled.` : 'Manager template authority is read-only or unavailable. Upload controls are locked.');
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Could not load manager templates.';
      setLoadError(nextMessage);
      setMessage(nextMessage);
      setAssets([]);
      setManagerTemplateScope(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAssets(round); }, [round, loadAssets]);

  const slots = useMemo(() => defaultReferences().filter((slot) => slot.round === round).map((slot) => assetToLetter(slot, assets.find((asset) => asset.template_kind === 'LETTER' && asset.letter_type === slot.type))), [round, assets]);
  const exhibits = useMemo(() => assetsToExhibits(assets), [assets]);

  async function handleUploadLetter(slot: LetterReference, file: File) {
    setAssets((current) => current.map((asset) => asset.template_kind === 'LETTER' && asset.letter_type === slot.type ? { ...asset, original_filename: file.name, file_size: file.size } : asset));
  }

  async function handleRemoveLetter() { /* TemplatePacketConfigurator refreshes through onTemplateMutation after delete. */ }
  async function handleExhibitsHydrated() { /* Hydration does not reload Supabase assets. */ }
  async function handleTemplateMutation() { await loadAssets(round); }

  return <section className="manager-template-client-flow" data-manager-template-scope-state={managerTemplateScope?.canManageTemplates ? 'verified-upload' : loading ? 'loading' : 'locked'}>
    <header className="admin-monitor-header native-command-hero manager-compact-hero"><div><p>Manager template workspace</p><h1>Upload default templates with verified manager authority.</h1><span>Managers use the same round → packet → upload workflow as the client workspace, but upload controls unlock only after the API returns manager template scope.</span></div></header>
    <section className="admin-monitor-card manager-template-workflow-status"><strong>{workflowStatus(loading, managerTemplateScope, loadError)}</strong><span>{message}</span></section>
    <ManagerTemplateLibraryStatus round={round} assets={assets} loading={loading} />
    <TemplateProgressiveWorkspace round={round} slots={slots} supportingReady={false} managerTemplateScope={managerTemplateScope} managedExhibits={exhibits} onSelectRound={(next) => { setRound(next); setMessage(`${next} selected for manager default template setup.`); }} onUploadLetter={handleUploadLetter} onRemoveLetter={handleRemoveLetter} onExhibitsChange={handleExhibitsHydrated} onTemplateMutation={handleTemplateMutation} onMessage={setMessage} onUseRoundForSourceData={() => setMessage(`${round} manager defaults are selected. Upload/replace templates here; clients will generate from the active versions.`)} />
  </section>;
}
