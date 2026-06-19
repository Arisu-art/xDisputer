#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const must = (source, text, label) => { if (!source.includes(text)) failures.push(label); };
const mustNot = (source, text, label) => { if (source.includes(text)) failures.push(label); };

const layout = read('app/layout.tsx');
const debuggerMount = read('components/console/RenderDebuggerMount.tsx');
const sourceReview = read('components/SourceReviewAiPanel.tsx');
const sourceReadiness = read('src/features/source-data/source-readiness.ts');
const generationReadiness = read('src/features/generation/readiness.ts');

must(layout, '<RenderDebuggerMount />', 'root layout must use lazy RenderDebuggerMount');
mustNot(layout, "import RenderDebugger from '../components/console/RenderDebugger'", 'root layout must not directly import RenderDebugger');
must(debuggerMount, "dynamic(() => import('./RenderDebugger')", 'RenderDebugger must be dynamically imported');
must(debuggerMount, 'ssr: false', 'RenderDebugger must stay client-only');
must(sourceReview, "dynamic(() => import('./AiInsightPanel')", 'AI insight panel must be dynamically imported');
must(sourceReview, "await import('../lib/ai/ai-ui-client')", 'AI review client must load only when review runs');
must(sourceReadiness, 'firstSourceDataReadinessBlocker', 'source readiness utility must exist');
must(generationReadiness, 'packetIsReady', 'generation readiness utility must exist');
must(generationReadiness, 'uniqueBlockers', 'generation blocker dedupe utility must exist');

if (failures.length) {
  console.error(`performance-modernization-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('performance-modernization-guard: ok');
