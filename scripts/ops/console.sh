#!/usr/bin/env bash
# Отправить команду серверу:  ./console.sh say Привет   |   ./console.sh op Ник
# Смотреть вывод:            journalctl -u rustcraft -f
set -euo pipefail
source "$(dirname "$0")/common.sh"
[ $# -gt 0 ] || { echo "Использование: $0 <команда сервера>"; exit 1; }
send "$*"
