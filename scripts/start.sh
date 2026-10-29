#!/usr/bin/env bash
# Запуск сервера. Остановка — команда stop в консоли.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${BDS_DIR:-$ROOT/server/bds}"
LD_LIBRARY_PATH=. exec ./bedrock_server
