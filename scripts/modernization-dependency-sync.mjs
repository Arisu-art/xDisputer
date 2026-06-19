#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const requiredDependencies = {
  '@tanstack/react-query': '^5.90.12',
  zod: '^4.2.1'
};

function readPackageJson() {
  if (!existsSync('package.json')) throw new Error('package.json not found');
  return JSON.parse(readFileSync('package.json', 'utf8'));
}

function writePackageJson(packageJson) {
  writeFileSync('package.json', `${JSON.stringify(packageJson, null, 2)}\n`);
}

function ensureDependencies(packageJson) {
  packageJson.dependencies = packageJson.dependencies || {};
  let changed = false;

  for (const [name, version] of Object.entries(requiredDependencies)) {
    if (packageJson.dependencies[name] !== version) {
      packageJson.dependencies[name] = version;
      changed = true;
    }
  }

  packageJson.dependencies = Object.fromEntries(Object.entries(packageJson.dependencies).sort(([a], [b]) => a.localeCompare(b)));
  return changed;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const packageJson = readPackageJson();
const changed = ensureDependencies(packageJson);
if (changed) {
  writePackageJson(packageJson);
  console.log('modernization-dependency-sync: package.json updated');
} else {
  console.log('modernization-dependency-sync: package.json already has required dependencies');
}

run('npm', ['install', '--package-lock-only', '--ignore-scripts']);
console.log('modernization-dependency-sync: package-lock.json synchronized');
console.log('modernization-dependency-sync: run npm install or npm ci next');
