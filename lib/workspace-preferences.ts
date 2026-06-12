import type { Round } from './reference-store';

export type GuidanceMode = 'guided' | 'focused';

export type WorkspacePreferences = {
  defaultRound: Round;
  strictValidation: boolean;
  openTrackerAfterFinalization: boolean;
  guidanceMode: GuidanceMode;
};

const KEY = 'lettergenerator-workspace-preferences-v1';

function normalizeGuidanceMode(value: unknown): GuidanceMode {
  return value === 'focused' ? 'focused' : 'guided';
}

export const defaultWorkspacePreferences: WorkspacePreferences = {
  defaultRound: '1st Round',
  strictValidation: false,
  openTrackerAfterFinalization: false,
  guidanceMode: 'guided'
};

export function loadWorkspacePreferences(): WorkspacePreferences {
  if (typeof window === 'undefined') return defaultWorkspacePreferences;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<WorkspacePreferences>;
    return {
      defaultRound: saved.defaultRound || defaultWorkspacePreferences.defaultRound,
      strictValidation: Boolean(saved.strictValidation),
      openTrackerAfterFinalization: Boolean(saved.openTrackerAfterFinalization),
      guidanceMode: normalizeGuidanceMode(saved.guidanceMode)
    };
  } catch {
    return defaultWorkspacePreferences;
  }
}

export function saveWorkspacePreferences(preferences: WorkspacePreferences) {
  const normalized: WorkspacePreferences = {
    ...defaultWorkspacePreferences,
    ...preferences,
    guidanceMode: normalizeGuidanceMode(preferences.guidanceMode)
  };

  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(normalized));
  return normalized;
}
