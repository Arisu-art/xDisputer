'use client';

import { useId, useState } from 'react';

type EmploymentType = 'full_time' | 'output_based';

type Props = {
  profileId: string;
  initialEmploymentType: EmploymentType;
  initialBaseSalary: number;
  initialPerOutputRate: number;
  initialNotes?: string | null;
};

function moneyInput(value: number) {
  return Number.isFinite(value) ? String(Math.max(0, value)) : '0';
}

export default function ManagerPayrollSettingsEditor({ profileId, initialEmploymentType, initialBaseSalary, initialPerOutputRate, initialNotes }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [employmentType, setEmploymentType] = useState<EmploymentType>(initialEmploymentType);
  const [fullTimeSalary, setFullTimeSalary] = useState(moneyInput(initialBaseSalary));
  const salaryLocked = employmentType === 'output_based';

  return <div className="manager-user-settings-details manager-user-settings-client-modal">
    <button type="button" className="manager-user-settings-open" onClick={() => setOpen(true)}>Edit metadata</button>
    {open && <div className="manager-user-settings-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <form action="/api/manager-console/payroll" method="post" className="manager-user-settings-form manager-user-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="metadata-modal-close" aria-label="Close metadata editor" onClick={() => setOpen(false)}>×</button>
        <input type="hidden" name="profileId" value={profileId} />
        <label className="client-status-job-field" htmlFor={`${id}-employment`}>
          <span>Client status / job description</span>
          <select
            id={`${id}-employment`}
            name="employmentType"
            value={employmentType}
            onChange={(event) => {
              const next = event.target.value === 'output_based' ? 'output_based' : 'full_time';
              setEmploymentType(next);
            }}
          >
            <option value="full_time">Full-time</option>
            <option value="output_based">Per-output</option>
          </select>
        </label>
        <label className="manager-user-settings-notes" htmlFor={`${id}-notes`}>
          <span>Note</span>
          <input id={`${id}-notes`} name="notes" defaultValue={initialNotes || ''} placeholder="Optional manager note" />
        </label>
        <p className="metadata-rule-hint">Per-output users require manager confirmation for every generated output. Full-time users keep fixed salary and can receive confirmed per-output add-ons.</p>
        {salaryLocked && <input type="hidden" name="baseSalary" value="0" />}
        <label className={`metadata-salary-field ${salaryLocked ? 'is-locked' : ''}`} htmlFor={`${id}-salary`}>
          <span>Salary</span>
          <input
            id={`${id}-salary`}
            name="baseSalary"
            inputMode="decimal"
            value={salaryLocked ? '0' : fullTimeSalary}
            disabled={salaryLocked}
            aria-disabled={salaryLocked}
            placeholder={salaryLocked ? 'Blocked for per-output profile' : undefined}
            onChange={(event) => setFullTimeSalary(event.target.value)}
          />
          <small>{salaryLocked ? 'Blocked because this client is per-output only.' : 'Fixed salary for full-time profile.'}</small>
        </label>
        <label className="metadata-output-rate-field" htmlFor={`${id}-rate`}>
          <span>Output per rate</span>
          <input id={`${id}-rate`} name="perOutputRate" inputMode="decimal" defaultValue={moneyInput(initialPerOutputRate)} />
        </label>
        <button type="submit" className="admin-action-button primary">Save metadata</button>
      </form>
    </div>}
  </div>;
}
