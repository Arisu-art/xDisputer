'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { exhibitAccept, exhibitModes, exhibitTitles, recoverTemplateExhibitsFromFiles, removeTemplateExhibit, saveTemplateExhibit, type ExhibitAsset, type ExhibitKind, type TemplateExhibits } from '../lib/template-exhibits';
import { exhibitKindsForPacket, packetOrderText } from '../lib/workflow-framework';
import type { LetterReference, Round } from '../lib/reference-store';
import type { LetterType } from '../lib/letter-engine';

type PacketFocus = LetterType;
type NodeId = 'DISPUTE_LETTER' | 'LATE_LETTER' | ExhibitKind | null;
type StatusTone = 'ready' | 'required' | 'neutral';

type Props = {
  round: Round;
  slots: LetterReference[];
  supportingReady: boolean;
  focusedPacket?: PacketFocus;
  embedded?: boolean;
  onUploadLetter: (slot: LetterReference, file: File) => Promise<void>;
  onRemoveLetter: (slot: LetterReference) => Promise<void>;
  onExhibitsChange: (value: TemplateExhibits) => void;
  onMessage: (message: string) => void;
};

const activeExhibits = exhibitKindsForPacket('DISPUTE');

function Badge({ tone = 'neutral', children }: { tone?: StatusTone; children: ReactNode }) {
  return <span className={`packet-status ${tone}`}>{children}</span>;
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="template-info-tag">{children}</span>;
}

function mappingMeta(asset?: ExhibitAsset | null) {
  if (!asset?.contract) return asset && exhibitModes[asset.kind] === 'GENERATED_DOCX' ? 'Generated from Source Data for final PDF delivery' : 'Inserted unchanged into final PDF delivery';
  if (asset.contract.mode === 'LEGACY_HIGHLIGHTED') return 'Source-mapped generated document · required for final PDF delivery';
  if (asset.contract.mode === 'PLACEHOLDERS') {
    const extra = asset.contract.customFields.length ? ` · ${asset.contract.customFields.length} custom field${asset.contract.customFields.length === 1 ? '' : 's'}` : '';
    return `Source-mapped document · ${asset.contract.tags.length} tag${asset.contract.tags.length === 1 ? '' : 's'}${extra}`;
  }
  return 'Inserted unchanged into final PDF delivery';
}

function letterMeta(slot?: LetterReference) {
  if (!slot?.file) return slot?.type === 'DISPUTE' ? 'Upload the required dispute letter template.' : 'Upload when a late-payment route is needed.';
  if (slot.contract?.mode === 'PLACEHOLDERS') return `${slot.file} · Placeholder mapping · Cloud saved`;
  return `${slot.file} · Reference layout mapping · Cloud saved`;
}

function format(kind: ExhibitKind) {
  return exhibitModes[kind] === 'GENERATED_DOCX' ? 'Editable DOCX' : 'Static PDF';
}

export default function TemplatePacketConfigurator({
  round,
  slots,
  supportingReady,
  focusedPacket = 'DISPUTE',
  embedded = false,
  onUploadLetter,
  onRemoveLetter,
  onExhibitsChange,
  onMessage
}: Props) {
  const [activeNode, setActiveNode] = useState<NodeId>(null);
  const [exhibits, setExhibits] = useState<TemplateExhibits>({ FCRA: null, AFFIDAVIT: null, ATTACHMENT: null, FTC: null });

  const dispute = slots.find((slot) => slot.type === 'DISPUTE');
  const late = slots.find((slot) => slot.type === 'LATE_PAYMENT');

  useEffect(() => {
    let cancelled = false;
    setActiveNode(null);

    void recoverTemplateExhibitsFromFiles(round)
      .then((saved) => {
        if (!cancelled) {
          setExhibits(saved);
          onExhibitsChange(saved);
        }
      })
      .catch(() => {
        if (!cancelled) onMessage('Template recovery could not be completed. Reopen Templates or upload the missing file again.');
      });

    return () => {
      cancelled = true;
    };
  }, [round]);

  useEffect(() => setActiveNode(null), [focusedPacket]);

  async function syncExhibitToSupabase(kind: ExhibitKind, file: File) {
    const formData = new FormData();
    formData.set('round', round);
    formData.set('templateKind', 'EXHIBIT');
    formData.set('exhibitKind', kind);
    formData.set('file', file);

    const response = await fetch('/api/template-assets', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'x-template-upload': 'workspace'
      },
      body: formData
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || payload?.status === 'error') {
      throw new Error(payload?.message || 'Template could not be saved to Supabase.');
    }

    return payload?.message || `${exhibitTitles[kind]} saved to Supabase.`;
  }

  async function deleteExhibitFromSupabase(kind: ExhibitKind) {
    const response = await fetch('/api/template-assets', {
      method: 'DELETE',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-template-upload': 'workspace'
      },
      body: JSON.stringify({
        round,
        templateKind: 'EXHIBIT',
        exhibitKind: kind
      })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || payload?.status === 'error') {
      throw new Error(payload?.message || 'Template could not be removed from Supabase.');
    }

    return payload?.message || `${exhibitTitles[kind]} removed from Supabase.`;
  }

  async function uploadExhibit(kind: ExhibitKind, file: File) {
    try {
      const syncMessage = await syncExhibitToSupabase(kind, file);
      const next = await saveTemplateExhibit(round, kind, file);

      setExhibits(next);
      onExhibitsChange(next);

      const contract = next[kind]?.contract;
      onMessage(`${syncMessage}${contract?.mode === 'PLACEHOLDERS' ? ` ${contract.tags.length} placeholder tag(s) mapped to Source Data.` : contract?.mode === 'LEGACY_HIGHLIGHTED' ? ' Highlighted fields will be mapped from Source Data.' : ''}`);
      setActiveNode(null);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'File could not be saved.');
    }
  }

  async function removeExhibit(kind: ExhibitKind) {
    try {
      const syncMessage = await deleteExhibitFromSupabase(kind);
      const next = await removeTemplateExhibit(round, kind);

      setExhibits(next);
      onExhibitsChange(next);
      onMessage(syncMessage);
      setActiveNode(null);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'File could not be removed.');
    }
  }

  function LetterActions({ slot, node }: { slot: LetterReference; node: NodeId }) {
    const active = activeNode === node;

    return (
      <div className={`contextual-actions studio-actions ${active ? 'visible' : ''}`}>
        <button className="reveal-action" type="button" aria-expanded={active} onClick={() => setActiveNode(active ? null : node)}>
          {active ? 'Close' : slot.file ? 'Replace' : 'Upload'}
        </button>
        <div className="contextual-action-region" aria-hidden={!active}>
          <div>
            <label>
              <span>Select DOCX</span>
              <input
                type="file"
                accept=".docx"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onUploadLetter(slot, file).then(() => setActiveNode(null));
                  event.target.value = '';
                }}
              />
            </label>
            {slot.file && <button type="button" className="remove-node" onClick={() => void onRemoveLetter(slot)}>Remove</button>}
          </div>
        </div>
      </div>
    );
  }

  function ExhibitActions({ kind }: { kind: ExhibitKind }) {
    const active = activeNode === kind;
    const fileFormat = exhibitModes[kind] === 'GENERATED_DOCX' ? 'DOCX' : 'PDF';

    return (
      <div className={`contextual-actions studio-actions ${active ? 'visible' : ''}`}>
        <button className="reveal-action" type="button" aria-expanded={active} onClick={() => setActiveNode(active ? null : kind)}>
          {active ? 'Close' : exhibits[kind] ? 'Replace' : 'Upload'}
        </button>
        <div className="contextual-action-region" aria-hidden={!active}>
          <div>
            <label>
              <span>Select {fileFormat}</span>
              <input
                type="file"
                accept={exhibitAccept[kind]}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadExhibit(kind, file);
                  event.target.value = '';
                }}
              />
            </label>
            {exhibits[kind] && <button type="button" className="remove-node" onClick={() => void removeExhibit(kind)}>Remove</button>}
          </div>
        </div>
      </div>
    );
  }

  function Card({
    number,
    title,
    meta,
    tone,
    status,
    fileFormat,
    children,
    className = ''
  }: {
    number: string;
    title: string;
    meta: string;
    tone?: StatusTone;
    status: string;
    fileFormat: string;
    children?: ReactNode;
    className?: string;
  }) {
    return (
      <article className={`studio-component-card ${tone === 'ready' ? 'is-ready' : ''} ${className}`}>
        <span className="studio-sequence">{number}</span>
        <div className="studio-component-copy">
          <div className="studio-component-title">
            <h4>{title}</h4>
            <span className="studio-format">{fileFormat}</span>
          </div>
          <p>{meta}</p>
        </div>
        <Badge tone={tone}>{status}</Badge>
        {children}
      </article>
    );
  }

  if (focusedPacket === 'DISPUTE' && !dispute) return <section className="panel template-config-empty">No Dispute Letter reference slot is available for {round}.</section>;
  if (focusedPacket === 'LATE_PAYMENT' && !late) return <section className="panel template-config-empty">No Late Payment Letter reference slot is available for {round}.</section>;

  return (
    <section className={`template-studio template-studio-operational progressive-surface focused-template-configurator ${embedded ? 'embedded-template-configurator' : ''}`}>
      {focusedPacket === 'DISPUTE' && dispute && (
        <div className="template-focused-workflow">
          {!embedded && (
            <header className="template-section-heading template-operational-heading">
              <div className="template-title-block">
                <p className="eyebrow">Final PDF contract</p>
                <h3>Dispute Packet</h3>
                <span>{packetOrderText('DISPUTE')}</span>
              </div>
              <div className="template-info-tags">
                <Tag>Required positions</Tag>
                <Tag>Order locked</Tag>
              </div>
            </header>
          )}
          <div className="studio-component-grid primary-visible-grid">
            <Card number="01" title="Dispute Letter" meta={letterMeta(dispute)} tone={dispute.file ? 'ready' : 'required'} status={dispute.file ? 'Ready' : 'Required'} fileFormat="Editable DOCX">
              <LetterActions slot={dispute} node="DISPUTE_LETTER" />
            </Card>
            <Card number="02" title="Supporting Documents" meta="Client evidence is uploaded in Source Data and merged into every final packet." tone={supportingReady ? 'ready' : 'required'} status={supportingReady ? 'Ready' : 'Required per client'} fileFormat="Evidence PDF" />
            {activeExhibits.map((kind, index) => (
              <Card
                key={kind}
                number={String(index + 3).padStart(2, '0')}
                title={exhibitTitles[kind]}
                meta={exhibits[kind]?.name ? `${exhibits[kind]?.name} · ${mappingMeta(exhibits[kind])} · Cloud saved` : exhibitModes[kind] === 'GENERATED_DOCX' ? 'Upload the required DOCX source-mapped document for final delivery.' : 'Upload the required PDF insert for final delivery.'}
                tone={exhibits[kind] ? 'ready' : 'required'}
                status={exhibits[kind] ? 'Ready' : 'Required for final PDF'}
                fileFormat={format(kind)}
              >
                <ExhibitActions kind={kind} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {focusedPacket === 'LATE_PAYMENT' && late && (
        <div className="template-focused-workflow late-payment-focused">
          <div className="studio-component-grid primary-visible-grid compact-template-grid">
            <Card number="01" title="Late Payment Letter" meta={letterMeta(late)} tone={late.file ? 'ready' : 'neutral'} status={late.file ? 'Ready' : 'Required when used'} fileFormat="Editable DOCX">
              <LetterActions slot={late} node="LATE_LETTER" />
            </Card>
            <Card number="02" title="Supporting Documents" meta="Client evidence is uploaded in Source Data and merged after the letter." tone={supportingReady ? 'ready' : 'required'} status={supportingReady ? 'Ready' : 'Required per client'} fileFormat="Evidence PDF" />
          </div>
        </div>
      )}
    </section>
  );
}
