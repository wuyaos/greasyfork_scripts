#!/usr/bin/env bash
# input: local repository directory and optional port argument.
# output: HTTP server for Tampermonkey @require debug URLs.
# pos: local userscript development helper, not a published Greasy Fork script.
set -euo pipefail

PORT="${1:-8787}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

printf 'Serving Tampermonkey debug scripts at http://127.0.0.1:%s/\n' "$PORT"
printf 'Install/update Local_Debug_Loader.user.js in Tampermonkey, then edit the required scripts normally.\n'
exec micromamba run -n base python "$ROOT/serve_debug.py" "$PORT" --directory "$ROOT"
