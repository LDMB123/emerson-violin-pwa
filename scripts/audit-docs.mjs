import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const BUILTIN_NPM_COMMANDS = new Set([
    'install',
    'ci',
    'test',
    'pack',
    'publish',
    'version',
    'link',
]);

const INLINE_REPO_REF_PATTERN = /(?:^|[\s(])((?:\.\.?\/|\/Users\/|(?:src|docs|public|scripts|tests|wasm|_archived|\.github)\/)[A-Za-z0-9_./*-]+|(?:README\.md|CLAUDE\.md|CONTRIBUTING\.md|package\.json|manifest\.webmanifest|playwright\.config\.js|vite\.config\.js|\.nvmrc))(?:[\s),.:;]|$)/g;
const JSDOC_PARAM_PATTERN = /@param(?:\s+\{[^}]+\})?\s+(?:\[[^\]]+\]|([A-Za-z_$][A-Za-z0-9_$.]*))/g;
const JSDOC_RETURNS_PATTERN = /@returns?\b/;
const JSDOC_LINK_PATTERN = /(?:@see\s+|{@link\s+)([^}\s]+)/g;

const normalizePath = (filePath) => filePath.split(path.sep).join('/');

const isMarkdownAuditFile = (relativePath) => {
    if (
        relativePath === 'README.md' ||
        relativePath === 'CLAUDE.md' ||
        relativePath === 'CONTRIBUTING.md' ||
        relativePath === 'imagen/README.md'
    ) {
        return true;
    }
    if (relativePath.startsWith('docs/') && /\.(md|mdx)$/i.test(relativePath)) {
        return true;
    }
    return relativePath.startsWith('_archived/') && /\.md$/i.test(relativePath);
};

const isJSDocAuditFile = (relativePath) => relativePath.startsWith('src/') && relativePath.endsWith('.js');

const isExternalReference = (reference) => (
    reference.startsWith('http://') ||
    reference.startsWith('https://') ||
    reference.startsWith('mailto:') ||
    reference.startsWith('#') ||
    reference.startsWith('javascript:')
);

const isPatternReference = (reference) => /[*{}<>]/.test(reference) || reference.includes('...');

const isAllowedMissingReference = (reference) => (
    reference.startsWith('_archived/original-assets/') ||
    reference.startsWith('~/')
);

const shouldSkipReference = (reference) => (
    !reference ||
    isExternalReference(reference) ||
    isPatternReference(reference) ||
    isAllowedMissingReference(reference)
);

const resolveReferenceCandidates = (reference, relativePath, cwd) => {
    const cleanReference = reference.replace(/#.*$/, '');
    const sourceDir = path.dirname(path.join(cwd, relativePath));
    const candidates = [];

    if (cleanReference.startsWith('/Users/')) {
        candidates.push(cleanReference);
    } else if (cleanReference.startsWith('./') || cleanReference.startsWith('../')) {
        candidates.push(path.resolve(sourceDir, cleanReference));
    } else {
        candidates.push(path.resolve(sourceDir, cleanReference));
        candidates.push(path.resolve(cwd, cleanReference));
    }

    return [...new Set(candidates)];
};

const referenceExists = (reference, relativePath, cwd, existsSyncImpl = fs.existsSync) => {
    if (shouldSkipReference(reference)) return true;
    return resolveReferenceCandidates(reference, relativePath, cwd).some((candidate) => existsSyncImpl(candidate));
};

const listTrackedFiles = (cwd = repoRoot, execFileSyncImpl = execFileSync) => {
    const trackedOutput = execFileSyncImpl('git', ['ls-files', '-z'], { cwd, encoding: 'utf8' });
    const untrackedOutput = execFileSyncImpl('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd, encoding: 'utf8' });
    return [...new Set(
        `${trackedOutput}${untrackedOutput}`
            .split('\0')
            .filter(Boolean)
            .map((relativePath) => normalizePath(relativePath)),
    )];
};

const loadPackageScripts = (cwd = repoRoot, readFileSyncImpl = fs.readFileSync) => {
    const packageJsonPath = path.join(cwd, 'package.json');
    const packageJson = JSON.parse(readFileSyncImpl(packageJsonPath, 'utf8'));
    return new Set(Object.keys(packageJson.scripts || {}));
};

const createFinding = ({ relativePath, line, column, kind, reference, message }) => ({
    relativePath,
    line,
    column,
    kind,
    reference,
    message,
});

const addPathFinding = (findings, { relativePath, line, column, reference, kind, cwd, existsSyncImpl }) => {
    if (referenceExists(reference, relativePath, cwd, existsSyncImpl)) return;
    findings.push(createFinding({
        relativePath,
        line,
        column,
        kind,
        reference,
        message: 'Referenced file/path does not exist in the current checkout.',
    }));
};

const auditMarkdownContent = (
    content,
    relativePath,
    {
        cwd = repoRoot,
        packageScripts = new Set(),
        existsSyncImpl = fs.existsSync,
    } = {},
) => {
    const findings = [];
    const lines = content.split('\n');

    lines.forEach((lineText, index) => {
        const lineNumber = index + 1;

        const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
        let linkMatch = linkPattern.exec(lineText);
        while (linkMatch) {
            const reference = (linkMatch[1] || '').trim();
            if (!shouldSkipReference(reference)) {
                addPathFinding(findings, {
                    relativePath,
                    line: lineNumber,
                    column: linkMatch.index + 1,
                    reference,
                    kind: 'markdown-link',
                    cwd,
                    existsSyncImpl,
                });
            }
            linkMatch = linkPattern.exec(lineText);
        }

        const inlineCodePattern = /`([^`]+)`/g;
        let codeMatch = inlineCodePattern.exec(lineText);
        while (codeMatch) {
            const codeFragment = codeMatch[1];

            let pathMatch = INLINE_REPO_REF_PATTERN.exec(` ${codeFragment} `);
            while (pathMatch) {
                const reference = pathMatch[1];
                addPathFinding(findings, {
                    relativePath,
                    line: lineNumber,
                    column: codeMatch.index + 1,
                    reference,
                    kind: 'inline-path',
                    cwd,
                    existsSyncImpl,
                });
                pathMatch = INLINE_REPO_REF_PATTERN.exec(` ${codeFragment} `);
            }
            INLINE_REPO_REF_PATTERN.lastIndex = 0;

            codeMatch = inlineCodePattern.exec(lineText);
        }

        const npmRunPattern = /\bnpm run ([A-Za-z0-9:_-]+)/g;
        let npmRunMatch = npmRunPattern.exec(lineText);
        while (npmRunMatch) {
            const scriptName = npmRunMatch[1];
            if (!packageScripts.has(scriptName)) {
                findings.push(createFinding({
                    relativePath,
                    line: lineNumber,
                    column: npmRunMatch.index + 1,
                    kind: 'npm-script',
                    reference: scriptName,
                    message: `Referenced npm script "${scriptName}" is not defined in package.json.`,
                }));
            }
            npmRunMatch = npmRunPattern.exec(lineText);
        }

        const npmBuiltinPattern = /\bnpm (install|ci|test|pack|publish|version|link)\b/g;
        let builtinMatch = npmBuiltinPattern.exec(lineText);
        while (builtinMatch) {
            const builtin = builtinMatch[1];
            if (!BUILTIN_NPM_COMMANDS.has(builtin)) {
                findings.push(createFinding({
                    relativePath,
                    line: lineNumber,
                    column: builtinMatch.index + 1,
                    kind: 'npm-command',
                    reference: builtin,
                    message: `Referenced npm command "${builtin}" is not allowlisted.`,
                }));
            }
            builtinMatch = npmBuiltinPattern.exec(lineText);
        }
    });

    return findings;
};

const splitParams = (paramsSource) => {
    const params = [];
    let buffer = '';
    let depth = 0;

    for (const char of paramsSource) {
        if (char === ',' && depth === 0) {
            params.push(buffer);
            buffer = '';
            continue;
        }
        if (char === '(' || char === '[' || char === '{') depth += 1;
        if (char === ')' || char === ']' || char === '}') depth = Math.max(0, depth - 1);
        buffer += char;
    }

    if (buffer) params.push(buffer);
    return params;
};

const parseParamNames = (paramsSource) => splitParams(paramsSource)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
        const withoutDefault = part.split('=')[0].trim();
        const withoutRest = withoutDefault.replace(/^\.{3}/, '').trim();
        if (withoutRest.startsWith('{') || withoutRest.startsWith('[')) return null;
        return withoutRest || null;
    })
    .filter(Boolean);

const hasStructuredParam = (paramsSource) => splitParams(paramsSource)
    .map((part) => part.trim())
    .some((part) => {
        const withoutDefault = part.split('=')[0].trim().replace(/^\.{3}/, '').trim();
        return withoutDefault.startsWith('{') || withoutDefault.startsWith('[');
    });

const findDeclarationAfterBlock = (content, startIndex) => {
    const remainder = content.slice(startIndex);
    const patterns = [
        /^(?:\s*)(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([\s\S]*?)\)\s*(\{)?/,
        /^(?:\s*)(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?function\s*\(([\s\S]*?)\)\s*(\{)?/,
        /^(?:\s*)(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\(([\s\S]*?)\)\s*=>\s*(\{)?/,
        /^(?:\s*)(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?([A-Za-z_$][A-Za-z0-9_$]*)\s*=>\s*(\{)?/,
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(remainder);
        if (!match) continue;
        const paramsSource = match[2] || '';
        const hasBlockBody = Boolean(match[3]);
        return {
            name: match[1],
            params: parseParamNames(paramsSource),
            canValidateParams: !hasStructuredParam(paramsSource),
            bodyStartsAt: hasBlockBody ? startIndex + match[0].lastIndexOf('{') : -1,
            hasBlockBody,
        };
    }
    return null;
};

const extractBlockBody = (content, openBraceIndex) => {
    if (openBraceIndex < 0 || content[openBraceIndex] !== '{') return null;
    let depth = 0;
    for (let index = openBraceIndex; index < content.length; index += 1) {
        const char = content[index];
        if (char === '{') depth += 1;
        if (char === '}') depth -= 1;
        if (depth === 0) {
            return content.slice(openBraceIndex + 1, index);
        }
    }
    return null;
};

const hasDocumentedReturnMismatch = (jsdocBlock, bodyContent) => {
    if (!JSDOC_RETURNS_PATTERN.test(jsdocBlock) || !bodyContent) return false;
    if (/@returns?\s+\{(?:void|Promise<void>)\}/.test(jsdocBlock)) return false;
    const returnPattern = /\breturn\b([^;\n}]*)/g;
    let match = returnPattern.exec(bodyContent);
    while (match) {
        const expression = (match[1] || '').trim();
        if (expression && expression !== 'undefined') {
            return false;
        }
        match = returnPattern.exec(bodyContent);
    }
    return true;
};

const auditJSDocContent = (
    content,
    relativePath,
    {
        cwd = repoRoot,
        existsSyncImpl = fs.existsSync,
    } = {},
) => {
    const findings = [];
    const blockPattern = /\/\*\*([\s\S]*?)\*\//g;
    let blockMatch = blockPattern.exec(content);

    while (blockMatch) {
        const fullBlock = blockMatch[0];
        const blockBody = blockMatch[1];
        const declaration = findDeclarationAfterBlock(content, blockMatch.index + fullBlock.length);
        const lineNumber = content.slice(0, blockMatch.index).split('\n').length;

        if (declaration) {
            const documentedParams = [];
            let paramMatch = JSDOC_PARAM_PATTERN.exec(blockBody);
            while (paramMatch) {
                if (paramMatch[1] && !paramMatch[1].includes('.')) documentedParams.push(paramMatch[1]);
                paramMatch = JSDOC_PARAM_PATTERN.exec(blockBody);
            }
            JSDOC_PARAM_PATTERN.lastIndex = 0;

            if (declaration.canValidateParams !== false) {
                documentedParams.forEach((documentedParam) => {
                    if (!declaration.params.includes(documentedParam)) {
                        findings.push(createFinding({
                            relativePath,
                            line: lineNumber,
                            column: 1,
                            kind: 'jsdoc-param',
                            reference: documentedParam,
                            message: `JSDoc documents "${documentedParam}" but ${declaration.name}() does not accept that parameter.`,
                        }));
                    }
                });
            }

            if (declaration.hasBlockBody) {
                const bodyContent = extractBlockBody(content, declaration.bodyStartsAt);
                if (hasDocumentedReturnMismatch(blockBody, bodyContent)) {
                    findings.push(createFinding({
                        relativePath,
                        line: lineNumber,
                        column: 1,
                        kind: 'jsdoc-returns',
                        reference: declaration.name,
                        message: `JSDoc documents a return value for ${declaration.name}(), but the function body does not return a value.`,
                    }));
                }
            }
        }

        let linkMatch = JSDOC_LINK_PATTERN.exec(blockBody);
        while (linkMatch) {
            const reference = (linkMatch[1] || '').trim();
            if (reference && /[/.]/.test(reference) && !referenceExists(reference, relativePath, cwd, existsSyncImpl)) {
                findings.push(createFinding({
                    relativePath,
                    line: lineNumber,
                    column: 1,
                    kind: 'jsdoc-link',
                    reference,
                    message: 'JSDoc link points to a file/path that does not exist.',
                }));
            }
            linkMatch = JSDOC_LINK_PATTERN.exec(blockBody);
        }
        JSDOC_LINK_PATTERN.lastIndex = 0;

        blockMatch = blockPattern.exec(content);
    }

    return findings;
};

const auditTrackedFiles = (
    trackedFiles,
    {
        cwd = repoRoot,
        readFileSyncImpl = fs.readFileSync,
        existsSyncImpl = fs.existsSync,
        packageScripts = loadPackageScripts(cwd, readFileSyncImpl),
    } = {},
) => {
    const findings = [];

    trackedFiles.forEach((relativePath) => {
        const normalizedPath = normalizePath(relativePath);
        const absolutePath = path.join(cwd, normalizedPath);
        let content = '';
        try {
            content = readFileSyncImpl(absolutePath, 'utf8');
        } catch {
            return;
        }

        if (isMarkdownAuditFile(normalizedPath)) {
            findings.push(...auditMarkdownContent(content, normalizedPath, {
                cwd,
                packageScripts,
                existsSyncImpl,
            }));
        }

        if (isJSDocAuditFile(normalizedPath)) {
            findings.push(...auditJSDocContent(content, normalizedPath, {
                cwd,
                existsSyncImpl,
            }));
        }
    });

    return findings;
};

const formatFinding = (finding) => (
    `${finding.relativePath}:${finding.line}:${finding.column} [${finding.kind}] ${finding.reference} - ${finding.message}`
);

const runDocsAudit = ({
    cwd = repoRoot,
    logger = console,
    execFileSyncImpl = execFileSync,
    readFileSyncImpl = fs.readFileSync,
    existsSyncImpl = fs.existsSync,
} = {}) => {
    const trackedFiles = listTrackedFiles(cwd, execFileSyncImpl);
    const packageScripts = loadPackageScripts(cwd, readFileSyncImpl);
    const findings = auditTrackedFiles(trackedFiles, {
        cwd,
        readFileSyncImpl,
        existsSyncImpl,
        packageScripts,
    });

    if (findings.length > 0) {
        logger.error('Docs audit failed: stale documentation references or JSDoc contract mismatches detected.');
        findings
            .map(formatFinding)
            .sort((left, right) => left.localeCompare(right))
            .forEach((line) => logger.error(`- ${line}`));
        return false;
    }

    const markdownCount = trackedFiles.filter(isMarkdownAuditFile).length;
    const jsdocCount = trackedFiles.filter(isJSDocAuditFile).length;
    logger.log(`Docs audit passed: scanned ${markdownCount} Markdown docs and ${jsdocCount} source files with no stale references.`);
    return true;
};

const isDirectExecution = !process.env.VITEST &&
    path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);

if (isDirectExecution) {
    const passed = runDocsAudit();
    if (!passed) process.exitCode = 1;
}

export {
    auditJSDocContent,
    auditMarkdownContent,
    auditTrackedFiles,
    formatFinding,
    isPatternReference,
    listTrackedFiles,
    loadPackageScripts,
    normalizePath,
    referenceExists,
    runDocsAudit,
};
