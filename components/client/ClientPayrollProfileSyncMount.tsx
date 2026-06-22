'use client';

import { useEffect } from 'react';

const WORKSPACE_PREFERENCES_KEY = 'lettergenerator-workspace-preferences-v1';

type PayrollProfile = {
  employmentType: 'full_time' | 'output_based';
  isOutputBased: boolean;
  isFullTime: boolean;
};

function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem(WORKSPACE_PREFERENCES_KEY) || '{}') as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function writePerOutputDefault(value: boolean) {
  const current = readPreferences();
  localStorage.setItem(WORKSPACE_PREFERENCES_KEY, JSON.stringify({ ...current, perOutputGenerationDefault: value }));
}

function normalizeProfile(payload: unknown): PayrollProfile | null {
  if (!payload || typeof payload !== 'object' || !('profile' in payload)) return null;
  const profile = (payload as { profile?: Partial<PayrollProfile> }).profile;
  if (!profile) return null;
  const employmentType = profile.employmentType === 'output_based' ? 'output_based' : 'full_time';
  return { employmentType, isOutputBased: employmentType === 'output_based', isFullTime: employmentType === 'full_time' };
}

function syncClientIntentCard(profile: PayrollProfile) {
  const card = document.querySelector<HTMLElement>('[data-output-activity-client-intent="true"]');
  if (!card) return;

  card.dataset.clientOutputProfile = profile.employmentType;
  const title = card.querySelector('strong');
  const copy = card.querySelector('p');
  const input = card.querySelector<HTMLInputElement>('input[type="checkbox"]');
  const labelText = card.querySelector('label span');

  if (profile.isOutputBased) {
    card.classList.add('locked');
    card.classList.remove('optional');
    card.hidden = true;
    card.setAttribute('aria-hidden', 'true');
    card.style.display = 'none';
    if (title) title.textContent = 'Per-output profile';
    if (copy) copy.textContent = 'Every generated letter is automatically sent for manager confirmation.';
    if (input) {
      input.checked = true;
      input.disabled = true;
      input.setAttribute('aria-disabled', 'true');
    }
    if (labelText) labelText.textContent = 'Per-output automatic';
    return;
  }

  card.hidden = false;
  card.removeAttribute('aria-hidden');
  card.style.removeProperty('display');
  card.classList.add('optional');
  card.classList.remove('locked');
  if (title) title.textContent = 'Full-time per-output add-on';
  if (copy) copy.textContent = 'Your profile is full-time. Generate as fixed-salary work by default, or mark this packet as a per-output add-on for manager confirmation.';
  if (input) {
    input.disabled = false;
    input.removeAttribute('aria-disabled');
  }
  if (labelText) labelText.textContent = 'Make this packet per-output';
}

export default function ClientPayrollProfileSyncMount() {
  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    async function sync() {
      const response = await fetch('/api/client/payroll-profile', { cache: 'no-store', headers: { accept: 'application/json', 'cache-control': 'no-store' } });
      if (!response.ok) return;
      const profile = normalizeProfile(await response.json().catch(() => null));
      if (!profile || cancelled) return;

      document.body.dataset.clientPayrollEmploymentType = profile.employmentType;
      if (profile.isOutputBased) writePerOutputDefault(true);
      syncClientIntentCard(profile);

      observer = new MutationObserver(() => syncClientIntentCard(profile));
      observer.observe(document.body, { childList: true, subtree: true });
    }

    void sync().catch(() => undefined);

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  return null;
}
