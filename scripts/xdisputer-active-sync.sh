#!/usr/bin/env bash
set -Eeuo pipefail

# One-command active repository sync for xDisputer.
# This wraps the safer lower-level scripts so every device/Codespace follows the same order.

RESET_LOCAL=false
SYNC_DB=false
VERIFY=false
STRICT_ENV=false
SHIP=false

for arg in "$@"; do
  case "$arg" in
    --reset-local) RESET_LOCAL=true ;;
    --sync-db) SYNC_DB=true ;;
    --verify) VERIFY=true ;;
    --strict-env) STRICT_ENV=true ;;
    --ship) SHIP=true ;;
    -h|--help)
      cat <<'HELP'
xDisputer active sync

Recommended commands:
  npm run active:sync -- --reset-local --verify
  npm run active:sync:db
  npm run active:sync -- --reset-local --sync-db --verify --strict-env --ship

Options:
  --reset-local  Reset the local clone to HEAD before pulling main.
  --sync-db      Run supabase db push after migration status is shown.
  --verify       Run typecheck and build.
  --strict-env   Fail if pulled Vercel/local env files are missing required public keys.
  --ship         After sync/verify, run deploy guard and check Vercel status.
HELP
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

INIT_ARGS=()
[[ "$RESET_LOCAL" == true ]] && INIT_ARGS+=(--reset-local)
[[ "$SYNC_DB" == true ]] && INIT_ARGS+=(--sync-db)
[[ "$VERIFY" == true ]] && INIT_ARGS+=(--verify)
[[ "$STRICT_ENV" == true ]] && INIT_ARGS+=(--strict-env)

echo "== xDisputer active sync =="
echo "Root: $ROOT_DIR"
echo "Init args: ${INIT_ARGS[*]:-(none)}"

npm run init:connections -- "${INIT_ARGS[@]}"

echo
echo "== Active connection doctor =="
if [[ "$STRICT_ENV" == true ]]; then
  npm run connections:doctor -- --strict-env
else
  npm run connections:doctor
fi

if [[ "$SHIP" == true ]]; then
  echo
  echo "== Deploy guard =="
  npm run xdisputer:guard

  echo
  echo "== Git status =="
  git status --short

  echo
  echo "== Vercel production status =="
  if ! npm run vercel:status; then
    echo "Vercel Git status is missing or not successful. Attempting direct production sync."
    npm run vercel:direct
    npm run verify:production:wait
  fi
fi

echo
echo "Expected active state: main is synced, Vercel env is pulled, Supabase migrations/RPCs are validated, and local build status is known."
