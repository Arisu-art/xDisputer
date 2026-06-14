'use client';

import { useMemo, useState } from 'react';
import TemplatePacketConfigurator from './TemplatePacketConfigurator';
import { rounds, type LetterReference, type Round } from '../lib/reference-store';
import type { TemplateExhibits } from '../lib/template-exhibits';
import type { LetterType } from '../lib/letter-engine';
import type { ManagerTemplateScopeUi } from '../lib/manager-template-ui';
import { resolveTemplateAuthority } from '../lib/manager-template-authority';
import { packetOrderText, packetPositionCount } from '../lib/workflow-framework';

type Stage = 'ROUND' | 'PACKET' | 'EDITOR';
type Props = {
  round: Round;
  slots: LetterReference[];
  supportingReady: boolean;
  managerTemplateScope?: ManagerTemplateScopeUi | null;
  managedExhibits?: TemplateExhibits;
  onSelectRound: (round: Round) => void;
  onUploadLetter: (slot: LetterReference, file: File) => Promise<void>;
  onRemoveLetter: (slot: LetterReference) => Promise<void>;
  onExhibitsChange: (next: TemplateExhibits) => void;
  onMessage: (message: string) => void;
  onUseRoundForSourceData: () => void;
};
function positionCount(packet: LetterType) { return `${packetPositionCount(packet)} positions`; }
function packetTitle(packet: LetterType) { return packet === 'DISPUTE' ? 'Dispute Packet' : 'Late Payment Packet'; }
function packetType(packet: LetterType) { return packet === 'DISPUTE' ? 'Standard filing order' : 'Optional route'; }

export default function TemplateProgressiveWorkspace({ round, slots, supportingReady, managerTemplateScope = null, managedExhibits, onSelectRound, onUploadLetter, onRemoveLetter, onExhibitsChange, onMessage, onUseRoundForSourceData }: Props) {
  const [stage, setStage] = useState<Stage>('ROUND');
  const [packet, setPacket] = useState<LetterType | null>(null);
  const authority = useMemo(() => resolveTemplateAuthority(managerTemplateScope), [managerTemplateScope]);
  function chooseRound(next: Round) { onSelectRound(next); setPacket(null); setStage('PACKET'); }
  function choosePacket(next: LetterType) { setPacket(next); setStage('EDITOR'); }
  function chooseDifferentRound() { setPacket(null); setStage('ROUND'); }
  function useSelectedRound() { onMessage(`${round} manager templates selected. Continue in Source Data to generate with this round.`); onUseRoundForSourceData(); }
  return <div className={`templates-progressive-workspace authority-${authority.mode.toLowerCase()}`} data-template-authority-mode={authority.mode}>
    <section className="panel template-manager-policy-banner" aria-label="Template manager policy">
      <p className="eyebrow">{authority.eyebrow}</p>
      <h2>{authority.title}</h2>
      <p>{authority.description}</p>
      <div className="template-selected-badges"><span>{authority.statusBadge}</span><span>{authority.actionLabel}</span></div>
    </section>
    {stage === 'ROUND' && <section className="panel template-selection-stage template-round-stage" aria-label="Select packet round">
      <header className="template-stage-heading"><p className="eyebrow">Manager-approved reusable templates</p><h2>Select a round</h2><p>Choose the filing round. Every assigned client uses the active manager default template for that round and slot.</p></header>
      <div className="template-round-selection-grid">{rounds.map((item, index) => <button type="button" key={item} className={`template-round-choice ${item === round ? 'current' : ''}`} onClick={() => chooseRound(item)}><span className="template-choice-number">{String(index + 1).padStart(2, '0')}</span><span className="template-choice-copy"><strong>{item}</strong><small>{item === round ? 'Current round' : 'Select round'}</small></span><span className="template-choice-arrow" aria-hidden="true">→</span></button>)}</div>
    </section>}
    {stage === 'PACKET' && <section className="panel template-selection-stage template-packet-stage" aria-label="Select packet template">
      <header className="template-stage-command"><div className="template-stage-heading"><p className="eyebrow">{round}</p><h2>Choose a packet template</h2><p>{authority.canUpload ? 'Upload or replace manager defaults from the editor.' : 'Review the manager defaults. Upload controls are locked for clients.'}</p></div><div className="template-selected-actions"><button type="button" className="secondary-button" onClick={chooseDifferentRound}>Change round</button><button type="button" className="primary-button" onClick={useSelectedRound}>Use this round in Source Data →</button></div></header>
      <div className="template-packet-selection-grid"><button type="button" className="template-packet-choice primary" onClick={() => choosePacket('DISPUTE')}><span className="template-selection-tag">Standard packet</span><h3>Dispute Packet</h3><p>{packetOrderText('DISPUTE')}</p><div className="template-choice-footer"><strong>{positionCount('DISPUTE')}</strong><span>Configure →</span></div></button><button type="button" className="template-packet-choice" onClick={() => choosePacket('LATE_PAYMENT')}><span className="template-selection-tag optional">Optional route</span><h3>Late Payment Packet</h3><p>{packetOrderText('LATE_PAYMENT')}</p><div className="template-choice-footer"><strong>{positionCount('LATE_PAYMENT')}</strong><span>Configure →</span></div></button></div>
    </section>}
    {stage === 'EDITOR' && packet && <section className="template-selected-editor" aria-label={`${packetTitle(packet)} configuration`}>
      <header className="panel template-selected-command template-merged-command"><div className="template-selected-identity"><p className="eyebrow">{round} · {packetType(packet)}</p><h2>{packetTitle(packet)}</h2><p className="template-selected-order">{packetOrderText(packet)}</p><div className="template-selected-badges"><span>{positionCount(packet)}</span><span>{authority.statusBadge}</span>{packet === 'DISPUTE' && <span>Order locked</span>}</div></div><div className="template-selected-actions"><button type="button" className="primary-button" onClick={useSelectedRound}>Use this round in Source Data →</button><button type="button" className="secondary-button" onClick={() => setStage('PACKET')}>Change packet</button><button type="button" className="secondary-button" onClick={chooseDifferentRound}>Change round</button></div></header>
      <TemplatePacketConfigurator round={round} slots={slots} supportingReady={supportingReady} focusedPacket={packet} embedded canManageTemplates={authority.canUpload} managerTemplateScope={managerTemplateScope} managedExhibits={managedExhibits} onUploadLetter={onUploadLetter} onRemoveLetter={onRemoveLetter} onExhibitsChange={onExhibitsChange} onMessage={onMessage} />
    </section>}
  </div>;
}
