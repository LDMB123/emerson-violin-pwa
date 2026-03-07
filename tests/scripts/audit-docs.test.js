import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    auditJSDocContent,
    auditMarkdownContent,
    auditTrackedFiles,
} from '../../scripts/audit-docs.mjs';

const tempDirs = [];

const createTempRepo = () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'panda-docs-audit-'));
    tempDirs.push(directory);
    fs.mkdirSync(path.join(directory, 'docs', 'guides'), { recursive: true });
    fs.mkdirSync(path.join(directory, 'src', 'utils'), { recursive: true });
    fs.mkdirSync(path.join(directory, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({
        name: 'docs-audit-fixture',
        scripts: {
            dev: 'vite',
            'runtime:check': 'node scripts/assert-runtime-versions.mjs',
        },
    }, null, 2));
    fs.writeFileSync(path.join(directory, 'README.md'), '# Fixture\n', 'utf8');
    fs.writeFileSync(path.join(directory, 'docs', 'guides', 'other.md'), '# Other\n', 'utf8');
    fs.writeFileSync(path.join(directory, 'src', 'utils', 'helper.js'), 'export const helper = () => true;\n', 'utf8');
    fs.writeFileSync(path.join(directory, 'scripts', 'assert-runtime-versions.mjs'), 'export default true;\n', 'utf8');
    return directory;
};

const auditMarkdownInTempRepo = (source, {
    relativePath = 'docs/guides/example.md',
    packageScripts = ['runtime:check'],
} = {}) => {
    const repoDir = createTempRepo();
    const findings = auditMarkdownContent(source, relativePath, {
        cwd: repoDir,
        packageScripts: new Set(packageScripts),
    });
    return { repoDir, findings };
};

afterEach(() => {
    while (tempDirs.length) {
        const directory = tempDirs.pop();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

describe('audit-docs', () => {
    it('accepts valid repo-root and relative markdown references', () => {
        const source = [
            '- Read `src/utils/helper.js` before editing.',
            '- Guide: [Other](other.md)',
            '- Command: `npm run runtime:check`',
        ].join('\n');

        const { findings } = auditMarkdownInTempRepo(source);

        expect(findings).toEqual([]);
    });

    it('flags broken file and npm script references', () => {
        const source = [
            '- Missing file: `src/utils/missing.js`',
            '- Missing script: `npm run docs:build`',
        ].join('\n');

        const { findings } = auditMarkdownInTempRepo(source, { relativePath: 'README.md' });

        expect(findings.map((finding) => finding.kind)).toContain('inline-path');
        expect(findings.map((finding) => finding.kind)).toContain('npm-script');
    });

    it('allows glob patterns and local scratch-path wording', () => {
        const source = [
            '- Current views live in `public/views/**`.',
            '- Scratch output may appear under `_archived/original-assets/audio/`.',
        ].join('\n');

        const { findings } = auditMarkdownInTempRepo(source);

        expect(findings).toEqual([]);
    });

    it('flags stale JSDoc params and stale returns contracts', () => {
        const source = `
            /**
             * Demo helper.
             * @param active current active state
             * @param options stale option
             * @returns {boolean} whether the helper returns a value
             */
            export function demo(active) {
                if (!active) {
                    return;
                }
            }
        `;

        const findings = auditJSDocContent(source, 'src/utils/demo.js');
        const findingKinds = findings.map((finding) => finding.kind);

        expect(findingKinds).toContain('jsdoc-param');
        expect(findingKinds).toContain('jsdoc-returns');
    });

    it('flags stale JSDoc file links', () => {
        const repoDir = createTempRepo();
        const source = `
            /**
             * @see src/utils/removed.js
             */
            export const demo = () => true;
        `;

        const findings = auditJSDocContent(source, 'src/utils/demo.js', { cwd: repoDir });

        expect(findings).toHaveLength(1);
        expect(findings[0].kind).toBe('jsdoc-link');
    });

    it('audits tracked files end to end with an intentional failure fixture', () => {
        const repoDir = createTempRepo();
        fs.writeFileSync(path.join(repoDir, 'docs', 'README.md'), [
            '- Valid: `src/utils/helper.js`',
            '- Invalid: `src/utils/renamed.js`',
        ].join('\n'), 'utf8');

        const findings = auditTrackedFiles([
            'docs/README.md',
            'src/utils/helper.js',
        ], {
            cwd: repoDir,
            packageScripts: new Set(['runtime:check']),
        });

        expect(findings).toHaveLength(1);
        expect(findings[0].reference).toBe('src/utils/renamed.js');
    });
});
