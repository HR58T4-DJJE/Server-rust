// RustCraft — выживание в стиле Rust для Minecraft Bedrock.
// Каждый файл в plugins/ — отдельный «плагин», их можно отключать, закомментировав импорт.
import "./plugins/toolCupboard.js"; // шкафы и защита баз
import "./plugins/raid.js"; // HP построек, C4, сумки с зарядом
import "./plugins/building.js"; // киянка: улучшение и ремонт
import "./plugins/gathering.js"; // залежи, бочки, добыча
import "./plugins/crafting.js"; // меню крафта и верстаки
import "./plugins/combat.js"; // огнестрел и медицина
import "./plugins/spawnPoints.js"; // поиск безопасных точек случайного спавна
import "./plugins/spawn.js"; // случайный спавн, стартовый набор, спальники
import "./plugins/mobs.js"; // запрещённые мобы (вода, скелеты, криперы, ведьмы, разбойники)
import "./plugins/bannedItems.js"; // запрещённые блоки (обсидиан, эндер-сундук, шалкеры, TNT...)
import "./plugins/recycler.js"; // переработчик
import "./plugins/hud.js"; // надпись о зоне шкафа
import "./plugins/lagGuard.js"; // защита от лагов и монитор TPS
import "./plugins/commands.js"; // команды /rust:*

console.warn("[RustCraft] Плагины загружены");
