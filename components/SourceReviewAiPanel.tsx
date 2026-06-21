'use client';

import type { LetterRoute, ParsedSource } from '../lib/letter-engine';
import type { PacketAssets } from '../lib/packet-assets';
import type { TemplateFieldContract } from '../lib/template-contracts';

type Props = {
  parsed: ParsedSource;
  routes: LetterRoute[];
  evidence: PacketAssets;
  sourceWarnings: Array<{ message: string }>;
  generationBlockers?: string[];
  missingLetters: string[];
  affidavitReady: boolean;
  customFields: TemplateFieldContract[];
  packetReady: boolean;
  scopeConfirmed: boolean;
  strict: boolean;
};

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export default function SourceReviewAiPanel({
  parsed,
  routes,
  evidence,
  sourceWarnings,
  generationBlockers = [],
  missingLetters,
  affidavitReady,
  customFields,
  packetReady,
  scopeConfirmed,
  strict
}: Props) {
  const requiredFields = customFields.filter((field) => field.required);
  const completedFields = requiredFields.filter((field) => parsed.templateFields[field.key]?.trim());
  const notices = unique([
    ...generationBlockers,
    ...sourceWarnings.map((warning) => warning.message),
    ...missingLetters.map((letter) => `Missing template: ${letter}`),
    ...(!affidavitReady ? ['Affidavit location requires review.'] : []),
    ...(!scopeConfirmed ? ['Packet scope is not confirmed.'] : []),
    ...(!evidence.supporting.length ? ['Supporting evidence is not uploaded.'] : [])
  ]);

  return (
    <aside className={`source-review source-review-intelligence ${packetReady ? 'ready' : 'blocked'}`} aria-label="Source review summary">
      <header>
        <div>
          <p className="eyebrow">Source review</p>
          <h3>{packetReady ? 'Ready for packet generation' : 'Review before generation'}</h3>
          <p>Client, route, evidence, template, and affidavit readiness in one checkpoint.</p>
        </div>
        <span className={`pill ${packetReady ? 'success' : 'neutral'}`}>{packetReady ? 'Ready' : 'Review'}</span>
      </header>

      <div className="source-review-ai-grid">
        <article><span>Client</span><strong>{parsed.name || 'Unavailable'}</strong><small>{parsed.address.join(' ') || 'Address unavailable'}</small></article>
        <article><span>Routes</span><strong>{routes.length}</strong><small>{routes.length === 1 ? 'route' : 'routes'}</small></article>
        <article><span>Evidence</span><strong>{evidence.supporting.length}</strong><small>supporting document{evidence.supporting.length === 1 ? '' : 's'}</small></article>
        <article><span>Affidavit</span><strong>{affidavitReady ? 'Ready' : 'Review'}</strong><small>{parsed.affidavitCounty || 'County pending'}{parsed.affidavitState ? `, ${parsed.affidavitState}` : ''}</small></article>
        <article><span>Fields</span><strong>{completedFields.length}/{requiredFields.length}</strong><small>{strict ? 'strict mode' : 'standard mode'}</small></article>
        <article><span>Scope</span><strong>{scopeConfirmed ? 'Confirmed' : 'Pending'}</strong><small>{missingLetters.length ? `${missingLetters.length} missing template` : 'template routes checked'}</small></article>
      </div>

      {notices.length > 0 && (
        <section className="source-review-ai-alerts" aria-label="Source review notices">
          <strong>Notices</strong>
          {notices.slice(0, 8).map((notice) => <p key={notice}>{notice}</p>)}
        </section>
      )}
    </aside>
  );
}
