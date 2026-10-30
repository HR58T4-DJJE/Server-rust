# shellcheck shell=bash disable=SC2034
# Общие настройки для скриптов обслуживания. Подключается через `source`.
# Папка сервера: рядом со скриптами (готовый архив) или server/bds (репозиторий).
OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "${BDS_DIR:-}" ]; then
  BDS="$BDS_DIR"
elif [ -x "$OPS_DIR/bedrock_server" ]; then
  BDS="$OPS_DIR"
elif [ -x "$OPS_DIR/../bedrock_server" ]; then
  BDS="$(cd "$OPS_DIR/.." && pwd)"
else
  BDS="$(cd "$OPS_DIR/../.." && pwd)/server/bds"
fi
FIFO="$BDS/console.in"
WORLD="RustCraft"
BACKUP_DIR="${BACKUP_DIR:-$BDS/backups}"
BACKUP_KEEP="${BACKUP_KEEP:-20}"

# Отправить команду в консоль запущенного сервера
send() {
  if [ ! -p "$FIFO" ]; then
    echo "Сервер не запущен через run.sh / службу (нет $FIFO)" >&2
    return 1
  fi
  printf '%s\n' "$*" > "$FIFO"
}
