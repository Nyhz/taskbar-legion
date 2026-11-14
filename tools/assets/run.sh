#!/bin/sh
# Runs the asset pipeline inside its virtual environment (created on first use), at low CPU priority.
set -eu
DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -x "$DIR/.venv/bin/python" ]; then
  sh "$DIR/setup.sh" >/dev/null
fi
cd "$DIR"
if command -v taskpolicy >/dev/null 2>&1; then
  exec taskpolicy -b nice -n 19 .venv/bin/python -m pipeline "$@"
fi
exec nice -n 19 .venv/bin/python -m pipeline "$@"
