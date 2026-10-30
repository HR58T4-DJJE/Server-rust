#!/usr/bin/env bash
# Собирает готовый сервер для Ubuntu: dist/RustCraft-Server-Linux.zip
# (свежий Bedrock Dedicated Server + аддон RustCraft + настройки + скрипты обслуживания).
#   ./scripts/build-release.sh            — скачать BDS с minecraft.net
#   BDS_URL=file:///путь/к/bds.zip ...    — взять уже скачанный архив BDS
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="RustCraft-Server-Linux"
OUT="$ROOT/dist/$NAME"
rm -rf "$OUT" "$ROOT/dist/$NAME.zip"
mkdir -p "$ROOT/dist"

BDS_DIR="$OUT" "$ROOT/scripts/install.sh"
cp -r "$ROOT/scripts/ops" "$OUT/ops"
cp "$ROOT/server/ПРОЧТИ.txt" "$OUT/ПРОЧТИ.txt"
cat > "$OUT/start.sh" <<'SH'
#!/usr/bin/env bash
# Ручной запуск в терминале (для проверки). На VPS лучше: sudo ./ops/setup-ubuntu.sh
cd "$(dirname "$0")"
LD_LIBRARY_PATH=. exec ./bedrock_server
SH
chmod +x "$OUT/start.sh" "$OUT/bedrock_server" "$OUT"/ops/*.sh
# версия BDS = самый новый vanilla_X.Y.Z среди его behavior packs
VER=""
for d in "$OUT"/behavior_packs/vanilla_*; do VER="$(printf '%s\n%s\n' "$VER" "${d##*vanilla_}" | sort -V | tail -1)"; done
echo "Bedrock Dedicated Server ${VER:-?} + RustCraft $(date +%Y-%m-%d)" > "$OUT/VERSION.txt"

# в пакет не должно попасть ничего лишнего
rm -rf "$OUT/worlds/RustCraft/db" "$OUT"/worlds/RustCraft/level* "$OUT"/ContentLog* "$OUT/backups"
if grep -rq "selftest" "$OUT/behavior_packs/RustCraft_BP/scripts"; then
  echo "ОШИБКА: в пакет попал тестовый код" >&2
  exit 1
fi
(cd "$ROOT/dist" && zip -qr -9 "$NAME.zip" "$NAME")
echo "Готово: dist/$NAME.zip ($(du -h "$ROOT/dist/$NAME.zip" | cut -f1))"
