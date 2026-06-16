'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  HOLOGRAM_GUARD_COMMANDS,
  HOLOGRAM_MODES,
  HOLOGRAM_THEME_TOKENS,
  INITIAL_HOLOGRAM_BLOCKS,
  INITIAL_HOLOGRAM_NAV_ITEMS,
  moveHologramBlock,
  type HologramBlock,
  type HologramMode,
  type HologramRole
} from '../../lib/master-ui-workspace/model';

type Props = {
  masterEmail: string;
};

function roleLabel(role: HologramRole) {
  if (role === 'client') return 'Client/Auth Aurora';
  if (role === 'manager') return 'Manager Graphite';
  return 'Master Executive';
}

function impactLabel(impact: HologramBlock['impact']) {
  if (impact === 'high') return 'High impact';
  if (impact === 'medium') return 'Medium impact';
  return 'Low impact';
}

export default function MasterHologramWorkspaceShell({ masterEmail }: Props) {
  const [mode, setMode] = useState<HologramMode>('live');
  const [rolePreview, setRolePreview] = useState<HologramRole>('master');
  const [blocks, setBlocks] = useState(INITIAL_HOLOGRAM_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState(INITIAL_HOLOGRAM_BLOCKS[0]?.id || '');
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedBlock = useMemo(() => blocks.find((block) => block.id === selectedBlockId) || blocks[0], [blocks, selectedBlockId]);
  const visibleBlocks = useMemo(() => blocks.filter((block) => block.roles.includes(rolePreview)), [blocks, rolePreview]);
  const visibleNavItems = useMemo(() => INITIAL_HOLOGRAM_NAV_ITEMS.filter((item) => item.roles.includes(rolePreview) && item.enabled), [rolePreview]);
  const riskScore = useMemo(() => visibleBlocks.reduce((score, block) => score + (block.impact === 'high' ? 12 : block.impact === 'medium' ? 7 : 3), 0), [visibleBlocks]);

  function switchMode(nextMode: HologramMode) {
    startTransition(() => setMode(nextMode));
  }

  function moveBlock(activeId: string, overId: string) {
    setBlocks((current) => moveHologramBlock(current, activeId, overId));
    setSelectedBlockId(activeId);
  }

  return <section className="hologram-workspace" data-hologram-workspace="true" data-hologram-mode={mode} data-hologram-role-preview={rolePreview} aria-busy={isPending}>
    <div className="hologram-command-panel" data-theme-surface="card">
      <div className="hologram-command-copy">
        <p>Master UI/UX Switch Mode</p>
        <h2>Hologram control layer.</h2>
        <span>Visual governance workspace for moving approved UI blocks, shaping navigation, previewing role surfaces, and preparing safe publish proposals. Signed in as {masterEmail}.</span>
      </div>
      <div className="hologram-role-switch" aria-label="Preview role">
        {(['client', 'manager', 'master'] as HologramRole[]).map((role) => <button key={role} type="button" className={rolePreview === role ? 'active' : ''} onClick={() => setRolePreview(role)}>{roleLabel(role)}</button>)}
      </div>
    </div>

    <div className="hologram-mode-strip" role="tablist" aria-label="Workspace modes">
      {HOLOGRAM_MODES.map((item) => <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} className={mode === item.id ? 'active' : ''} onClick={() => switchMode(item.id)}>
        <strong>{item.label}</strong>
        <span>{item.purpose}</span>
      </button>)}
    </div>

    <div className="hologram-grid">
      <section className="hologram-canvas" data-theme-surface="card" aria-label="Hologram visual canvas">
        <div className="hologram-section-header">
          <div><p>{roleLabel(rolePreview)}</p><h3>{mode === 'live' ? 'Published role preview' : mode === 'edit' ? 'Editable visual block order' : mode === 'navigation' ? 'Navigation wireframe' : mode === 'theme' ? 'Theme token impact map' : 'Publish readiness map'}</h3></div>
          <span className="hologram-chip">{visibleBlocks.length} visible block(s)</span>
        </div>

        {mode === 'navigation' ? <div className="hologram-nav-preview" aria-label="Navigation builder preview">
          {visibleNavItems.map((item, index) => <article key={item.id} className="hologram-nav-card" data-theme-surface="card"><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.label}</strong><small>{item.route}</small><em>{item.locked ? 'locked' : 'editable'}</em></article>)}
        </div> : null}

        {mode === 'theme' ? <div className="hologram-token-grid" aria-label="Theme Studio token map">
          {HOLOGRAM_THEME_TOKENS.map((token) => <article key={token.key} className="hologram-token-card" data-theme-surface="card"><span>{token.scope}</span><strong>{token.label}</strong><code>{token.key}</code><em>{token.value}</em></article>)}
        </div> : null}

        {mode !== 'navigation' && mode !== 'theme' ? <div className="hologram-block-stack">
          {visibleBlocks.map((block) => <article
            key={block.id}
            draggable={!block.locked && mode === 'edit'}
            className={`hologram-block ${selectedBlock?.id === block.id ? 'selected' : ''} ${draggingBlockId === block.id ? 'dragging' : ''}`}
            data-theme-surface="card"
            data-impact={block.impact}
            onClick={() => setSelectedBlockId(block.id)}
            onDragStart={(event) => { event.dataTransfer.setData('text/plain', block.id); setDraggingBlockId(block.id); }}
            onDragEnd={() => setDraggingBlockId(null)}
            onDragOver={(event) => { if (mode === 'edit') event.preventDefault(); }}
            onDrop={(event) => { event.preventDefault(); const activeId = event.dataTransfer.getData('text/plain'); if (activeId) moveBlock(activeId, block.id); setDraggingBlockId(null); }}
          >
            <div><p>{block.region}</p><h4>{block.title}</h4><span>{block.description}</span></div>
            <aside><span className="hologram-chip">{impactLabel(block.impact)}</span><span className="hologram-chip">{block.status}</span>{block.locked ? <span className="hologram-chip locked">locked</span> : <span className="hologram-chip">drag-ready</span>}</aside>
          </article>)}
        </div> : null}
      </section>

      <aside className="hologram-inspector" data-theme-surface="card" aria-label="Inspector panel">
        <div className="hologram-section-header"><div><p>Inspector</p><h3>{selectedBlock?.title || 'Select block'}</h3></div><span className="hologram-chip">Risk {Math.min(100, riskScore)}</span></div>
        {selectedBlock ? <div className="hologram-inspector-stack">
          <label><span>Component type</span><input readOnly value={selectedBlock.type} /></label>
          <label><span>Region</span><input readOnly value={selectedBlock.region} /></label>
          <label><span>Allowed roles</span><input readOnly value={selectedBlock.roles.map(roleLabel).join(', ')} /></label>
          <label><span>Guardrail</span><textarea readOnly value={selectedBlock.locked ? 'Locked system block. Move only through developer-approved migration.' : 'Draft-editable block. Drag order changes stay local until backend publish is wired.'} /></label>
        </div> : null}
      </aside>
    </div>

    <div className="hologram-bottom-grid">
      <article data-theme-surface="card"><p>5 Custom Features</p><h3>Impact controls</h3><ul><li>Visual Layout Builder</li><li>Navigation Builder</li><li>Theme Studio</li><li>Content + Context Editor</li><li>AI Proposal Gate</li></ul></article>
      <article data-theme-surface="card"><p>Publish Center</p><h3>Guarded proposal</h3><span>AI proposes. Master previews. Guards validate. Publish and rollback are backend-gated in the next phase.</span></article>
      <article data-theme-surface="card"><p>Required guards</p><h3>Before publish</h3><div className="hologram-guard-list">{HOLOGRAM_GUARD_COMMANDS.slice(0, 5).map((command) => <code key={command}>{command}</code>)}</div></article>
    </div>
  </section>;
}
