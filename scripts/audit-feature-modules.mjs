#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
    MODULE_LOADERS,
    EAGER_MODULES,
    IDLE_MODULE_PLAN,
    resolveModulesForView,
} from '../src/app/module-registry.js';

const rootDir = process.cwd();
const toAbsPath = (relativePath) => path.join(rootDir, relativePath);
const toRelativePath = (absolutePath) => path.relative(rootDir, absolutePath);
const readFile = (relativePath) => fs.readFileSync(toAbsPath(relativePath), 'utf8');
const isConcreteViewId = (value) => /^view-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const TEST_ONLY_UNKNOWN_VIEW_IDS = new Set(['view-nonexistent']);
const MODULES_WITHOUT_INIT_ALLOWLIST = new Set([
    'audioPlayer',
    'badging',
    'dataSaver',
    'installToast',
    'mlScheduler',
    'offlineRecovery',
    'onboarding',
    'persist',
]);

const registrySource = readFile('src/app/module-registry.js');
const gameMetricsSource = readFile('src/games/game-metrics.js');
const e2eDir = toAbsPath('tests/e2e');
const e2eFiles = fs.readdirSync(e2eDir).filter((fileName) => /\.(spec|test)\.js$/.test(fileName));
const e2eSource = e2eFiles
    .map((fileName) => fs.readFileSync(path.join(e2eDir, fileName), 'utf8'))
    .join('\n');
const rawE2eViews = [...new Set([...e2eSource.matchAll(/view-[a-z0-9-]+/g)].map((match) => match[0]).filter(isConcreteViewId))]
    .sort();

const collectHtmlFiles = (dirPath) => {
    const files = [];
    const stack = [dirPath];
    while (stack.length) {
        const current = stack.pop();
        const entries = fs.readdirSync(current, { withFileTypes: true });
        entries.forEach((entry) => {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
                return;
            }
            if (entry.isFile() && entry.name.endsWith('.html')) {
                files.push(fullPath);
            }
        });
    }
    return files;
};

const htmlFiles = collectHtmlFiles(toAbsPath('public/views'));
const availableViewIds = new Set(
    htmlFiles.map((filePath) => {
        const rel = toRelativePath(filePath).replace(/^public\/views\//, '');
        if (rel.startsWith('games/')) {
            return `view-game-${rel.replace(/^games\//, '').replace(/\.html$/, '')}`;
        }
        if (rel.startsWith('songs/')) {
            return `view-song-${rel.replace(/^songs\//, '').replace(/\.html$/, '')}`;
        }
        return `view-${rel.replace(/\.html$/, '')}`;
    })
);

const unknownE2eViews = rawE2eViews.filter(
    (viewId) => !availableViewIds.has(viewId) && !TEST_ONLY_UNKNOWN_VIEW_IDS.has(viewId)
);
const e2eViews = Object.freeze(rawE2eViews.filter((viewId) => availableViewIds.has(viewId)));
const knownViewIds = Object.freeze([...availableViewIds].sort());
const e2eTouchesHome = e2eViews.includes('view-home');

const coverageSummaryPath = toAbsPath('coverage/coverage-summary.json');
const coverageSummary = fs.existsSync(coverageSummaryPath)
    ? JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'))
    : null;

const getCoverageInfo = (relativePath) => {
    if (!coverageSummary) {
        return {
            coveredLines: null,
            linePct: null,
            coveredBranches: null,
            totalBranches: null,
            branchPct: null,
        };
    }
    const coverage = coverageSummary[toAbsPath(relativePath)];
    if (!coverage?.lines && !coverage?.branches) {
        return {
            coveredLines: null,
            linePct: null,
            coveredBranches: null,
            totalBranches: null,
            branchPct: null,
        };
    }
    return {
        coveredLines: coverage.lines?.covered ?? null,
        linePct: coverage.lines?.pct ?? null,
        coveredBranches: coverage.branches?.covered ?? null,
        totalBranches: coverage.branches?.total ?? null,
        branchPct: coverage.branches?.pct ?? null,
    };
};

const loaderPaths = new Map(
    [...registrySource.matchAll(/(\w+)\s*:\s*\(\)\s*=>\s*import\('([^']+)'\)/g)].map((match) => [match[1], match[2]])
);
const gameModulePaths = new Map(
    [...gameMetricsSource.matchAll(/'([^']+)'\s*:\s*\(\)\s*=>\s*import\('([^']+)'\)/g)].map((match) => [match[1], match[2]])
);

const runtimeRows = Object.keys(MODULE_LOADERS)
    .sort()
    .map((moduleKey) => {
        const loaderImportPath = loaderPaths.get(moduleKey);
        const sourcePath = loaderImportPath ? path.normalize(path.join('src/app', loaderImportPath)) : null;
        const absoluteSourcePath = sourcePath ? toAbsPath(sourcePath) : null;
        const exists = absoluteSourcePath ? fs.existsSync(absoluteSourcePath) : false;
        const source = exists && sourcePath ? readFile(sourcePath) : '';
        const { coveredLines, linePct, coveredBranches, totalBranches, branchPct } = sourcePath
            ? getCoverageInfo(sourcePath)
            : {
                coveredLines: null,
                linePct: null,
                coveredBranches: null,
                totalBranches: null,
                branchPct: null,
            };
        const unitCovered = typeof coveredLines === 'number' ? coveredLines > 0 : null;
        const branchCovered = typeof totalBranches === 'number' && totalBranches > 0
            ? (typeof coveredBranches === 'number' ? coveredBranches > 0 : null)
            : true;
        const mappedViews = knownViewIds.filter((viewId) => resolveModulesForView(viewId).includes(moduleKey));
        const triggerViews = e2eViews.filter((viewId) => mappedViews.includes(viewId));
        const eager = EAGER_MODULES.includes(moduleKey);
        const idle = IDLE_MODULE_PLAN.some(([key]) => key === moduleKey);
        const reachable = mappedViews.length > 0 || eager || idle;
        const e2eCovered = triggerViews.length > 0 || ((eager || idle) && e2eTouchesHome);
        const hasInitExport = /export\s+(const|function)\s+init\b|export\s*\{[^}]*\binit\b[^}]*\}/s.test(source);
        const hasSelfStartSignal = /\bwhenReady\s*\(|\b(?:init|evaluate)\s*\(\s*\)\s*;|\.addEventListener\s*\(/.test(source);
        const noInitAllowlisted = MODULES_WITHOUT_INIT_ALLOWLIST.has(moduleKey);
        const contractGap = !hasInitExport && (!noInitAllowlisted || !hasSelfStartSignal);
        return {
            moduleKey,
            sourcePath,
            exists,
            unitCovered,
            linePct,
            coveredBranches,
            totalBranches,
            branchPct,
            branchCovered,
            e2eCovered,
            triggerViews,
            mappedViews,
            eager,
            idle,
            reachable,
            hasInitExport,
            hasSelfStartSignal,
            noInitAllowlisted,
            contractGap,
            complete: exists && reachable && e2eCovered && !contractGap && branchCovered !== false,
        };
    });

const gameRows = [...gameModulePaths.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([viewId, loaderImportPath]) => {
        const sourcePath = path.normalize(path.join('src/games', loaderImportPath));
        const absoluteSourcePath = toAbsPath(sourcePath);
        const exists = fs.existsSync(absoluteSourcePath);
        const { coveredLines, linePct, coveredBranches, totalBranches, branchPct } = getCoverageInfo(sourcePath);
        const unitCovered = typeof coveredLines === 'number' ? coveredLines > 0 : null;
        const branchCovered = typeof totalBranches === 'number' && totalBranches > 0
            ? (typeof coveredBranches === 'number' ? coveredBranches > 0 : null)
            : true;
        const viewExists = availableViewIds.has(viewId);
        const e2eCovered = e2eViews.includes(viewId);
        return {
            viewId,
            sourcePath,
            exists,
            viewExists,
            unitCovered,
            linePct,
            coveredBranches,
            totalBranches,
            branchPct,
            branchCovered,
            e2eCovered,
            complete: exists && viewExists && e2eCovered && branchCovered !== false,
        };
    });

const runtimeGaps = runtimeRows.filter((row) => !row.complete);
const gameGaps = gameRows.filter((row) => !row.complete);

const runtimeNoUnitCoverage = runtimeRows.filter((row) => row.unitCovered === false).map((row) => row.moduleKey);
const gameNoUnitCoverage = gameRows.filter((row) => row.unitCovered === false).map((row) => row.viewId);
const runtimeNoBranchCoverage = runtimeRows.filter((row) => row.branchCovered === false).map((row) => row.moduleKey);
const gameNoBranchCoverage = gameRows.filter((row) => row.branchCovered === false).map((row) => row.viewId);
const runtimeContractGaps = runtimeRows.filter((row) => row.contractGap).map((row) => row.moduleKey);
const runtimeUnreachable = runtimeRows.filter((row) => !row.reachable).map((row) => row.moduleKey);
const unitCoverageEnforceable = Boolean(coverageSummary);
const runtimeCoverageGaps = unitCoverageEnforceable ? runtimeNoUnitCoverage : [];
const gameCoverageGaps = unitCoverageEnforceable ? gameNoUnitCoverage : [];
const runtimeBranchCoverageGaps = unitCoverageEnforceable ? runtimeNoBranchCoverage : [];
const gameBranchCoverageGaps = unitCoverageEnforceable ? gameNoBranchCoverage : [];
const allGaps = [
    ...runtimeGaps,
    ...gameGaps,
    ...unknownE2eViews,
    ...runtimeCoverageGaps,
    ...gameCoverageGaps,
    ...runtimeBranchCoverageGaps,
    ...gameBranchCoverageGaps,
];

const asJson = process.argv.includes('--json');
const result = {
    timestampUtc: new Date().toISOString(),
    e2eViewCount: e2eViews.length,
    knownViewCount: knownViewIds.length,
    unknownE2eViews,
    coverageSummary: coverageSummaryPath && fs.existsSync(coverageSummaryPath)
        ? toRelativePath(coverageSummaryPath)
        : null,
    runtime: {
        total: runtimeRows.length,
        complete: runtimeRows.length - runtimeGaps.length,
        gaps: runtimeGaps.map((row) => row.moduleKey),
        noUnitCoverage: runtimeNoUnitCoverage,
        coverageGaps: runtimeCoverageGaps,
        noBranchCoverage: runtimeNoBranchCoverage,
        branchCoverageGaps: runtimeBranchCoverageGaps,
        contractGaps: runtimeContractGaps,
        unreachable: runtimeUnreachable,
        rows: runtimeRows,
    },
    games: {
        total: gameRows.length,
        complete: gameRows.length - gameGaps.length,
        gaps: gameGaps.map((row) => row.viewId),
        noUnitCoverage: gameNoUnitCoverage,
        coverageGaps: gameCoverageGaps,
        noBranchCoverage: gameNoBranchCoverage,
        branchCoverageGaps: gameBranchCoverageGaps,
        rows: gameRows,
    },
};

if (asJson) {
    console.log(JSON.stringify(result, null, 2));
} else {
    console.log('Feature Module Completeness Audit');
    console.log('---------------------------------');
    console.log(`E2E views detected: ${result.e2eViewCount}`);
    console.log(`Known views detected: ${result.knownViewCount}`);
    console.log(`Runtime modules complete: ${result.runtime.complete}/${result.runtime.total}`);
    console.log(`Game modules complete: ${result.games.complete}/${result.games.total}`);
    if (result.coverageSummary) {
        console.log(`Coverage summary: ${result.coverageSummary}`);
    } else {
        console.log('Coverage summary: missing (unit-coverage detail unavailable)');
    }
    console.log('');

    if (unknownE2eViews.length > 0) {
        console.log('Unexpected E2E view IDs not backed by real view templates:');
        unknownE2eViews.forEach((viewId) => console.log(`- ${viewId}`));
        console.log('');
    }

    if (runtimeContractGaps.length > 0) {
        console.log('Runtime modules with activation contract gaps:');
        runtimeContractGaps.forEach((moduleKey) => console.log(`- ${moduleKey}`));
        console.log('');
    }

    if (runtimeUnreachable.length > 0) {
        console.log('Runtime modules not reachable by any view rule or startup plan:');
        runtimeUnreachable.forEach((moduleKey) => console.log(`- ${moduleKey}`));
        console.log('');
    }

    if (runtimeNoUnitCoverage.length > 0) {
        console.log(
            unitCoverageEnforceable
                ? 'Runtime modules with no unit coverage signal (blocking):'
                : 'Runtime modules with no unit coverage signal (informational; coverage summary missing):'
        );
        runtimeNoUnitCoverage.forEach((moduleKey) => console.log(`- ${moduleKey}`));
        console.log('');
    }

    if (runtimeNoBranchCoverage.length > 0) {
        console.log(
            unitCoverageEnforceable
                ? 'Runtime modules with zero branch coverage signal (blocking):'
                : 'Runtime modules with zero branch coverage signal (informational; coverage summary missing):'
        );
        runtimeNoBranchCoverage.forEach((moduleKey) => console.log(`- ${moduleKey}`));
        console.log('');
    }

    if (gameNoUnitCoverage.length > 0) {
        console.log(
            unitCoverageEnforceable
                ? 'Game modules with no unit coverage signal (blocking):'
                : 'Game modules with no unit coverage signal (informational; coverage summary missing):'
        );
        gameNoUnitCoverage.forEach((viewId) => console.log(`- ${viewId}`));
        console.log('');
    }

    if (gameNoBranchCoverage.length > 0) {
        console.log(
            unitCoverageEnforceable
                ? 'Game modules with zero branch coverage signal (blocking):'
                : 'Game modules with zero branch coverage signal (informational; coverage summary missing):'
        );
        gameNoBranchCoverage.forEach((viewId) => console.log(`- ${viewId}`));
        console.log('');
    }

    if (allGaps.length === 0) {
        console.log('No blocking completeness gaps detected.');
    } else {
        console.log('Blocking completeness gaps:');
        unknownE2eViews.forEach((viewId) => {
            console.log(`- unexpected e2e view id ${viewId}`);
        });
        runtimeCoverageGaps.forEach((moduleKey) => {
            console.log(`- runtime module ${moduleKey}: missing unit coverage signal`);
        });
        runtimeBranchCoverageGaps.forEach((moduleKey) => {
            console.log(`- runtime module ${moduleKey}: zero covered branches`);
        });
        gameCoverageGaps.forEach((viewId) => {
            console.log(`- game module ${viewId}: missing unit coverage signal`);
        });
        gameBranchCoverageGaps.forEach((viewId) => {
            console.log(`- game module ${viewId}: zero covered branches`);
        });
        runtimeGaps.forEach((row) => {
            console.log(
                `- runtime module ${row.moduleKey}: exists=${row.exists} reachable=${row.reachable} ` +
                `e2eCovered=${row.e2eCovered} contractGap=${row.contractGap} branchCovered=${row.branchCovered}`
            );
        });
        gameGaps.forEach((row) => {
            console.log(
                `- game module ${row.viewId}: exists=${row.exists} viewExists=${row.viewExists} ` +
                `e2eCovered=${row.e2eCovered} branchCovered=${row.branchCovered}`
            );
        });
    }
}

if (allGaps.length > 0) {
    process.exitCode = 1;
}
