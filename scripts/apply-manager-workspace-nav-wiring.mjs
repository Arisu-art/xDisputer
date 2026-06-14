#!/usr/bin/env node
import { assertLegacyUiAutofixAllowed } from './_legacy-ui-autofix.mjs';

assertLegacyUiAutofixAllowed('apply-manager-workspace-nav-wiring.mjs');
console.log('Legacy manager workspace nav autofix is intentionally disabled in normal workflows. Use explicit source edits and npm run ui-source:guard.');
