#!/usr/bin/env bash
# Установка/обновление сервера RustCraft на Linux (Ubuntu/Debian).
#   ./scripts/install.sh            — скачать Bedrock Dedicated Server и поставить аддон
#   UPDATE=1 ./scripts/install.sh   — обновить BDS до свежей версии (мир и настройки сохраняются)
# Нужны: curl, unzip, python3.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BDS="${BDS_DIR:-$ROOT/server/bds}"
WORLD="RustCraft"

# сервер уже стоит (Linux или Windows-версия) — повторно не качаем, только обновляем аддон
INSTALLED=0
{ [ -x "$BDS/bedrock_server" ] || [ -f "$BDS/bedrock_server.exe" ]; } && INSTALLED=1
if [ "$INSTALLED" = "0" ] || [ "${UPDATE:-0}" = "1" ]; then
  URL="${BDS_URL:-}"
  if [ -z "$URL" ]; then
    URL=$(curl -fsSL https://net-secondary.web.minecraft-services.net/api/v1.0/download/links |
      python3 -c 'import json,sys; print(next(l["downloadUrl"] for l in json.load(sys.stdin)["result"]["links"] if l["downloadType"]=="serverBedrockLinux"))')
  fi
  echo ">> Скачиваю $URL"
  TMP="$(mktemp -d)"
  curl -fL -A "Mozilla/5.0" -o "$TMP/bds.zip" "$URL"
  mkdir -p "$BDS"
  # при обновлении не трогаем свои настройки и список игроков
  unzip -q -o "$TMP/bds.zip" -d "$BDS" -x server.properties allowlist.json permissions.json
  for f in server.properties allowlist.json permissions.json; do
    [ -f "$BDS/$f" ] || unzip -q -o "$TMP/bds.zip" "$f" -d "$BDS"
  done
  rm -rf "$TMP"
fi

echo ">> Ставлю аддон RustCraft"
rm -rf "$BDS/behavior_packs/RustCraft_BP" "$BDS/resource_packs/RustCraft_RP"
cp -r "$ROOT/packs/RustCraft_BP" "$BDS/behavior_packs/"
cp -r "$ROOT/packs/RustCraft_RP" "$BDS/resource_packs/"
mkdir -p "$BDS/worlds/$WORLD"
cp "$ROOT/server/worlds/$WORLD/"world_*_packs.json "$BDS/worlds/$WORLD/"
# шаблон плоского мира — только для нового мира, существующий мир не трогаем
if [ ! -d "$BDS/worlds/$WORLD/db" ] && [ ! -f "$BDS/worlds/$WORLD/level.dat" ]; then
  cp "$ROOT/server/worlds/$WORLD/level.dat" "$BDS/worlds/$WORLD/level.dat"
  echo ">> Новый мир: плоская местность (леса и поляны расставит плагин terrain.js)"
fi

echo ">> Применяю настройки server/server.overrides"
python3 - "$ROOT/server/server.overrides" "$BDS/server.properties" <<'PY'
import sys
over = {}
for line in open(sys.argv[1], encoding="utf-8"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        over[k.strip()] = v.strip()
out, seen = [], set()
for line in open(sys.argv[2], encoding="utf-8"):
    k = line.split("=", 1)[0].strip()
    if not line.lstrip().startswith("#") and k in over:
        out.append(f"{k}={over[k]}\n")
        seen.add(k)
    else:
        out.append(line)
out += [f"{k}={v}\n" for k, v in over.items() if k not in seen]
open(sys.argv[2], "w", encoding="utf-8").writelines(out)
PY

echo ">> Готово. Запуск: ./scripts/start.sh"
