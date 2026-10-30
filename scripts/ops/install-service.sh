#!/usr/bin/env bash
# Устанавливает сервер как службу Linux (запуск от root):
#  - автозапуск при старте VPS и автоперезапуск, если сервер упал;
#  - бэкап мира каждые 6 часов;
#  - ежедневный перезапуск в 05:00 с предупреждением игроков (чистит память, держит TPS ровным).
set -euo pipefail
source "$(dirname "$0")/common.sh"
[ "$(id -u)" = 0 ] || { echo "Запустите от root: sudo $0"; exit 1; }
chmod +x "$OPS_DIR"/*.sh

cat > /etc/systemd/system/rustcraft.service <<UNIT
[Unit]
Description=RustCraft Minecraft Bedrock server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$BDS
ExecStart=$OPS_DIR/run.sh
ExecStop=/bin/sh -c 'echo stop > $FIFO; sleep 10'
Restart=always
RestartSec=10
LimitNOFILE=65536
Nice=-5

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/cron.d/rustcraft <<CRON
SHELL=/bin/bash
0 */6 * * * root $OPS_DIR/backup.sh >> $BDS/backups.log 2>&1
55 4 * * * root $OPS_DIR/restart.sh >> $BDS/restart.log 2>&1
CRON

systemctl daemon-reload
systemctl enable --now rustcraft
echo "Готово. Статус: systemctl status rustcraft   Лог: journalctl -u rustcraft -f"
echo "Команды серверу: $OPS_DIR/console.sh <команда>"
