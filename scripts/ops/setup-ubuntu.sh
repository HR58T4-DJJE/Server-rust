#!/usr/bin/env bash
# Установка RustCraft на Ubuntu VPS одной командой:
#   sudo ./ops/setup-ubuntu.sh
# Что делает: проверяет процессор, ставит нужные пакеты, открывает порт 19132/UDP в ufw,
# устанавливает службу (автозапуск, автоперезапуск, бэкапы, ежедневный рестарт) и запускает сервер.
# Повторный запуск безопасен — так же применяются обновления.
set -euo pipefail
source "$(dirname "$0")/common.sh"

[ "$(id -u)" = 0 ] || { echo "Запустите от root: sudo $0"; exit 1; }

ARCH="$(uname -m)"
if [ "$ARCH" != "x86_64" ]; then
  echo "Процессор $ARCH не поддерживается: Bedrock Dedicated Server работает только на x86_64 (amd64)."
  echo "Нужен VPS на Intel/AMD, а не на ARM."
  exit 1
fi

echo ">> Пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq || true
apt-get install -y -qq unzip curl ca-certificates cron >/dev/null || echo "   (не все пакеты поставились — продолжаем)"

chmod +x "$BDS/bedrock_server" "$OPS_DIR"/*.sh
[ -f "$BDS/start.sh" ] && chmod +x "$BDS/start.sh"

# новый мир — плоский (шаблон из пакета); существующий мир не трогаем
WDIR="$BDS/worlds/$WORLD"
if [ ! -d "$WDIR/db" ] && [ ! -f "$WDIR/level.dat" ] && [ -f "$OPS_DIR/flat_level.dat" ]; then
  mkdir -p "$WDIR"
  cp "$OPS_DIR/flat_level.dat" "$WDIR/level.dat"
  echo ">> Новый мир: плоская местность"
fi

# сервер, запущенный вручную (./start.sh в screen), помешает службе — занят порт
if pgrep -x bedrock_server >/dev/null && ! systemctl is-active --quiet rustcraft 2>/dev/null; then
  echo "Сервер уже запущен вручную (./start.sh или screen). Остановите его командой stop в консоли и повторите."
  exit 1
fi

echo ">> Порт 19132/UDP"
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 19132/udp >/dev/null && echo "   открыт в ufw"
else
  echo "   ufw выключен — на самом VPS порт не закрыт"
fi
echo "   Если у хостинга есть своя панель фаервола (Security group / Firewall) — откройте там 19132 UDP."

if [ "${1:-}" = "--no-service" ]; then
  echo ">> Служба не ставится (--no-service). Запуск вручную: $OPS_DIR/run.sh"
  exit 0
fi

"$OPS_DIR/install-service.sh"
systemctl restart rustcraft # подхватить обновления, если служба уже была

IP="$(curl -4 -s --max-time 5 ifconfig.me || hostname -I | awk '{print $1}')"
echo
echo "=============================================="
echo " RustCraft запущен."
echo " Адрес для телефона: ${IP:-<IP вашего VPS>}   порт: 19132"
echo " Лог:      journalctl -u rustcraft -f"
echo " Консоль:  $OPS_DIR/console.sh <команда>   (например: op ВашНик)"
echo "=============================================="
