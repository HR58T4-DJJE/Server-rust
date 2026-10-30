#!/usr/bin/env bash
# Плановый перезапуск с предупреждением игроков. Служба rustcraft сама поднимет сервер.
set -euo pipefail
source "$(dirname "$0")/common.sh"
send "say §e[Сервер] Перезапуск через 5 минут"
sleep 240
send "say §e[Сервер] Перезапуск через 1 минуту"
sleep 50
send "say §c[Сервер] Перезапуск через 10 секунд"
sleep 10
send "stop"
