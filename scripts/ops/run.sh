#!/usr/bin/env bash
# Запуск сервера с «почтовым ящиком» для команд (console.in):
# другие скрипты (бэкап, рестарт) и ./console.sh могут отправлять команды в консоль.
set -euo pipefail
source "$(dirname "$0")/common.sh"
cd "$BDS"
[ -p "$FIFO" ] || { rm -f "$FIFO"; mkfifo "$FIFO"; }
# держим FIFO открытым на чтение и запись, чтобы сервер не получил EOF, когда команда отправлена
exec 3<>"$FIFO"
LD_LIBRARY_PATH=. exec ./bedrock_server <&3
