// Плагин «Добыча»: залежи камня/металла/серы, бочки и военные ящики появляются
// вокруг игроков; добыча зависит от инструмента. Топором из брёвен идёт «Дерево».
import { system, world } from "@minecraft/server";
import { LOOT, NODE_DROPS, SPAWNER, TOOL_GATHER, WOOD_BONUS } from "../config.js";
import { dropLoot, giveItem, randInt } from "../lib/util.js";
import { cupboardsAt } from "./toolCupboard.js";

const CELL_PREFIX = "cell|";
const GROUND = new Set(SPAWNER.ground);
const PLANT =
  /short_grass|tall_grass|fern|flower|dandelion|poppy|tulip|orchid|allium|bluet|daisy|cornflower|lily_of_the_valley|bush|sapling|snow_layer|leaf_litter|wildflowers|pink_petals|deadbush/;
const WEIGHTS = Object.entries(SPAWNER.weights);
const TOTAL_WEIGHT = WEIGHTS.reduce((s, [, w]) => s + w, 0);

const cellKey = (x, z) => `${CELL_PREFIX}${Math.floor(x / SPAWNER.cellSize)}|${Math.floor(z / SPAWNER.cellSize)}`;

// Счётчики клеток кэшируются в памяти; в хранилище мира пишем только изменения
/** @type {Map<string, number>} */
const cells = new Map();

function cellCount(key) {
  let n = cells.get(key);
  if (n === undefined) {
    const v = world.getDynamicProperty(key);
    n = typeof v === "number" ? v : 0;
    cells.set(key, n);
  }
  return n;
}

function setCell(key, n) {
  n = Math.max(0, n);
  cells.set(key, n);
  world.setDynamicProperty(key, n === 0 ? undefined : n);
}

function changeCell(x, z, delta) {
  const key = cellKey(x, z);
  setCell(key, cellCount(key) + delta);
}

export function clearCellCache() {
  cells.clear();
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
    if (Math.random() < 0.02) setCell(key, count - 1);
    return;
  }
  if (!dim.isChunkLoaded({ x, y: player.location.y, z })) return; // не трогаем незагруженные чанки
  const spot = findSpot(dim, x, z);
  if (!spot) return;
  if (cupboardsAt(dim.id, spot.location).length) return; // не спавним в базах
  spot.setType(pickType());
  setCell(key, count + 1);
}

// Самый верхний блок часто не земля, а трава, цветок или снег — спускаемся сквозь них.
// Возвращает блок, куда поставить залежь (воздух или растение над землёй), либо undefined.
export function findSpot(dim, x, z) {
  let block;
  try {
    block = dim.getTopmostBlock({ x, z });
  } catch {
    return undefined;
  }
  for (let i = 0; i < 3 && block; i++) {
    if (block.isLiquid || block.isWaterlogged) return undefined;
    if (GROUND.has(block.typeId)) break;
    if (!PLANT.test(block.typeId)) return undefined; // листва, постройки и т.п.
    block = block.below();
  }
  if (!block || !GROUND.has(block.typeId)) return undefined;
  const spot = block.above();
  if (!spot || spot.isLiquid || !(spot.isAir || PLANT.test(spot.typeId))) return undefined;
  // двойная высокая трава: верхняя половина тоже убирается вместе с нижней
  const up = spot.above();
  if (up && PLANT.test(up.typeId)) up.setType("minecraft:air");
  return spot;
}

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (player.dimension.id !== "minecraft:overworld") continue;
    for (let i = 0; i < SPAWNER.attemptsPerPlayer; i++) {
      try {
        trySpawnNear(player);
      } catch {} // чанк на границе прогрузки — просто пропускаем попытку
    }
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
