# Documentation Maintenance Guide

> **Last Updated:** March 19, 2026

## Overview

This document outlines the documentation strategy for FinSurf, including maintenance schedules, update procedures, and automated documentation agents.

---

## Documentation Files

### Core Documentation
- **README.md** - Quick links to all documentation files (redirect index)
- **PROJECT_OVERVIEW.md** - Main project README with features, getting started, roadmap
- **CODEBASE_GUIDE.md** - Architecture, file structure, request lifecycle for developers and AI assistants
- **DEVELOPMENT_GUIDE.md** - Development setup, code conventions, PR process, deployment
- **MARKETS_EXPANSION.md** - International market expansion plans and research (India, Japan, etc.)
- **DOCS_MAINTENANCE.md** (this file) - Documentation maintenance strategy and automated agent plans

### Update History
| File | Last Updated | Major Changes |
|------|--------------|---------------|
| README.md | March 19, 2026 | Created as redirect index to renamed files |
| PROJECT_OVERVIEW.md | March 19, 2026 | Renamed from README.md; added timestamps, recent searches |
| CODEBASE_GUIDE.md | March 19, 2026 | Renamed from CLAUDE.md; updated file references |
| DEVELOPMENT_GUIDE.md | March 19, 2026 | Renamed from CONTRIBUTING.md; expanded project structure |
| MARKETS_EXPANSION.md | March 19, 2026 | Renamed from GLOBAL_EXPANSION.md; added UX improvements section |
| DOCS_MAINTENANCE.md | March 19, 2026 | Renamed from DOCUMENTATION.md; initial creation |

---

## Maintenance Schedule

### Weekly Scans (Recommended)
Run a documentation audit every **Monday** to catch:
- New components or utilities added
- API endpoint changes
- Environment variable updates
- Dependency version changes
- Breaking changes in workflows

### Monthly Deep Reviews (Recommended)
First **Monday of each month**, perform:
- Full feature inventory
- Roadmap progress check
- Dead code/deprecated feature cleanup
- Screenshot updates (if UI changed significantly)
- External link validation

### Triggered Updates (Immediate)
Update documentation immediately when:
- Adding a new agent to the pipeline
- Changing the API contract (`/api/analyze` response format)
- Modifying environment variable requirements
- Adding new deployment targets
- Releasing a major feature (v1.x → v2.x)

---

## Automated Documentation Agent (Experimental)

### Concept
A weekly-running agent that:
1. Scans the codebase for changes since last documentation update
2. Identifies files mentioned in CLAUDE.md or CONTRIBUTING.md
3. Detects new files matching patterns (e.g., `backend/*.py`, `src/components/**/*.tsx`)
4. Compares current file structure to documented structure
5. Generates a diff report of missing/outdated documentation
6. Optionally auto-updates documentation with timestamps

### Implementation Plan (Phase 1 - Manual)

**Current Approach:**
```bash
# Every Monday, run:
npm run doc-audit
```

This would:
- Use Claude Code to scan project structure
- Compare against CLAUDE.md file references
- Generate a report of documentation drift
- Save to `docs/audit-YYYY-MM-DD.md`

**Phase 2 (Future - Automated):**
- GitHub Actions workflow on schedule (cron: "0 9 * * MON")
- Runs documentation scanner script
- Creates PR with suggested updates
- Reviewer approves and merges

### Example Audit Script (Placeholder)

```javascript
// scripts/doc-audit.js
import { glob } from 'glob';
import fs from 'fs';

async function auditDocumentation() {
  const timestamp = new Date().toISOString().split('T')[0];

  // Scan all TypeScript/Python files
  const tsFiles = await glob('src/**/*.{ts,tsx}');
  const pyFiles = await glob('backend/**/*.py');

  // Read CLAUDE.md file references
  const claudeDoc = fs.readFileSync('CLAUDE.md', 'utf-8');

  // Find files mentioned in docs
  const documentedFiles = extractFileReferences(claudeDoc);

  // Find undocumented files
  const allFiles = [...tsFiles, ...pyFiles];
  const undocumented = allFiles.filter(f => !documentedFiles.includes(f));

  // Generate report
  const report = generateReport(undocumented, timestamp);
  fs.writeFileSync(`docs/audit-${timestamp}.md`, report);

  console.log(`✅ Documentation audit complete: docs/audit-${timestamp}.md`);
}

function extractFileReferences(markdown) {
  // Extract file paths from markdown table rows
  const pattern = /\| `([^`]+)` \|/g;
  const matches = [...markdown.matchAll(pattern)];
  return matches.map(m => m[1]);
}

function generateReport(undocumented, timestamp) {
  return `# Documentation Audit Report
> Generated: ${timestamp}

## Undocumented Files (${undocumented.length})

${undocumented.map(f => `- [ ] ${f}`).join('\n')}

## Recommendations

1. Add entries to CLAUDE.md for critical files
2. Update project structure in CONTRIBUTING.md
3. Check if any deprecated files should be removed
`;
}

auditDocumentation();
```

### Adding to package.json

```json
{
  "scripts": {
    "doc-audit": "node scripts/doc-audit.js"
  }
}
```

---

## Documentation Style Guide

### Timestamps
All documentation files should have a "Last Updated" timestamp at the top:
```markdown
> **Last Updated:** March 19, 2026
```

Format: `MMMM DD, YYYY` (e.g., March 19, 2026)

### File References
When documenting code files:
- Use **code formatting**: `` `server.ts` ``
- Include relative path if ambiguous: `` `backend/agents.py` ``
- Add one-line description after the filename
- Keep descriptions under 100 characters

### Feature Status Indicators
Use these emojis consistently:
- ✅ **Production** - Live and stable
- 🚧 **In Progress** - Active development
- 📋 **Planned** - Roadmap item
- ⚠️ **Deprecated** - Will be removed
- 🔬 **Experimental** - Testing/validation phase

### Code Blocks
- Use syntax highlighting: ````typescript`, ````python`, ````bash`
- Keep examples under 30 lines
- Add comments for complex logic
- Use real file paths when showing examples

---

## Manual Update Checklist

When updating documentation manually:

### PROJECT_OVERVIEW.md
- [ ] Update "Last Updated" timestamp
- [ ] Check Project Status table reflects current features
- [ ] Verify all screenshots are current (if UI changed)
- [ ] Update "What It Does" section for new features
- [ ] Add new learnings to "What I Learned Building This"
- [ ] Update roadmap/timeline if milestones shifted

### CODEBASE_GUIDE.md
- [ ] Update "Last Updated" timestamp
- [ ] Add new files to file reference tables
- [ ] Update architecture paragraph if data flow changed
- [ ] Verify all file paths are correct
- [ ] Update environment variables section
- [ ] Check "Common Tasks" commands still work

### DEVELOPMENT_GUIDE.md
- [ ] Update "Last Updated" timestamp
- [ ] Update project structure diagram
- [ ] Add new scripts to package.json reference
- [ ] Document any new development dependencies
- [ ] Update testing instructions if test structure changed

### MARKETS_EXPANSION.md
- [ ] Update "Last Updated" timestamp
- [ ] Note any features that benefit global expansion
- [ ] Update per-market research with new findings
- [ ] Document any region-specific considerations for new features

---

## Version Control for Documentation

### Commit Message Format
```
docs: update README with timestamps feature

- Added "Last Updated" timestamp
- Documented TimestampBadge component
- Updated Project Status table
```

### Documentation-Only PRs
For documentation-only changes:
- Label: `documentation`
- No code review required for typos/formatting
- Require review for architectural/technical description changes

---

## Future Improvements

### Short Term (Q2 2026)
- [ ] Implement `npm run doc-audit` script
- [ ] Create `docs/audits/` directory for reports
- [ ] Add documentation update check to CI/CD

### Medium Term (Q3 2026)
- [ ] GitHub Actions workflow for weekly audits
- [ ] Automated PR creation for doc updates
- [ ] Screenshot automation for UI changes

### Long Term (Q4 2026+)
- [ ] AI-powered documentation assistant
- [ ] Auto-generate API docs from TypeScript types
- [ ] Interactive documentation site (VitePress/Docusaurus)

---

## Contact

For questions about documentation maintenance:
- Open a GitHub Discussion with label `documentation`
- Tag: `@sachined` in documentation-related issues

---

**Last Manual Review:** March 19, 2026
**Next Scheduled Review:** March 24, 2026 (Monday)
