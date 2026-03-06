import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);
const expectedNodeVersion = readFileSync(
  new URL('../.nvmrc', import.meta.url),
  'utf8'
).trim().replace(/^v/, '');

const packageManager = packageJson.packageManager || '';
const packageManagerMatch = /^npm@(.+)$/.exec(packageManager);

if (!packageManagerMatch) {
  console.error('Runtime version check failed.');
  console.error('Expected package.json#packageManager to be set to npm@<version>.');
  process.exit(1);
}

const expectedNpmVersion = packageManagerMatch[1];
const actualNodeVersion = process.versions.node;
const actualNpmVersion =
  process.env.npm_config_user_agent?.match(/\bnpm\/([^\s]+)/)?.[1] ||
  execFileSync('npm', ['-v'], { encoding: 'utf8' }).trim();

const mismatches = [];

if (actualNodeVersion !== expectedNodeVersion) {
  mismatches.push(
    `Node mismatch: expected ${expectedNodeVersion}, found ${actualNodeVersion}`
  );
}

if (actualNpmVersion !== expectedNpmVersion) {
  mismatches.push(
    `npm mismatch: expected ${expectedNpmVersion}, found ${actualNpmVersion}`
  );
}

if (mismatches.length > 0) {
  console.error('Runtime version check failed.');
  for (const mismatch of mismatches) {
    console.error(`- ${mismatch}`);
  }
  console.error('');
  console.error('Use the pinned repo runtime:');
  console.error(`- nvm install && nvm use ${expectedNodeVersion}`);
  console.error(`- npm install -g npm@${expectedNpmVersion}`);
  process.exit(1);
}

console.log(
  `Runtime version check passed (node ${actualNodeVersion}, npm ${actualNpmVersion}).`
);
