#!/usr/bin/env bash
# Бэкап мира без остановки сервера (save hold -> копия -> save resume).
# Хранит последние BACKUP_KEEP архивов в папке backups/.
set -euo pipefail
source "$(dirname "$0")/common.sh"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d_%H-%M)"
OUT="$BACKUP_DIR/${WORLD}_${STAMP}.tar.gz"

if [ -p "$FIFO" ] && pgrep -f bedrock_server >/dev/null; then
  send "save hold"
  sleep 10 # сервер дописывает изменения и замораживает файлы мира
  tar -czf "$OUT" -C "$BDS/worlds" "$WORLD" || true
  send "save resume"
else
  tar -czf "$OUT" -C "$BDS/worlds" "$WORLD"
fi
echo "Бэкап: $OUT ($(du -h "$OUT" | cut -f1))"
# удаляем старые
ls -1t "$BACKUP_DIR"/${WORLD}_*.tar.gz 2>/dev/null | tail -n +$((BACKUP_KEEP + 1)) | xargs -r rm -f
