#!/usr/bin/env bash
# Собирает dist/RustCraft.mcaddon — его можно открыть на телефоне и проверить аддон в одиночном мире.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/dist"
cd "$ROOT/packs"
rm -f "$ROOT/dist/RustCraft.mcaddon"
zip -qr "$ROOT/dist/RustCraft.mcaddon" RustCraft_BP RustCraft_RP
echo "Готово: dist/RustCraft.mcaddon"
