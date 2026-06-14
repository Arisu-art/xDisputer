#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function writeIfChanged(path, before, after, label) {
  if (before === after) {
    console.log(`${label} already present.`);
    return;
  }
  writeFileSync(path, after);
  console.log(`Applied ${label}.`);
}

function wireAdminSidebarSwitch() {
  const path = 'app/admin/page.tsx';
  if (!existsSync(path)) return;

  const before = readFileSync(path, 'utf8');
  let source = before;

  source = source.replace(/\n\s*<ConsoleNavLink href="\/manager-workspace">Manager workspace<\/ConsoleNavLink>/g, '');
  source = source.replace(/\n\s*<div className="manager-workspace-switch-card">[\s\S]*?<\/div>\n\s*<div className="admin-monitor-account">/g, '\n\n        <div className="admin-monitor-account">');

  const switchCard = `\n        <div className="manager-workspace-switch-card">\n          <ConsoleNavLink className="manager-workspace-switch-button" href="/manager-workspace">\n            <span className="manager-workspace-switch-pulse" aria-hidden="true" />\n            <span className="manager-workspace-switch-copy">\n              <strong>Switch mode</strong>\n              <small>Manager workspace</small>\n            </span>\n          </ConsoleNavLink>\n        </div>\n`;

  source = source.replace('\n        <div className="admin-monitor-account">', `${switchCard}\n        <div className="admin-monitor-account">`);

  writeIfChanged(path, before, source, 'manager workspace bottom-left switch');
}

function wireCss() {
  const path = 'app/globals.css';
  if (!existsSync(path)) return;

  const before = readFileSync(path, 'utf8');
  const markerStart = '/* manager workspace switch mode */';
  const markerEnd = '/* end manager workspace switch mode */';
  const block = `${markerStart}\n.manager-workspace-switch-card {\n  margin-top: auto;\n  padding-top: 18px;\n  border-top: 1px solid rgba(100, 116, 139, .18);\n}\n\n.manager-workspace-switch-button {\n  position: relative;\n  width: 100%;\n  min-height: 62px;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 14px;\n  border-radius: 18px;\n  color: #eff6ff;\n  text-decoration: none;\n  background: linear-gradient(135deg, #2563eb, #7c3aed);\n  box-shadow: 0 16px 36px rgba(37, 99, 235, .26);\n  transform: translateZ(0);\n  overflow: hidden;\n  isolation: isolate;\n  animation: managerSwitchLift 2400ms ease-in-out infinite;\n}\n\n.manager-workspace-switch-button::after {\n  content: '';\n  position: absolute;\n  inset: -45% -25%;\n  z-index: -1;\n  background: linear-gradient(90deg, transparent, rgba(255,255,255,.32), transparent);\n  transform: translateX(-65%) rotate(12deg);\n  animation: managerSwitchShine 3000ms ease-in-out infinite;\n}\n\n.manager-workspace-switch-button:hover,\n.manager-workspace-switch-button:focus-visible {\n  transform: translateY(-2px);\n  box-shadow: 0 20px 46px rgba(37, 99, 235, .36);\n}\n\n.manager-workspace-switch-pulse {\n  width: 14px;\n  height: 14px;\n  flex: none;\n  border-radius: 999px;\n  background: #bbf7d0;\n  box-shadow: 0 0 0 0 rgba(187, 247, 208, .72);\n  animation: managerSwitchPulse 1600ms ease-out infinite;\n}\n\n.manager-workspace-switch-copy {\n  display: grid;\n  gap: 2px;\n  min-width: 0;\n}\n\n.manager-workspace-switch-copy strong {\n  font-size: 13px;\n  line-height: 1.1;\n  letter-spacing: .02em;\n  text-transform: uppercase;\n}\n\n.manager-workspace-switch-copy small {\n  color: rgba(239, 246, 255, .86);\n  font-size: 12px;\n  line-height: 1.2;\n}\n\n@keyframes managerSwitchPulse {\n  0% { box-shadow: 0 0 0 0 rgba(187, 247, 208, .72); }\n  70% { box-shadow: 0 0 0 12px rgba(187, 247, 208, 0); }\n  100% { box-shadow: 0 0 0 0 rgba(187, 247, 208, 0); }\n}\n\n@keyframes managerSwitchShine {\n  0%, 35% { transform: translateX(-75%) rotate(12deg); }\n  62%, 100% { transform: translateX(95%) rotate(12deg); }\n}\n\n@keyframes managerSwitchLift {\n  0%, 100% { translate: 0 0; }\n  50% { translate: 0 -2px; }\n}\n${markerEnd}`;

  const pattern = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}\\n?`, 'g');
  const cleaned = before.replace(pattern, '').trimEnd();
  const after = `${cleaned}\n\n${block}\n`;

  writeIfChanged(path, before, after, 'manager workspace switch CSS');
}

wireAdminSidebarSwitch();
wireCss();
