#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const path = 'components/LetterGeneratorWorkspaceV2.tsx';
if (!existsSync(path)) process.exit(0);
const before = readFileSync(path, 'utf8');
let source = before;

function ensureImport(anchor, line) {
  if (source.includes(line)) return;
  source = source.replace(anchor, `${anchor}\n${line}`);
}

ensureImport(
  "import { buildGenerationManifest, generationManifestText, normalizeGeneratedOutputForManifest, type GenerationManifest } from '../lib/generation-manifest';",
  "import type { ManagerTemplateScopeUi } from '../lib/manager-template-ui';"
);
ensureImport(
  "import type { ManagerTemplateScopeUi } from '../lib/manager-template-ui';",
  "import { canUseLocalTemplateFallback, resolveManagerTemplateFile, type ManagerTemplateFileAsset } from '../lib/manager-template-file-resolver';"
);

source = source.replace(
  "  const [registryAssets, setRegistryAssets] = useState<RegistryTemplateAsset[]>([]);",
  "  const [registryAssets, setRegistryAssets] = useState<RegistryTemplateAsset[]>([]);\n  const [managerTemplateScope, setManagerTemplateScope] = useState<ManagerTemplateScopeUi | null>(null);"
);
source = source.replace(/(?:\s*const \[managerTemplateScope, setManagerTemplateScope\] = useState<ManagerTemplateScopeUi \| null>\(null\);\n){2,}/g, '  const [managerTemplateScope, setManagerTemplateScope] = useState<ManagerTemplateScopeUi | null>(null);\n');

source = source.replace(
  "        if (!cancelled) setRegistryAssets(Array.isArray(payload.assets) ? payload.assets : []);",
  "        if (!cancelled) {\n          setRegistryAssets(Array.isArray(payload.assets) ? payload.assets : []);\n          setManagerTemplateScope(payload.managerTemplateScope || null);\n        }"
);
source = source.replace(
  "        if (!cancelled) setRegistryAssets([]);",
  "        if (!cancelled) {\n          setRegistryAssets([]);\n          setManagerTemplateScope(null);\n        }"
);

source = source.replace(/source: 'SUPABASE_TEMPLATE_ASSET'/g, "source: 'MANAGER_TEMPLATE_ASSET'");
source = source.replace(
  "  const missingLetters = Array.from(new Set(routes.map((route) => route.type))).filter((type) => !refs.find((item) => item.type === type)?.file);",
  "  const missingLetters = Array.from(new Set(routes.map((route) => route.type))).filter((type) => !effectiveRefs.find((item) => item.type === type)?.file);"
);

source = source.replace(
  "  function refBlob(type: LetterType) { const slot = refs.find((item) => item.type === type); return slot ? readReferenceFile(slot.id) : Promise.resolve(null); }",
  "  function refBlob(type: LetterType) { if (!canUseLocalTemplateFallback(managerTemplateScope || undefined)) return Promise.resolve(null); const slot = refs.find((item) => item.type === type); return slot ? readReferenceFile(slot.id) : Promise.resolve(null); }"
);
source = source.replace(
  "  function exhibitBlob(kind: ExhibitKind) { return readTemplateExhibit(round, kind); }",
  "  function exhibitBlob(kind: ExhibitKind) { return canUseLocalTemplateFallback(managerTemplateScope || undefined) ? readTemplateExhibit(round, kind) : Promise.resolve(null); }"
);
source = source.replace(
  /  async function assetBlob\(kind: ExhibitKind\) \{[\s\S]*?\n  \}\n  async function letterBlob/m,
  "  async function assetBlob(kind: ExhibitKind) {\n    return resolveManagerTemplateFile({ round, assets: registryAssets as ManagerTemplateFileAsset[], exhibitKind: kind, localBlob: await exhibitBlob(kind), allowLocalFallback: canUseLocalTemplateFallback(managerTemplateScope || undefined) });\n  }\n  async function letterBlob"
);
source = source.replace(
  /  async function letterBlob\(type: LetterType\) \{[\s\S]*?\n  \}\n  async function affidavit/m,
  "  async function letterBlob(type: LetterType) {\n    return resolveManagerTemplateFile({ round, assets: registryAssets as ManagerTemplateFileAsset[], letterType: type, localBlob: await refBlob(type), allowLocalFallback: canUseLocalTemplateFallback(managerTemplateScope || undefined) });\n  }\n  async function affidavit"
);
source = source.replace(
  "        references: refs,\n        templates,",
  "        references: effectiveRefs,\n        templates: effectiveTemplates,"
);
source = source.replace(
  "<TemplateProgressiveWorkspace round={round} slots={refs} supportingReady={evidence.supporting.length > 0}",
  "<TemplateProgressiveWorkspace round={round} slots={effectiveRefs} supportingReady={evidence.supporting.length > 0} managerTemplateScope={managerTemplateScope} managedExhibits={effectiveTemplates}"
);

if (source !== before) {
  writeFileSync(path, source);
  console.log('Applied manager template generation wiring.');
} else {
  console.log('Manager template generation wiring already present.');
}
