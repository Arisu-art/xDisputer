import { bureaus, type LetterRoute, type ParsedSource } from './letter-engine';
import { generationPacketPositions } from './generation-contract';
import type { PacketAssets } from './packet-assets';
import type { LetterReference } from './reference-store';
import type { TemplateExhibits } from './template-exhibits';
import type { WorkspacePreferences } from './workspace-preferences';
import { userFacingText } from './ux-copy-contract';
import { resolveRoundTemplateSelection } from './round-template-policy';

export type PreflightSeverity = 'pass' | 'warning' | 'blocker';

export type PreflightCheck = {
  id: string;
  label: string;
  severity: PreflightSeverity;
  detail: string;
};

export type GenerationPreflightInput = {
  round?: string | null;
  source: string;
  normalized: boolean;
  parsed: ParsedSource;
  routes: LetterRoute[];
  references: LetterReference[];
  templates: TemplateExhibits;
  evidence: PacketAssets;
  affidavitReady: boolean;
  customReady: boolean;
  strictValidation: boolean;
  preferences?: WorkspacePreferences;
};

export type GenerationPreflightResult = {
  ready: boolean;
  blockers: PreflightCheck[];
  warnings: PreflightCheck[];
  checks: PreflightCheck[];
  summary: string;
};

const pass = (id: string, label: string, detail: string): PreflightCheck => ({ id, label, severity: 'pass', detail });
const warn = (id: string, label: string, detail: string): PreflightCheck => ({ id, label, severity: 'warning', detail });
const block = (id: string, label: string, detail: string): PreflightCheck => ({ id, label, severity: 'blocker', detail });

function countDisputeAccounts(parsed: ParsedSource) {
  return bureaus.reduce((total, bureau) => total + parsed.dispute[bureau].length, 0);
}

function countHardInquiries(parsed: ParsedSource) {
  return bureaus.reduce((total, bureau) => total + parsed.inquiry[bureau].length, 0);
}

function countLatePayments(parsed: ParsedSource) {
  return bureaus.reduce((total, bureau) => total + parsed.late[bureau].length, 0);
}

export function evaluateGenerationPreflight(input: GenerationPreflightInput): GenerationPreflightResult {
  const checks: PreflightCheck[] = [];
  const sourceReady = Boolean(input.source.trim() && input.normalized && input.parsed.name.trim());
  checks.push(sourceReady
    ? pass('source.locked', 'Client profile ready', `${input.parsed.name} is ready for document preparation.`)
    : block('source.locked', 'Client profile ready', 'Import or standardize the client profile before preparing documents.'));

  checks.push(input.routes.length
    ? pass('routes.detected', 'Document paths ready', `${input.routes.length} document path(s) are ready.`)
    : block('routes.detected', 'Document paths ready', 'No dispute or late-payment document paths were detected from the client profile.'));

  const disputeAccounts = countDisputeAccounts(input.parsed);
  const hardInquiries = countHardInquiries(input.parsed);
  const latePayments = countLatePayments(input.parsed);

  if (disputeAccounts) checks.push(pass('source.dispute-accounts', 'Disputed accounts', `${disputeAccounts} disputed account(s) ready.`));
  else if (input.routes.some((route) => route.type === 'DISPUTE')) checks.push(block('source.dispute-accounts', 'Disputed accounts', 'A dispute document is selected, but no disputed accounts were found.'));
  else checks.push(warn('source.dispute-accounts', 'Disputed accounts', 'No disputed account section is active.'));

  // Hard inquiries are optional. Only show this checklist item when the client source actually includes inquiries.
  // If no hard inquiries are present, the checklist remains clean and generation is still valid.
  if (hardInquiries > 0) checks.push(pass('source.hard-inquiries', 'Hard inquiries', `${hardInquiries} hard inquiry item(s) ready.`));

  if (input.routes.some((route) => route.type === 'LATE_PAYMENT')) {
    checks.push(latePayments
      ? pass('source.late-payments', 'Late payments', `${latePayments} late-payment item(s) ready.`)
      : block('source.late-payments', 'Late payments', 'A late-payment document is selected, but no late-payment items were found.'));
  }

  const roundSelection = resolveRoundTemplateSelection({
    round: input.round,
    routes: input.routes,
    references: input.references,
    templates: input.templates
  });

  checks.push(roundSelection.missingLetterTypes.length
    ? block('templates.letters', `${roundSelection.round} letter templates`, `Missing required ${roundSelection.round} letter template(s): ${roundSelection.missingLetterTypes.map((type) => type === 'DISPUTE' ? 'Dispute Letter' : 'Late Payment Letter').join(', ')}.`)
    : pass('templates.letters', `${roundSelection.round} letter templates`, `All active ${roundSelection.round} letter templates are ready.`));

  checks.push(roundSelection.missingExhibits.length
    ? block('templates.exhibits', `${roundSelection.round} packet templates`, `Missing required ${roundSelection.round} packet item(s): ${roundSelection.missingExhibits.join(', ')}.`)
    : pass('templates.exhibits', `${roundSelection.round} packet templates`, `Required ${roundSelection.round} packet templates are ready.`));

  for (const issue of roundSelection.issues.filter((item) => item.severity === 'warning')) {
    checks.push(warn(issue.code, `${roundSelection.round} policy`, issue.message));
  }

  const activeTypes = Array.from(new Set(input.routes.map((route) => route.type)));

  checks.push(input.evidence.supporting.length
    ? pass('evidence.supporting', 'Supporting documents', `${input.evidence.supporting.length} supporting document image(s) ready.`)
    : block('evidence.supporting', 'Supporting documents', 'Upload at least one supporting document image before preparing the package.'));

  checks.push(input.affidavitReady
    ? pass('affidavit.jurisdiction', 'Affidavit location', 'Affidavit state and county are ready, or no affidavit review is required.')
    : block('affidavit.jurisdiction', 'Affidavit location', 'Review the affidavit state and county before preparing documents.'));

  checks.push(input.customReady
    ? pass('templates.custom-fields', 'Custom fields', 'Required custom fields are complete.')
    : block('templates.custom-fields', 'Custom fields', 'A selected template has required custom fields that are still blank.'));

  const packetOrders = activeTypes.map((type) => `${type}: ${generationPacketPositions(type).map((position) => `${String(position.sequence).padStart(2, '0')} ${position.label}`).join(' → ')}`);
  checks.push(pass('packet.order', 'Package order', packetOrders.length ? packetOrders.join(' | ') : 'No package order is active yet.'));

  const blockers = checks.filter((check) => check.severity === 'blocker');
  const warnings = checks.filter((check) => check.severity === 'warning');
  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    checks,
    summary: blockers.length ? `Action required: ${blockers.length} checklist item(s) need attention.` : warnings.length ? `Workspace ready with ${warnings.length} item(s) to review.` : 'Workspace ready.'
  };
}

export function preflightFailureMessage(result: GenerationPreflightResult) {
  if (result.ready) return '';
  return userFacingText(`${result.summary} ${result.blockers.map((item) => item.detail).join(' ')}`, 'error');
}
