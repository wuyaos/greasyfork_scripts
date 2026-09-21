#!/usr/bin/env bash
# input: local repository directory and optional port argument.
# output: HTTP server for Tampermonkey @require debug URLs.
# pos: local userscript development helper, not a published Greasy Fork script.
set -euo pipefail

PORT="${1:-8787}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

printf 'Serving Tampermonkey debug scripts at http://127.0.0.1:%s/\n' "$PORT"
printf 'Install dist/Local_Debug_Loader.user.js; edit src/ and run npm run build before refreshing.\n'
exec micromamba run -n base python "$SCRIPT_DIR/serve_debug.py" "$PORT" --directory "$ROOT"
