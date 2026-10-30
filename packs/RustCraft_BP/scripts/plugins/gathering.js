// Плагин «Добыча»: залежи камня/металла/серы, бочки и военные ящики появляются
// вокруг игроков; добыча зависит от инструмента. Топором из брёвен идёт «Дерево».
import { system, world } from "@minecraft/server";
import { LOOT, NODE_DROPS, SPAWNER, TOOL_GATHER, WOOD_BONUS } from "../config.js";
import { dropLoot, giveItem, randInt } from "../lib/util.js";
import { cupboardsAt } from "./toolCupboard.js";

const CELL_PREFIX = "cell|";
const GROUND = new Set(SPAWNER.ground);
const WEIGHTS = Object.entries(SPAWNER.weights);
const TOTAL_WEIGHT = WEIGHTS.reduce((s, [, w]) => s + w, 0);

const cellKey = (x, z) => `${CELL_PREFIX}${Math.floor(x / SPAWNER.cellSize)}|${Math.floor(z / SPAWNER.cellSize)}`;

function cellCount(key) {
  const v = world.getDynamicProperty(key);
  return typeof v === "number" ? v : 0;
}

function changeCell(x, z, delta) {
  const key = cellKey(x, z);
  const n = Math.max(0, cellCount(key) + delta);
  world.setDynamicProperty(key, n === 0 ? undefined : n);
}

function pickType() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const [id, w] of WEIGHTS) {
    if ((r -= w) < 0) return id;
  }
  return WEIGHTS[0][0];
}

function trySpawnNear(player) {
  const dim = player.dimension;
  const a = Math.random() * Math.PI * 2;
  const d = SPAWNER.minDist + Math.random() * (SPAWNER.maxDist - SPAWNER.minDist);
  const x = Math.floor(player.location.x + Math.cos(a) * d);
  const z = Math.floor(player.location.z + Math.sin(a) * d);
  const key = cellKey(x, z);
  const count = cellCount(key);
  if (count >= SPAWNER.maxPerCell) {
    // самовосстановление счётчика, если залежи пропали не через добычу
    if (Math.random() < 0.02) world.setDynamicProperty(key, count - 1);
    return;
  }
  if (!dim.isChunkLoaded({ x, y: player.location.y, z })) return; // не трогаем незагруженные чанки
  let top;
  try {
    top = dim.getTopmostBlock({ x, z });
  } catch {
    return;
  }
  if (!top || !GROUND.has(top.typeId)) return;
  const above = top.above();
  if (!above?.isAir) return;
  if (cupboardsAt(dim.id, above.location).length) return; // не спавним в базах
  above.setType(pickType());
  world.setDynamicProperty(key, count + 1);
}

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (player.dimension.id !== "minecraft:overworld") continue;
    for (let i = 0; i < SPAWNER.attemptsPerPlayer; i++) trySpawnNear(player);
  }
}, SPAWNER.intervalTicks);

const isLog = (id) => /^minecraft:.*(_log|_stem|_wood|_hyphae)$/.test(id) && !id.includes("stripped");
const isGrass = (id) => /^minecraft:(short_grass|tall_grass|fern|large_fern)$/.test(id);

world.afterEvents.playerBreakBlock.subscribe(({ player, block, brokenBlockPermutation, itemStackBeforeBreak }) => {
  const type = brokenBlockPermutation.type.id;
  const tool = itemStackBeforeBreak?.typeId;

  const drops = NODE_DROPS[type];
  if (drops) {
    const mult = TOOL_GATHER[tool] ?? 0.5; // голыми руками — половина
    for (const [id, min, max, chance] of drops) {
      if (Math.random() > chance) continue;
      const n = Math.max(1, Math.round(randInt(min, max) * mult));
      giveItem(player, id, n);
    }
    player.playSound("random.orb", { volume: 0.3, pitch: 1.6 });
    changeCell(block.x, block.z, -1);
    return;
  }
  if (LOOT[type]) {
    dropLoot(block.dimension, block.center(), LOOT[type]);
    changeCell(block.x, block.z, -1);
    return;
  }
  if (isLog(type) && WOOD_BONUS[tool]) {
    giveItem(player, "rust:wood", WOOD_BONUS[tool]);
    return;
  }
  // трава иногда даёт ткань (вместо конопли из Rust)
  if (isGrass(type) && Math.random() < 0.2) giveItem(player, "rust:cloth", 1);
});
