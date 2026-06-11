import type { LetterRoute, LetterType, ParsedSource } from './letter-engine';
import type { LetterReference, Round } from './reference-store';
import type { TemplateExhibits } from './template-exhibits';
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
  version: '1.0.0';
  generatedAt: string;
  clientName: string;
  round: Round;
  routeCount: number;
  bureaus: string[];
  roundPolicy: ReturnType<typeof roundTemplateSnapshot>;
  outputs: GeneratedOutputManifestItem[];
  warnings: string[];
};

function cleanManifestPart(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
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
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    clientName: input.parsed.name || 'Unknown client',
    round: input.round,
    routeCount: input.routes.length,
    bureaus: Array.from(new Set(input.routes.map((route) => route.bureau))),
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
    `Round: ${manifest.round}`,
    `Route Count: ${manifest.routeCount}`,
    `Bureaus: ${manifest.bureaus.join(', ') || 'None'}`,
    `Ready: ${manifest.roundPolicy.ready ? 'Yes' : 'No'}`,
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
