export type UxPanel = string;
export type UxTone = 'info' | 'success' | 'error';

const sourceDataPanel = 'Source Data';
const outputsPanel = 'Outputs';

export type UxVisibilityInput = {
  /**
   * Panel names are owned by the workspace shell. This contract only needs to
   * know which panels require special warning/preflight behavior, so it accepts
   * any current or future panel label without breaking typecheck when navigation
   * changes.
   */
  panel: UxPanel;
  statusTone: UxTone;
  hasSource: boolean;
  hasPreflightBlockers: boolean;
  hasPreflightWarnings: boolean;
  generateAttempted: boolean;
  busy: boolean;
  hasGeneratedOutput: boolean;
};

export type UxVisibilityRules = {
  showHeaderNextAction: boolean;
  showStatusText: boolean;
  showPreflightPanel: boolean;
  showOutputWarnings: boolean;
  showBusyState: boolean;
  allowGlobalWarningSurface: boolean;
  compressEmptyAssetContainers: boolean;
  hideSecondaryManagementTools: boolean;
};

export function resolveUxVisibility(input: UxVisibilityInput): UxVisibilityRules {
  const blockedAfterGenerate = input.generateAttempted && input.statusTone === 'error' && input.hasPreflightBlockers;
  const reviewNeededAfterGenerate = input.generateAttempted && input.statusTone === 'error' && input.hasPreflightWarnings;

  return {
    showHeaderNextAction: true,
    showStatusText: input.statusTone === 'success' || input.statusTone === 'error' || input.busy,
    showPreflightPanel: input.panel === sourceDataPanel && input.hasSource && (blockedAfterGenerate || reviewNeededAfterGenerate),
    showOutputWarnings: input.panel === outputsPanel && input.hasGeneratedOutput,
    showBusyState: input.busy,
    allowGlobalWarningSurface: false,
    compressEmptyAssetContainers: true,
    hideSecondaryManagementTools: true
  };
}

export function shouldKeepMainLayoutQuiet(rules: UxVisibilityRules) {
  return !rules.showStatusText && !rules.showPreflightPanel && !rules.showBusyState;
}

export function shouldRevealPreflightAfterAction(rules: UxVisibilityRules) {
  return rules.showPreflightPanel;
}
