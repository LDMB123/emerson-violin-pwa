#!/bin/bash
# Emerson Violin PWA - Organizational Cleanup Script
# Generated: 2026-01-31
# Based on: EMERSON_VIOLIN_ORGANIZATIONAL_AUDIT.md

set -e  # Exit on error

PROJECT_ROOT="/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa"
ARCHIVE_ROOT="/Users/louisherman/ClaudeCodeProjects/_archived"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Emerson Violin PWA Organizational Cleanup ===${NC}"
echo "Project: $PROJECT_ROOT"
echo ""

# Confirmation prompt
read -p "This will reorganize files and create archives. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cleanup cancelled.${NC}"
    exit 0
fi

cd "$PROJECT_ROOT" || exit 1

# Step 0: Create backup
echo -e "${YELLOW}Creating backup...${NC}"
BACKUP_FILE="$ARCHIVE_ROOT/emerson-violin-pwa-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$BACKUP_FILE" \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=test-results \
  --exclude=playwright-report \
  .

if [ -f "$BACKUP_FILE" ]; then
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${RED}✗ Backup failed! Aborting.${NC}"
    exit 1
fi

# Step 1: Remove root build artifacts (P0)
echo ""
echo -e "${YELLOW}[P0] Removing root build artifacts...${NC}"
if [ -f "sw.js" ]; then
    if diff -q sw.js public/sw.js > /dev/null 2>&1; then
        rm sw.js
        echo -e "${GREEN}✓ Removed sw.js (duplicate of public/sw.js)${NC}"
    else
        echo -e "${RED}⚠ sw.js differs from public/sw.js - manual review needed${NC}"
    fi
else
    echo "  sw.js not found (already clean)"
fi

if [ -f "sw-assets.js" ]; then
    if diff -q sw-assets.js public/sw-assets.js > /dev/null 2>&1; then
        rm sw-assets.js
        echo -e "${GREEN}✓ Removed sw-assets.js (duplicate of public/sw-assets.js)${NC}"
    else
        echo -e "${RED}⚠ sw-assets.js differs from public/sw-assets.js - manual review needed${NC}"
    fi
else
    echo "  sw-assets.js not found (already clean)"
fi

# Step 2: Archive duplicate mockups (P1)
echo ""
echo -e "${YELLOW}[P1] Archiving duplicate mockups...${NC}"
if [ -d "design/mockups" ]; then
    MOCKUP_COUNT=$(find design/mockups -name "*.png" 2>/dev/null | wc -l)
    if [ "$MOCKUP_COUNT" -gt 0 ]; then
        mkdir -p "$ARCHIVE_ROOT/emerson-violin-pwa/design-assets/mockups"
        mv design/mockups/*.png "$ARCHIVE_ROOT/emerson-violin-pwa/design-assets/mockups/" 2>/dev/null
        rmdir design/mockups 2>/dev/null || echo "  design/mockups not empty after move"
        echo -e "${GREEN}✓ Archived $MOCKUP_COUNT mockup files (~11M recovered)${NC}"
    else
        echo "  No mockup files found"
    fi
else
    echo "  design/mockups/ not found (already clean)"
fi

# Step 3: Clean test results (P1)
echo ""
echo -e "${YELLOW}[P1] Removing test artifacts...${NC}"
if [ -d "test-results" ]; then
    rm -rf test-results/
    echo -e "${GREEN}✓ Removed test-results/ directory${NC}"
else
    echo "  test-results/ not found (already clean)"
fi

if [ -d "playwright-report" ]; then
    rm -rf playwright-report/
    echo -e "${GREEN}✓ Removed playwright-report/ directory${NC}"
fi

# Step 4: Remove empty directories (P1)
echo ""
echo -e "${YELLOW}[P1] Removing empty directories...${NC}"
EMPTY_DIRS_REMOVED=0

if [ -d "qa/screenshots" ] && [ -z "$(ls -A qa/screenshots)" ]; then
    rmdir qa/screenshots
    echo -e "${GREEN}✓ Removed qa/screenshots/ (empty)${NC}"
    EMPTY_DIRS_REMOVED=$((EMPTY_DIRS_REMOVED + 1))
fi

if [ -d "wasm/src/wasm" ] && [ -z "$(ls -A wasm/src/wasm)" ]; then
    rmdir wasm/src/wasm
    echo -e "${GREEN}✓ Removed wasm/src/wasm/ (empty)${NC}"
    EMPTY_DIRS_REMOVED=$((EMPTY_DIRS_REMOVED + 1))
fi

if [ -d "src/components" ] && [ -z "$(ls -A src/components)" ]; then
    read -p "Remove empty src/components/ directory? May be placeholder for future use. (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rmdir src/components
        echo -e "${GREEN}✓ Removed src/components/ (empty)${NC}"
        EMPTY_DIRS_REMOVED=$((EMPTY_DIRS_REMOVED + 1))
    else
        echo "  Keeping src/components/ as placeholder"
    fi
fi

if [ $EMPTY_DIRS_REMOVED -eq 0 ]; then
    echo "  No empty directories found"
fi

# Step 5: Move QA documentation (P2)
echo ""
echo -e "${YELLOW}[P2] Reorganizing QA documentation...${NC}"
if [ -d "qa" ]; then
    mkdir -p docs/reports/qa
    QA_DOCS_MOVED=0

    if [ -f "qa/ipados-26_2-issue-log.md" ]; then
        mv qa/ipados-26_2-issue-log.md docs/reports/qa/
        echo -e "${GREEN}✓ Moved ipados-26_2-issue-log.md to docs/reports/qa/${NC}"
        QA_DOCS_MOVED=$((QA_DOCS_MOVED + 1))
    fi

    if [ -f "qa/test-plan-ipados26.md" ]; then
        mv qa/test-plan-ipados26.md docs/reports/qa/
        echo -e "${GREEN}✓ Moved test-plan-ipados26.md to docs/reports/qa/${NC}"
        QA_DOCS_MOVED=$((QA_DOCS_MOVED + 1))
    fi

    # Try to remove qa/ if empty
    if [ -z "$(ls -A qa)" ]; then
        rmdir qa
        echo -e "${GREEN}✓ Removed qa/ directory (now empty)${NC}"
    else
        echo "  qa/ directory not empty, keeping remaining files"
    fi

    if [ $QA_DOCS_MOVED -eq 0 ]; then
        echo "  No QA docs to move"
    fi
else
    echo "  qa/ directory not found (already clean)"
fi

# Step 6: Archive legacy code (P2)
echo ""
echo -e "${YELLOW}[P2] Archiving legacy code...${NC}"
if [ -d "design/legacy" ]; then
    LEGACY_COUNT=$(find design/legacy -type f 2>/dev/null | wc -l)
    if [ "$LEGACY_COUNT" -gt 0 ]; then
        mkdir -p "$ARCHIVE_ROOT/emerson-violin-pwa/legacy"
        mv design/legacy/* "$ARCHIVE_ROOT/emerson-violin-pwa/legacy/" 2>/dev/null
        rmdir design/legacy 2>/dev/null || echo "  design/legacy not empty after move"
        echo -e "${GREEN}✓ Archived $LEGACY_COUNT legacy files (~84K recovered)${NC}"
    else
        echo "  No legacy files found"
    fi
else
    echo "  design/legacy/ not found (already clean)"
fi

# Step 7: Clean old logs (P3 - optional)
echo ""
echo -e "${YELLOW}[P3] Cleaning old logs (OPTIONAL)...${NC}"
if [ -d "_logs" ] && [ -n "$(ls -A _logs/*.log 2>/dev/null)" ]; then
    read -p "Delete old log files in _logs/? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm _logs/*.log 2>/dev/null || true
        echo -e "${GREEN}✓ Removed old log files (~35K recovered)${NC}"
    else
        echo "  Keeping log files"
    fi
else
    echo "  No log files to clean"
fi

# Step 8: Update .gitignore
echo ""
echo -e "${YELLOW}Updating .gitignore...${NC}"
if ! grep -q "# Organizational cleanup additions" .gitignore 2>/dev/null; then
    cat >> .gitignore << 'EOF'

# Organizational cleanup additions (2026-01-31)
# Build artifacts
/sw.js
/sw-assets.js
/dist/

# Test artifacts
test-results/
playwright-report/
coverage/

# Logs
_logs/*.log
*.log

# OS files
.DS_Store
Thumbs.db
EOF
    echo -e "${GREEN}✓ Updated .gitignore${NC}"
else
    echo "  .gitignore already updated"
fi

# Summary
echo ""
echo -e "${GREEN}=== Cleanup Complete ===${NC}"
echo ""
echo "Summary:"
echo "  - Build artifacts removed from root"
echo "  - Duplicate mockups archived (~11M)"
echo "  - Legacy code archived (~84K)"
echo "  - Empty directories removed"
echo "  - QA docs moved to docs/reports/qa/"
echo "  - .gitignore updated"
echo ""
echo "Backup location: $BACKUP_FILE"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Verify build: npm run build"
echo "  2. Verify dev: npm run dev"
echo "  3. Review changes: git status"
echo "  4. Commit cleanup: git add -A && git commit -m 'chore: organizational cleanup'"
echo ""
echo "Full audit report: docs/reports/EMERSON_VIOLIN_ORGANIZATIONAL_AUDIT.md"
