// Плагин «Точки спавна»: заранее, в фоне, находит безопасные места на суше для случайного спавна.
// Сервер по одному подгружает участки карты (тикинг-зоной), проверяет землю и запоминает точку.
// Поэтому игрок появляется сразу на земле: не висит в воздухе, не падает в воду
// и не ждёт генерации карты.
import { system, world } from "@minecraft/server";
import { SPAWN } from "../config.js";
import { readJSON, writeJSON } from "../lib/util.js";
import { cupboardsAt } from "./toolCupboard.js";
import { decorateArea } from "./terrain.js";

const POOL_KEY = "rust:spawn_pool";
const AREA = "rc_spawn_scout";
const SAFE = new Set(SPAWN.safeGround);
// растения и снег, сквозь которые можно стоять
const PASSABLE =
  /short_grass|tall_grass|fern|flower|dandelion|poppy|tulip|orchid|allium|bluet|daisy|cornflower|lily_of_the_valley|bush|sapling|snow_layer|leaf_litter|wildflowers|pink_petals/;
const DANGER = /leaves|lava|magma|cactus|fire|ice|powder_snow|sweet_berry/;

/** @type {{x:number,y:number,z:number}[]} */
let pool = [];
let scouting = false;

const overworld = () => world.getDimension("minecraft:overworld");

function savePool() {
  writeJSON(world, POOL_KEY, pool);
}

function cmd(dim, command) {
  try {
    dim.runCommand(command);
    return true;
  } catch {
    return false;
  }
}

/** Высота, на которой можно стоять в столбце x,z, или undefined, если место плохое */
function findGround(dim, x, z) {
  let block;
  try {
    block = dim.getTopmostBlock({ x, z });
  } catch {
    return undefined;
  }
  for (let i = 0; i < 4 && block; i++) {
    if (block.isLiquid || block.isWaterlogged || DANGER.test(block.typeId)) return undefined;
    if (SAFE.has(block.typeId)) break;
    block = block.below();
  }
  if (!block || !SAFE.has(block.typeId)) return undefined;
  const feet = block.above();
  const head = feet?.above();
  for (const b of [feet, head]) {
    if (!b || b.isLiquid || !(b.isAir || PASSABLE.test(b.typeId))) return undefined;
  }
  return block.y + 1;
}

// Вода в радиусе 3 блоков — место не подходит (чтобы не появляться на кромке пруда или моря)
function nearWater(dim, x, z) {
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      try {
        // getTopmostBlock пропускает воду и возвращает дно, поэтому смотрим и блок над ним
        const top = dim.getTopmostBlock({ x: x + dx, z: z + dz });
        if (!top || top.isLiquid || top.isWaterlogged || top.above()?.isLiquid) return true;
      } catch {
        return true;
      }
    }
  }
  return false;
}

function isGoodSpot(dim, x, z) {
  const y = findGround(dim, x, z);
  if (y === undefined) return undefined;
  if (nearWater(dim, x, z)) return undefined;
  if (cupboardsAt(dim.id, { x, y, z }).length) return undefined; // не в чужой базе
  return y;
}

// Перебор кандидатов растянут на несколько тиков (по одному кандидату за тик),
// чтобы поиск точки не создавал микрофризов для игроков.
function* pickPointJob(dim, cx, cz, out) {
  const tries = [[0, 0]];
  for (let i = 0; i < 20; i++) tries.push([Math.floor(Math.random() * 25) - 12, Math.floor(Math.random() * 25) - 12]);
  for (const [dx, dz] of tries) {
    const x = cx + dx;
    const z = cz + dz;
    let y;
    try {
      y = isGoodSpot(dim, x, z);
    } catch {} // чанк ещё не готов — пропускаем кандидата
    if (y !== undefined) {
      out.point = { x, y, z };
      return;
    }
    yield;
  }
}

function areaLoaded(dim, cx, cz) {
  for (const [dx, dz] of [
    [0, 0],
    [16, 0],
    [-16, 0],
    [0, 16],
    [0, -16],
  ]) {
    if (!dim.isChunkLoaded({ x: cx + dx, y: 64, z: cz + dz })) return false;
  }
  return true;
}

/** Подгружает случайный участок карты и ищет на нём точку спавна */
function scout(replace) {
  if (scouting) return;
  scouting = true;
  const dim = overworld();
  // центр чанка, чтобы зона радиусом 1 чанк накрыла всё вокруг точки
  const cx = Math.floor(((Math.random() * 2 - 1) * SPAWN.radius) / 16) * 16 + 8;
  const cz = Math.floor(((Math.random() * 2 - 1) * SPAWN.radius) / 16) * 16 + 8;
  cmd(dim, `tickingarea remove ${AREA}`);
  if (!cmd(dim, `tickingarea add circle ${cx} 64 ${cz} 1 ${AREA}`)) {
    scouting = false;
    return;
  }
  const finish = (point) => {
    cmd(dim, `tickingarea remove ${AREA}`);
    scouting = false;
    if (!point) return;
    if (replace && pool.length) pool[Math.floor(Math.random() * pool.length)] = point;
    else pool.push(point);
    savePool();
  };
  let waited = 0;
  const handle = system.runInterval(() => {
    waited++;
    let loaded = false;
    try {
      loaded = areaLoaded(dim, cx, cz);
    } catch {}
    if (!loaded && waited < 30) return;
    system.clearRun(handle);
    if (!loaded) return finish(undefined); // участок так и не загрузился — попробуем другой
    const out = {};
    system.runJob(
      (function* () {
        try {
          // сначала природа вокруг (в плоском мире), чтобы точка не оказалась под будущим деревом
          yield* decorateArea(dim, Math.floor(cx / 16), Math.floor(cz / 16), 1);
          yield* pickPointJob(dim, cx, cz, out);
        } finally {
          finish(out.point); // вызывается всегда, даже при ошибке, — поиск не «застрянет»
        }
      })()
    );
  }, 20);
}

world.afterEvents.worldLoad.subscribe(() => {
  pool = readJSON(world, POOL_KEY, []);
  cmd(overworld(), `tickingarea remove ${AREA}`); // хвост от прошлого запуска
  console.warn(`[RustCraft] Точек спавна в запасе: ${pool.length}/${SPAWN.poolSize}`);
  system.runInterval(() => {
    if (SPAWN.randomSpawn && pool.length < SPAWN.poolSize) scout(false);
  }, SPAWN.scoutIntervalTicks);
  system.runInterval(() => {
    if (SPAWN.randomSpawn && pool.length >= SPAWN.poolSize) scout(true);
  }, SPAWN.refreshIntervalTicks);
});

export function spawnPointCount() {
  return pool.length;
}

/** Случайная проверенная точка не в чужой базе (или undefined, если запас ещё пуст) */
export function pickSpawnPoint() {
  if (!pool.length) return undefined;
  const dim = overworld();
  for (let i = 0; i < 5; i++) {
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (!cupboardsAt(dim.id, p).length) return p;
  }
  return undefined;
}

/**
 * Телепорт с затемнением экрана: пока экран чёрный, телефон подгружает новое место,
 * и игрок не видит, как висит в воздухе. Плавное падение страхует от урона.
 */
export function fadeTeleport(player, location, dimension) {
  try {
    player.camera.fade({
      fadeColor: { red: 0, green: 0, blue: 0 },
      fadeTime: { fadeInTime: 0.2, holdTime: 1.5, fadeOutTime: 0.6 },
    });
  } catch {}
  player.addEffect("slow_falling", 20 * 4, { showParticles: false });
  system.runTimeout(() => {
    if (player.isValid) player.teleport(location, { dimension });
  }, 4);
}

/** Через 2 секунды после появления на точке убеждаемся, что место всё ещё нормальное */
export function verifySpawnPoint(player, point, tries = 0) {
  const dim = overworld();
  system.runTimeout(() => {
    if (!player.isValid || !dim.isChunkLoaded(point)) return;
    let y;
    try {
      y = findGround(dim, point.x, point.z);
    } catch {
      return; // чанк ещё не готов — игрок уже стоит на проверенной точке
    }
    if (y === undefined) {
      // место застроили или залили водой — убираем точку и переносим игрока на другую
      pool = pool.filter((p) => !(p.x === point.x && p.z === point.z));
      savePool();
      if (tries < 3) teleportToSpawnPoint(player, tries + 1);
      return;
    }
    if (y !== point.y) {
      point.y = y;
      savePool();
      player.teleport({ x: point.x + 0.5, y, z: point.z + 0.5 }, { dimension: dim });
    }
  }, 40);
}

/**
 * Переносит игрока на случайную проверенную точку (первый вход, выбор «случайное место»).
 * Возвращает false, если запас ещё пуст — тогда игрок остаётся на обычной точке спавна мира (она на земле).
 */
export function teleportToSpawnPoint(player, tries = 0) {
  const point = pickSpawnPoint();
  if (!point) return false;
  fadeTeleport(player, { x: point.x + 0.5, y: point.y, z: point.z + 0.5 }, overworld());
  verifySpawnPoint(player, point, tries);
  return true;
}
