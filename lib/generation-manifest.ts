import type { LetterRoute, LetterType, ParsedSource } from './letter-engine';
import type { LetterReference, Round } from './reference-store';
import type { ExhibitKind, TemplateExhibits } from './template-exhibits';
import { roundTemplateSnapshot } from './round-template-policy';

export type GeneratedOutputManifestItem = {
  id: string;
  path: string;
  type: LetterType;
  role: string;
  bureau: string;
  sequence: number;
  count: number;
};

export type ManifestTemplateSource = 'LOCAL_BROWSER' | 'SUPABASE_TEMPLATE_ASSET' | 'UNKNOWN';

export type GenerationTemplateManifestItem = {
  slot: string;
  source: ManifestTemplateSource;
  assetId: string | null;
  fileName: string;
  templateKind: 'LETTER' | 'EXHIBIT';
  letterType: LetterType | null;
  exhibitKind: ExhibitKind | null;
  versionNumber: number | null;
  contentHash: string | null;
  validationStatus: string | null;
  validationConfidence: number | null;
  missingFields: string[];
  unknownRequiredFields: string[];
  warnings: string[];
};

export type ManifestOutputInput = {
  id?: string;
  path: string;
  type: LetterType;
  role?: string;
  bureau?: string;
  sequence?: number;
  count?: number;
};

export type GenerationManifest = {
  version: '1.1.0';
  generatedAt: string;
  clientName: string;
  sourceHash: string;
  sourceSummary: {
    addressLineCount: number;
    disputeAccountCount: number;
    hardInquiryCount: number;
    latePaymentCount: number;
    customFieldCount: number;
  };
  round: Round;
  routeCount: number;
  bureaus: string[];
  templates: GenerationTemplateManifestItem[];
  roundPolicy: ReturnType<typeof roundTemplateSnapshot>;
  outputs: GeneratedOutputManifestItem[];
  warnings: string[];
};

type TemplateCarrier = {
  assetId?: string | null;
  source?: ManifestTemplateSource;
  versionNumber?: number | null;
  contentHash?: string | null;
  validationJson?: Record<string, unknown> | null;
};

function cleanManifestPart(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function stableHash(value: unknown) {
  const text = stableStringify(value);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function validationFromCarrier(carrier: TemplateCarrier, contract: unknown) {
  const validationJson = carrier.validationJson || {};
  const contractValidation = typeof contract === 'object' && contract && 'validation' in contract
    ? (contract as { validation?: Record<string, unknown> }).validation || {}
    : {};
  const status = validationJson.status || contractValidation.status || null;
  const confidence = validationJson.confidence ?? contractValidation.confidence ?? null;

  return {
    status: typeof status === 'string' ? status : null,
    confidence: typeof confidence === 'number' ? confidence : null,
    missingFields: safeStringArray(validationJson.missingFields || contractValidation.missingFields),
    unknownRequiredFields: safeStringArray(validationJson.unknownRequiredFields || contractValidation.unknownRequiredFields),
    warnings: safeStringArray(validationJson.warnings || contractValidation.warnings)
  };
}

function sourceSummary(parsed: ParsedSource) {
  return {
    addressLineCount: parsed.address.length,
    disputeAccountCount: Object.values(parsed.dispute).reduce((total, items) => total + items.length, 0),
    hardInquiryCount: Object.values(parsed.inquiry).reduce((total, items) => total + items.length, 0),
    latePaymentCount: Object.values(parsed.late).reduce((total, items) => total + items.length, 0),
    customFieldCount: Object.keys(parsed.templateFields || {}).length
  };
}

function sourceHash(parsed: ParsedSource, routes: LetterRoute[]) {
  return stableHash({
    name: parsed.name,
    address: parsed.address,
    dob: parsed.dob,
    ssn: parsed.ssn,
    affidavitState: parsed.affidavitState,
    affidavitCounty: parsed.affidavitCounty,
    templateFields: parsed.templateFields,
    routes: routes.map((route) => ({
      type: route.type,
      bureau: route.bureau,
      reason: route.reason,
      items: route.items.map((item) => item.displayText)
    }))
  });
}

function letterTemplateManifest(slot: LetterReference): GenerationTemplateManifestItem {
  const carrier = slot as LetterReference & TemplateCarrier;
  const validation = validationFromCarrier(carrier, slot.contract);

  return {
    slot: `${slot.round}::LETTER::${slot.type}`,
    source: carrier.source || (carrier.assetId ? 'SUPABASE_TEMPLATE_ASSET' : 'LOCAL_BROWSER'),
    assetId: carrier.assetId || null,
    fileName: slot.file || slot.name,
    templateKind: 'LETTER',
    letterType: slot.type,
    exhibitKind: null,
    versionNumber: typeof carrier.versionNumber === 'number' ? carrier.versionNumber : null,
    contentHash: carrier.contentHash || null,
    validationStatus: validation.status,
    validationConfidence: validation.confidence,
    missingFields: validation.missingFields,
    unknownRequiredFields: validation.unknownRequiredFields,
    warnings: validation.warnings
  };
}

function exhibitTemplateManifest(kind: ExhibitKind, asset: NonNullable<TemplateExhibits[ExhibitKind]>): GenerationTemplateManifestItem {
  const carrier = asset as NonNullable<TemplateExhibits[ExhibitKind]> & TemplateCarrier;
  const validation = validationFromCarrier(carrier, asset.contract);

  return {
    slot: `${kind}::EXHIBIT`,
    source: carrier.source || (carrier.assetId ? 'SUPABASE_TEMPLATE_ASSET' : 'LOCAL_BROWSER'),
    assetId: carrier.assetId || (asset.id.startsWith('template-exhibit/') ? null : asset.id),
    fileName: asset.name,
    templateKind: 'EXHIBIT',
    letterType: null,
    exhibitKind: kind,
    versionNumber: typeof carrier.versionNumber === 'number' ? carrier.versionNumber : null,
    contentHash: carrier.contentHash || null,
    validationStatus: validation.status,
    validationConfidence: validation.confidence,
    missingFields: validation.missingFields,
    unknownRequiredFields: validation.unknownRequiredFields,
    warnings: validation.warnings
  };
}

function templateManifestItems(input: {
  references: LetterReference[];
  templates: TemplateExhibits;
}) {
  const letters = input.references
    .filter((slot) => Boolean(slot.file))
    .map(letterTemplateManifest);
  const exhibits = (Object.entries(input.templates) as Array<[ExhibitKind, TemplateExhibits[ExhibitKind]]>)
    .filter(([, asset]) => Boolean(asset))
    .map(([kind, asset]) => exhibitTemplateManifest(kind, asset!));

  return [...letters, ...exhibits];
}

export function normalizeGeneratedOutputForManifest(item: ManifestOutputInput, index: number): GeneratedOutputManifestItem {
  const sequence = typeof item.sequence === 'number' && Number.isFinite(item.sequence)
    ? item.sequence
    : index + 1;

  const role = item.role || 'OUTPUT';
  const bureau = item.bureau || 'CLIENT';

  return {
    id: item.id || `${cleanManifestPart(item.type, 'TYPE')}-${cleanManifestPart(bureau, 'CLIENT')}-${cleanManifestPart(role, 'OUTPUT')}-${sequence}`,
    path: item.path,
    type: item.type,
    role,
    bureau,
    sequence,
    count: typeof item.count === 'number' && Number.isFinite(item.count) ? item.count : 0
  };
}

export function buildGenerationManifest(input: {
  round: Round;
  parsed: ParsedSource;
  routes: LetterRoute[];
  references: LetterReference[];
  templates: TemplateExhibits;
  outputs: GeneratedOutputManifestItem[];
  warnings: string[];
}): GenerationManifest {
  return {
    version: '1.1.0',
    generatedAt: new Date().toISOString(),
    clientName: input.parsed.name || 'Unknown client',
    sourceHash: sourceHash(input.parsed, input.routes),
    sourceSummary: sourceSummary(input.parsed),
    round: input.round,
    routeCount: input.routes.length,
    bureaus: Array.from(new Set(input.routes.map((route) => route.bureau))),
    templates: templateManifestItems({ references: input.references, templates: input.templates }),
    roundPolicy: roundTemplateSnapshot({
      round: input.round,
      routes: input.routes,
      references: input.references,
      templates: input.templates
    }),
    outputs: input.outputs,
    warnings: input.warnings
  };
}

export function generationManifestText(manifest: GenerationManifest) {
  return [
    'GENERATION MANIFEST',
    `Version: ${manifest.version}`,
    `Generated At: ${manifest.generatedAt}`,
    `Client: ${manifest.clientName}`,
    `Source Hash: ${manifest.sourceHash}`,
    `Round: ${manifest.round}`,
    `Route Count: ${manifest.routeCount}`,
    `Bureaus: ${manifest.bureaus.join(', ') || 'None'}`,
    `Ready: ${manifest.roundPolicy.ready ? 'Yes' : 'No'}`,
    '',
    'Source Summary:',
    `- Address Lines: ${manifest.sourceSummary.addressLineCount}`,
    `- Dispute Accounts: ${manifest.sourceSummary.disputeAccountCount}`,
    `- Hard Inquiries: ${manifest.sourceSummary.hardInquiryCount}`,
    `- Late Payments: ${manifest.sourceSummary.latePaymentCount}`,
    `- Custom Fields: ${manifest.sourceSummary.customFieldCount}`,
    '',
    'Templates:',
    ...(manifest.templates.length ? manifest.templates.map((item) => {
      return `- ${item.slot} | ${item.source} | asset ${item.assetId || 'local'} | version ${item.versionNumber ?? 'n/a'} | hash ${item.contentHash || 'n/a'} | status ${item.validationStatus || 'n/a'} | confidence ${item.validationConfidence ?? 'n/a'}`;
    }) : ['- None']),
    '',
    'Packet Order:',
    ...Object.entries(manifest.roundPolicy.packetOrder).map(([type, order]) => {
      return `${type}: ${(order || []).join(' -> ')}`;
    }),
    '',
    'Outputs:',
    ...manifest.outputs.map((item) => {
      return `- ${item.path} | ${item.type} | ${item.role} | ${item.bureau} | sequence ${item.sequence}`;
    }),
    '',
    'Warnings:',
    ...(manifest.warnings.length ? manifest.warnings.map((item) => `- ${item}`) : ['- None'])
  ].join('\n');
}
