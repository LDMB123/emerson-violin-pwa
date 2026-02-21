import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const BINARY_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.mp3',
    '.wav',
    '.ogg',
    '.m4a',
    '.mp4',
    '.webm',
    '.wasm',
    '.zip',
    '.pdf',
    '.mov',
    '.avif',
]);

export const SECRET_PATTERNS = [
    { name: 'AWS Access Key ID', regex: /\bAKIA[0-9A-Z]{16}\b/g },
    { name: 'AWS Secret Access Key Assignment', regex: /\b(?:AWS_SECRET_ACCESS_KEY|aws_secret_access_key)\b\s*[:=]\s*['"][A-Za-z0-9/+=]{40}['"]/g },
    { name: 'GitHub Token', regex: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
    { name: 'OpenAI API Key', regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
    { name: 'Google API Key', regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g },
    { name: 'Slack Token', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
    { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g },
];

const normalizePath = (filePath) => filePath.split(path.sep).join('/');

const isLikelyTextBuffer = (buffer) => {
    if (buffer.length === 0) return true;
    const inspectLength = Math.min(buffer.length, 8192);
    for (let index = 0; index < inspectLength; index += 1) {
        if (buffer[index] === 0) return false;
    }
    return true;
};

export const isTextFile = (filePath, readFileSync = fs.readFileSync) => {
    const extension = path.extname(filePath).toLowerCase();
    if (BINARY_EXTENSIONS.has(extension)) return false;
    try {
        const sample = readFileSync(filePath);
        return isLikelyTextBuffer(sample);
    } catch {
        return false;
    }
};

export const listTrackedFiles = (cwd = repoRoot, execFileSyncImpl = execFileSync) => {
    const output = execFileSyncImpl('git', ['ls-files', '-z'], { cwd, encoding: 'utf8' });
    return output
        .split('\0')
        .filter(Boolean)
        .map((relativePath) => path.join(cwd, relativePath));
};

const withGlobalFlag = (regex) => {
    if (regex.flags.includes('g')) return regex;
    return new RegExp(regex.source, `${regex.flags}g`);
};

export const scanContentForSecrets = (content, patterns = SECRET_PATTERNS) => {
    const findings = [];
    const lines = content.split('\n');
    lines.forEach((lineText, index) => {
        patterns.forEach((pattern) => {
            const regex = withGlobalFlag(pattern.regex);
            regex.lastIndex = 0;
            let match = regex.exec(lineText);
            while (match) {
                findings.push({
                    pattern: pattern.name,
                    line: index + 1,
                    column: match.index + 1,
                    match: match[0],
                });
                if (match[0].length === 0) break;
                match = regex.exec(lineText);
            }
        });
    });
    return findings;
};

export const scanFilesForSecrets = (filePaths, readFileSync = fs.readFileSync) => {
    const findings = [];
    filePaths.forEach((filePath) => {
        if (!isTextFile(filePath, readFileSync)) return;
        let content = '';
        try {
            content = readFileSync(filePath, 'utf8');
        } catch {
            return;
        }
        const fileFindings = scanContentForSecrets(content);
        fileFindings.forEach((finding) => {
            findings.push({
                ...finding,
                filePath,
            });
        });
    });
    return findings;
};

export const formatFinding = (finding, root = repoRoot) => {
    const relative = normalizePath(path.relative(root, finding.filePath));
    return `${relative}:${finding.line}:${finding.column} [${finding.pattern}] ${finding.match}`;
};

export const runSecretsAudit = ({ cwd = repoRoot, logger = console } = {}) => {
    const trackedFiles = listTrackedFiles(cwd);
    const findings = scanFilesForSecrets(trackedFiles);
    if (findings.length > 0) {
        logger.error('Secrets audit failed: potential credential-like values detected.');
        findings
            .map((finding) => formatFinding(finding, cwd))
            .sort((a, b) => a.localeCompare(b))
            .forEach((line) => logger.error(`- ${line}`));
        return false;
    }

    logger.log(`Secrets audit passed: scanned ${trackedFiles.length} tracked files with no credential matches.`);
    return true;
};

const isDirectExecution = !process.env.VITEST &&
    path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);

if (isDirectExecution) {
    const passed = runSecretsAudit();
    if (!passed) {
        process.exitCode = 1;
    }
}
