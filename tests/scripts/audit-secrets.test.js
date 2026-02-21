import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    formatFinding,
    scanContentForSecrets,
    scanFilesForSecrets,
} from '../../scripts/audit-secrets.mjs';

const tempDirs = [];

const createTempDir = () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'panda-secrets-test-'));
    tempDirs.push(directory);
    return directory;
};

afterEach(() => {
    while (tempDirs.length) {
        const directory = tempDirs.pop();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

describe('audit-secrets', () => {
    it('detects known credential patterns', () => {
        const source = [
            `const github = 'ghp_${"123456789012345678901234567890123456"}';`,
            `const openai = 'sk-proj-${"abcdefghijklmnopqrstuvwxyz1234567890"}';`,
            `const aws = 'AKIA${"1234567890ABCD12"}';`,
            `const google = 'AIza${"12345678901234567890123456789012345"}';`,
        ].join('\n');

        const findings = scanContentForSecrets(source);
        const patternNames = findings.map((finding) => finding.pattern);

        expect(patternNames).toContain('GitHub Token');
        expect(patternNames).toContain('OpenAI API Key');
        expect(patternNames).toContain('AWS Access Key ID');
        expect(patternNames).toContain('Google API Key');
    });

    it('does not flag benign strings', () => {
        const source = [
            "const tokenLabel = 'practice-token';",
            "const keyName = 'api_key';",
            'const description = "local-first app";',
        ].join('\n');

        expect(scanContentForSecrets(source)).toEqual([]);
    });

    it('scans files and includes file metadata in findings', () => {
        const directory = createTempDir();
        const filePath = path.join(directory, 'example.js');
        fs.writeFileSync(
            filePath,
            [
                'const safe = true;',
                `const leaked = '-----BEGIN PRIVATE ${"KEY-----"}';`,
            ].join('\n'),
            'utf8',
        );

        const findings = scanFilesForSecrets([filePath]);
        expect(findings).toHaveLength(1);
        expect(findings[0].filePath).toBe(filePath);
        expect(findings[0].line).toBe(2);
        expect(findings[0].pattern).toBe('Private Key Block');
    });

    it('formats findings with relative paths', () => {
        const directory = createTempDir();
        const filePath = path.join(directory, 'nested', 'demo.js');
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, 'const noop = true;', 'utf8');

        const formatted = formatFinding({
            filePath,
            line: 3,
            column: 9,
            pattern: 'GitHub Token',
            match: 'ghp_example',
        }, directory);

        expect(formatted).toBe('nested/demo.js:3:9 [GitHub Token] ghp_example');
    });

    it('skips binary files by extension', () => {
        const directory = createTempDir();
        const filePath = path.join(directory, 'image.png');
        fs.writeFileSync(
            filePath,
            Buffer.from(`sk-proj-${"abcdefghijklmnopqrstuvwxyz1234567890"}`),
        );

        expect(scanFilesForSecrets([filePath])).toEqual([]);
    });
});
