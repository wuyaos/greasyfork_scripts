# Userscript Migration Checks

Run from the repository root with Node.js 20.19+:

```bash
npm ci
npm run build
npm run check
```

No test connects to a target site. The test DOM has site-shaped URLs to exercise existing routing; JSDOM does not load external resources, and fetch, XMLHttpRequest, WebSocket and GM requests are intercepted. Local Debug Loader receives canned code instead of an HTTP response.

## Baselines

- `contracts/migration-baseline.json`: SHA-256 of 14 original files, metadata, global identifier sets, and top-level statement AST hashes. Original capture: 597 statements from commit `278cecfe6ad007f6e7b8707370bad85c31c1c9f6`. After the approved 2026-09-22 dead-code/defensive-cleanup round it was rebuilt from current sources via `node tests/migration-contracts.mjs --regen` (1033 statements — module top-level now includes import/export lines). Positions and formatting are excluded, but literal values, selectors, callbacks, operators and function bodies are retained.
- `contracts/offline-baseline.json`: Original scripts' initialization results in the synthetic DOM. Styles and shadow content are hashed; menus, DOM IDs, timers, console errors and blocked requests are compared. bangumi-enhanced embeds the current weekday in its stylesheet, so the harness pins `Date` to the baseline Monday (2026-09-21) for both capture and verification.
- `migration-contracts.mjs`: Traverses actual source imports, reconstructs extracted static CSS and GitHub object namespaces, then checks the AST contracts. The only normalized runtime string change is Local Debug Loader's `/dist/` URL. Metadata permits patch versions, `/dist/` update URLs, and the previously missing GitHub `GM_deleteValue` grant.
- `offline-smoke.mjs`: Runs the actual published IIFE artifacts and compares initialization with the original scripts. Existing timer delays are recorded, not executed as real polling loops. Original baseline has no page exceptions or external requests in this fixture.
- `build-cli.mjs`: Uses an isolated temporary copy to test single-script builds, stale-output detection, deterministic output, invalid CLI arguments, and no earlier artifact overwrite after a later bundle fails.

Routine verification never updates baselines. `node tests/offline-smoke.mjs --capture` is a deliberate maintenance action and reads only the original commit with `git show`; do not replace expected results with current output to silence a failure. `node tests/migration-contracts.mjs --regen` is likewise a deliberate, documented maintenance action for approved cleanup rounds.

## MoviePilot V2/V3 response compatibility

After authorization to run behavior checks, use the standalone offline suite:

```bash
node --test tests/moviepilot-response.mjs
```

It uses the supplied V3.0.8 envelope samples alongside V2 objects, raw/wrapped login tokens, arrays, null recognition results, and HTTP/business failures. The integration case mocks GM requests and checks recognition, site lookup, clients, push acknowledgment, and isolation of TMDB/M-Team responses. No real MoviePilot instance is contacted.

This suite is separate from the immutable migration AST baseline. Intentional API behavior changes are not migration parity; do not regenerate that baseline to hide the changes.

## PT batch ZIP writer

After authorization, run `node --test tests/pt-batch-zip.mjs`. It validates the built-in STORE writer offline: CRC-32 check vectors, EOCD/central-directory/local-header field walk, UTF-8 names, and verbatim payloads. No network requests; JSZip is no longer part of the ZIP path (its `@require` remains for metadata stability). Real Tampermonkey sandbox behavior still needs a user-side run.

## Limits

## Limits

`NOT_VERIFIED`: live authenticated pages, all theme variants, native Tampermonkey realms, Windows-native Node execution, external API responses, real downloads, approvals or claims. These require separate user authorization and targeted fixtures or the user's running browser. Initialization parity is not full workflow equivalence; AST contracts and independent review complement it.

## Rollback

The pre-migration snapshot is outside the repository at `../greasyfork_scripts-migration-backups/20260921-134343/`. The original repository commit is recorded above. Restore only the affected script and its corresponding source/build changes, not the whole worktree. Publishing the new `dist/` URLs requires reinstalling the old root-URL userscripts once; there are deliberately no duplicate root artifacts.
