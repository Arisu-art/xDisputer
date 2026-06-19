export type WorkflowStepId = 'templates' | 'source-data' | 'validation' | 'generate' | 'review' | 'finalize';

export type WorkflowStep = {
  id: WorkflowStepId;
  label: string;
  state: 'complete' | 'active' | 'blocked' | 'pending';
  detail: string;
};

const defaultSteps: readonly WorkflowStep[] = [
  { id: 'templates', label: 'Templates', state: 'complete', detail: 'Template routing is selected before source review.' },
  { id: 'source-data', label: 'Source Data', state: 'active', detail: 'Normalize and verify client Notepad data.' },
  { id: 'validation', label: 'Validation', state: 'pending', detail: 'Confirm scope, affidavit data, required fields, and blockers.' },
  { id: 'generate', label: 'Generate', state: 'pending', detail: 'Generate after visible blockers are cleared.' },
  { id: 'review', label: 'Review Outputs', state: 'pending', detail: 'Review ordered output packages.' },
  { id: 'finalize', label: 'Finalize', state: 'pending', detail: 'Finalize delivery package after output review.' }
] as const;

export type WorkflowRailProps = {
  activeStep?: WorkflowStepId;
  blockers?: readonly string[];
  steps?: readonly WorkflowStep[];
};

export default function WorkflowRail({ activeStep = 'source-data', blockers = [], steps = defaultSteps }: WorkflowRailProps) {
  const normalizedSteps = steps.map((step) => ({
    ...step,
    state: blockers.length && step.id === activeStep ? 'blocked' : step.id === activeStep ? 'active' : step.state
  }));

  return <aside className="generation-workflow-rail" data-modernization-feature="generation" data-modernization-owner="src/features/generation" aria-label="Generation workflow status">
    <div className="generation-workflow-rail-header">
      <p className="eyebrow">Workflow control</p>
      <strong>Generation readiness</strong>
      <span>{blockers.length ? `${blockers.length} visible blocker${blockers.length === 1 ? '' : 's'}` : 'Current step is ready'}</span>
    </div>
    <ol className="generation-workflow-rail-list">
      {normalizedSteps.map((step, index) => <li key={step.id} data-step-state={step.state} aria-current={step.id === activeStep ? 'step' : undefined}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <div><strong>{step.label}</strong><small>{step.detail}</small></div>
      </li>)}
    </ol>
  </aside>;
}
