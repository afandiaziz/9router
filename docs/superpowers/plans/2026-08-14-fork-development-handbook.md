# 9Router Fork Development Handbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an evidence-based Indonesian handbook and operational runbooks for developing the 9Router fork on a laptop and releasing it safely to the VPS production runtime.

**Architecture:** A single handbook explains repository topology, lifecycle, policies, fork history, and production gates. Four focused runbooks contain executable checklists for laptop setup, upstream synchronization, release/deployment, and rollback/recovery. All commands and paths are verified against repository files or the live production layout; secrets are represented only by placeholders.

**Tech Stack:** Markdown, Git/GitHub, Node.js 22, npm, Vitest, Next.js 16, Docker/Compose, GitHub Actions, GHCR, nginx, SQLite.

## Global Constraints

- Write in clear technical Indonesian.
- Use POSIX-shell commands with explicit directories; add Windows+WSL2, macOS, and Linux notes where setup differs.
- Never include actual `.env` values, API keys, tokens, passwords, JWT secrets, database encryption keys, or GitHub secrets.
- Treat `/home/ubuntu/9router-fork` as source and `/home/ubuntu/9router` as production runtime; do not conflate them.
- Preserve fork-only Quota Sharing, Check Usage, and Invalid Providers during upstream synchronization.
- Report test baselines honestly; never describe pre-existing failures as passing.
- Warn that database schema migrations may not be reversible and that `DB_ENCRYPTION_KEY` must travel with database backups.
- Commands that mutate remote repositories, tags, production containers, or databases must include prerequisites and verification steps.
- Use `v<upstream-version>-forkN` tag examples and explain that pushing a `v*` tag triggers `.github/workflows/docker-publish.yml`.

---

### Task 1: Write the Development Handbook

**Files:**
- Create: `docs/FORK-DEVELOPMENT-HANDBOOK.md`
- Reference: `FORK-CHANGES.md`, `README.md`, `DOCKER.md`, `package.json`, `tests/package.json`, `.env.example`, `.github/workflows/docker-publish.yml`, `Dockerfile`, `docker-compose.yml`

**Interfaces:**
- Produces: canonical overview linked to all four runbooks.
- Consumes: verified repository and production topology from the approved design spec.

- [ ] **Step 1: Write repository topology and lifecycle**

Document source vs runtime directories and this pipeline:

```text
Laptop clone → origin/master → v* tag → GitHub Actions → GHCR → VPS Compose → nginx → public domain
```

Explain `origin`, `upstream`, feature branches/worktrees, and why `master` represents the release candidate.

- [ ] **Step 2: Document development and release policy**

Cover branch naming, commits, tag convention, upstream comparison/conflict policy, protected fork features, and production gates. Include links to all runbooks using relative Markdown paths.

- [ ] **Step 3: Document session history and lessons**

Summarize the implemented Quota Sharing/Check Usage/lifetime quota/model alias work, Invalid Providers/provider-node UI work, and v0.5.55 merge/security update. Include concrete lessons about stale GHCR `latest`, container recreation, trial merges, test baselines, generated snapshot cleanup, and security fixes.

- [ ] **Step 4: Document architecture, secrets, data, and operational boundaries**

Include verified ports (`20127` local dev, `20129` current production via `.env`/nginx), database layout, secret portability, nginx trust boundary, and the rule that production data is not copied into a laptop without an explicit sanitized process.

- [ ] **Step 5: Self-check handbook**

Verify every relative link exists, every command uses the correct source/runtime directory, and no actual secret value appears.

---

### Task 2: Write Laptop Setup and Upstream Sync Runbooks

**Files:**
- Create: `docs/runbooks/laptop-setup.md`
- Create: `docs/runbooks/upstream-sync.md`

**Interfaces:**
- Consumes: handbook policies and repository remotes.
- Produces: reproducible laptop bootstrap plus safe upstream comparison/merge procedure.

- [ ] **Step 1: Write cross-platform laptop setup**

Include prerequisites for Windows+WSL2, macOS, and Linux; clone `https://github.com/afandiaziz/9router.git`; add/fetch `https://github.com/decolua/9router.git`; install root and test dependencies; create `.env` from `.env.example` using placeholders; run dev server, targeted tests, full suite, and build.

- [ ] **Step 2: Write laptop verification and data-safety checklist**

Include `git remote -v`, `git status`, version checks, port checks, no production secrets/data, and optional Docker local test.

- [ ] **Step 3: Write upstream comparison flow**

Provide exact commands for `git fetch upstream --tags`, merge-base, left/right commit counts, upstream log, changed files, and tag comparison. Explain how to read results.

- [ ] **Step 4: Write safe merge/conflict flow**

Use a feature/upgrade branch and backup tag/branch; perform trial merge; list conflicts; prioritize upstream outside fork-specific features; preserve quota/invalid-provider code; abort for analysis or resolve with explicit `--ours`/`--theirs`; run targeted/full tests and build before merging to master.

- [ ] **Step 5: Add v0.5.55 case study**

Document the three actual conflict files and decisions: upstream deletion of legacy OpenCode-Go executor, upstream Qoder wrapper, upstream Gemini usage envelope; explain why trial merge evidence is preferable to guessing.

---

### Task 3: Write Release/Deploy and Rollback Runbooks

**Files:**
- Create: `docs/runbooks/release-and-deploy.md`
- Create: `docs/runbooks/rollback-and-recovery.md`

**Interfaces:**
- Consumes: verified GitHub Actions and production Compose topology.
- Produces: checklists for release, deployment, verification, rollback, and recovery.

- [ ] **Step 1: Write pre-release gates**

Require clean tree, reviewed diff, targeted fork tests, full-suite baseline comparison, production build, security checks, version/tag selection, and rollback plan.

- [ ] **Step 2: Write tagging, CI, and GHCR flow**

Include annotated tag creation, push master then tag, verify GitHub Actions, explain image tags and `latest`, and warn against deploying before the registry digest changes.

- [ ] **Step 3: Write production backup and deployment flow**

Use `/home/ubuntu/9router`; inspect target; stop only when required; backup `data/db` and `.env` securely; run `docker compose pull` and `docker compose up -d`; verify the container `Created` timestamp changed. Do not include actual secret values.

- [ ] **Step 4: Write smoke tests**

Include `docker compose ps`, logs, local/public health `200`, protected endpoint `401` unauthenticated, authenticated dashboard/API verification, and feature-specific smoke tests for Check Usage/Quota/Invalid Providers.

- [ ] **Step 5: Write rollback and recovery procedures**

Separate image rollback (pin previous version tag) from DB restore. Require stopping writes, preserving failed-state evidence, checking schema compatibility, restoring DB/WAL/SHM consistently, retaining `DB_ENCRYPTION_KEY`, and verifying health after rollback.

- [ ] **Step 6: Add incident troubleshooting**

Cover stale `latest`, container remains old, CI/tag not triggered, missing encryption key, migration incompatibility, reverse-proxy/port mismatch, failed build/test, and trial merge cleanup.

---

### Task 4: Verify and Review the Documentation

**Files:**
- Review: `docs/FORK-DEVELOPMENT-HANDBOOK.md`
- Review: `docs/runbooks/laptop-setup.md`
- Review: `docs/runbooks/upstream-sync.md`
- Review: `docs/runbooks/release-and-deploy.md`
- Review: `docs/runbooks/rollback-and-recovery.md`

**Interfaces:**
- Consumes: all documentation from Tasks 1–3.
- Produces: verified, safe, internally linked documentation ready to commit.

- [ ] **Step 1: Verify commands against repository evidence**

Check scripts, paths, workflow trigger, image name, tags, port topology, and health endpoints against current files. Correct any command that cannot be justified.

- [ ] **Step 2: Scan for secrets and unsafe examples**

Search the five files for common secret names and confirm only variable names/placeholders appear. Check that no live `.env` value, token, key, cookie, or credential is copied.

- [ ] **Step 3: Verify links and placeholders**

Resolve every relative Markdown link and reject `TODO`, `TBD`, unfilled angle-bracket placeholders without explanation, or commands that omit their working directory.

- [ ] **Step 4: Run separate writer/reviewer passes**

The writer produces/revises content; a separate reviewer checks technical accuracy, completeness, reversibility, destructive-command warnings, and consistency with the approved design. Address all Critical/Important findings.

- [ ] **Step 5: Commit documentation**

```bash
git add docs/FORK-DEVELOPMENT-HANDBOOK.md docs/runbooks/
git commit -m "docs: add fork development and production handbook"
```
