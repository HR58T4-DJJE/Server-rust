// Плагин «Природа»: мир плоский (без гор, оврагов и пещер), а этот плагин расставляет на нём
// леса, поляны с травой и цветами и редкие пруды.
// - Каждый чанк украшается один раз; отметка — барьер в слое бедрока (y = -64), без лишнего хранилища.
// - Сначала украшаются чанки вокруг игроков, а в фоне сервер постепенно проходит всю карту,
//   чтобы деревья не «вырастали» на глазах. Вся работа идёт через system.runJob — без фризов.
// Работает только в плоском мире RustCraft (поверхность из травы на высоте TERRAIN.groundY).
import { system, world } from "@minecraft/server";
import { SPAWN, TERRAIN } from "../config.js";

const MARK_Y = -64;
const MARK = "minecraft:barrier";
const GY = TERRAIN.groundY; // высота травы
const overworld = () => world.getDimension("minecraft:overworld");

// ---------------------------------------------------------------- детерминированный шум
function hash(x, z, salt) {
  let h = (x * 374761393 + z * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(x, z, scale, salt) {
  const gx = x / scale;
  const gz = z / scale;
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const fx = gx - x0;
  const fz = gz - z0;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash(x0, z0, salt);
  const b = hash(x0 + 1, z0, salt);
  const c = hash(x0, z0 + 1, salt);
  const d = hash(x0 + 1, z0 + 1, salt);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

// 0..1: насколько здесь лес; 0..1: насколько холодно (ели)
const forestness = (x, z) => 0.65 * smooth(x, z, 96, 11) + 0.35 * smooth(x, z, 32, 12);
const coldness = (x, z) => smooth(x, z, 160, 13);

// ---------------------------------------------------------------- постройка
function isAir(dim, p) {
  const b = dim.getBlock(p);
  return !!b && b.isAir;
}

function put(dim, p, id) {
  dim.setBlockType(p, id);
}

function putIfAir(dim, p, id) {
  const b = dim.getBlock(p);
  if (b && b.isAir) b.setType(id);
}

function* tree(dim, x, z, kind, h) {
  const log = `minecraft:${kind}_log`;
  const leaves = `minecraft:${kind}_leaves`;
  // ствол только туда, где пусто (игрок мог что-то поставить, или стоит залежь)
  for (let y = GY + 1; y <= GY + h + 1; y++) if (!isAir(dim, { x, y, z })) return;
  for (let y = GY + 1; y <= GY + h; y++) put(dim, { x, y, z }, log);
  yield;
  const top = GY + h;
  if (kind === "spruce") {
    let r = 1;
    for (let y = top - h + 3; y <= top; y++) {
      r = (top - y) % 2 === 0 ? 1 : 2;
      if (y >= top - 1) r = 1;
      for (let dx = -r; dx <= r; dx++)
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && r > 1) continue;
          if (dx || dz) putIfAir(dim, { x: x + dx, y, z: z + dz }, leaves);
        }
    }
    putIfAir(dim, { x, y: top + 1, z }, leaves);
    putIfAir(dim, { x, y: top + 2, z }, leaves);
  } else {
    for (let y = top - 2; y <= top + 1; y++) {
      const r = y <= top - 1 ? 2 : 1;
      for (let dx = -r; dx <= r; dx++)
        for (let dz = -r; dz <= r; dz++) {
          const corner = Math.abs(dx) === r && Math.abs(dz) === r;
          if (corner && (r === 1 || hash(x + dx, z + dz, y) < 0.6)) continue;
          if (y > top || dx || dz) putIfAir(dim, { x: x + dx, y, z: z + dz }, leaves);
        }
    }
  }
  yield;
}

function* pond(dim, cx, cz, rx, rz) {
  for (let dx = -rx; dx <= rx; dx++) {
    for (let dz = -rz; dz <= rz; dz++) {
      const d = (dx * dx) / (rx * rx) + (dz * dz) / (rz * rz);
      if (d > 1) continue;
      const x = cx + dx;
      const z = cz + dz;
      if (!isAir(dim, { x, y: GY + 1, z })) continue;
      put(dim, { x, y: GY, z }, "minecraft:water");
      if (d < 0.45) put(dim, { x, y: GY - 1, z }, "minecraft:water");
      else put(dim, { x, y: GY - 1, z }, "minecraft:dirt");
    }
    yield;
  }
  // песчаный берег
  for (let dx = -rx - 1; dx <= rx + 1; dx++)
    for (let dz = -rz - 1; dz <= rz + 1; dz++) {
      const d = (dx * dx) / ((rx + 1) * (rx + 1)) + (dz * dz) / ((rz + 1) * (rz + 1));
      if (d > 1) continue;
      const b = dim.getBlock({ x: cx + dx, y: GY, z: cz + dz });
      if (b?.typeId === "minecraft:grass_block" && hash(cx + dx, cz + dz, 7) < 0.7) b.setType("minecraft:sand");
    }
}

/** Украшает один чанк (генератор для runJob). Возвращает true, если чанк был украшен сейчас. */
export function* decorateChunk(dim, cx, cz) {
  const x0 = cx * 16;
  const z0 = cz * 16;
  const mark = dim.getBlock({ x: x0, y: MARK_Y, z: z0 });
  if (!mark || mark.typeId === MARK) return false;
  // Только плоский мир RustCraft: там на y=-63 камень, а в обычном мире — глубинный сланец/бедрок.
  // Обычный мир не трогаем вовсе (и не ставим отметку).
  if (!isFlat(dim, x0, z0)) return false;
  const f = forestness(x0 + 8, z0 + 8);
  // пруд — редко и только на полянах; целиком внутри чанка
  if (f < 0.45 && hash(cx, cz, 21) < TERRAIN.pondChance) {
    const rx = 2 + Math.floor(hash(cx, cz, 22) * 3);
    const rz = 2 + Math.floor(hash(cx, cz, 23) * 3);
    yield* pond(dim, x0 + 8, z0 + 8, rx, rz);
  }
  // деревья: сетка 4x4 со смещением, центры внутри чанка с отступом 2 (листва не вылезает)
  for (let gx = 0; gx < 4; gx++) {
    for (let gz = 0; gz < 4; gz++) {
      const x = x0 + 2 + gx * 3 + Math.floor(hash(cx * 4 + gx, cz * 4 + gz, 31) * 3);
      const z = z0 + 2 + gz * 3 + Math.floor(hash(cx * 4 + gx, cz * 4 + gz, 32) * 3);
      const fr = forestness(x, z);
      const p = fr > TERRAIN.forestThreshold ? TERRAIN.forestDensity : TERRAIN.meadowTreeChance;
      if (hash(x, z, 33) >= p) continue;
      const ground = dim.getBlock({ x, y: GY, z });
      if (ground?.typeId !== "minecraft:grass_block") continue;
      const cold = coldness(x, z) > TERRAIN.spruceThreshold;
      const kind = cold ? "spruce" : hash(x, z, 34) < 0.35 ? "birch" : "oak";
      const h = kind === "spruce" ? 6 + Math.floor(hash(x, z, 35) * 4) : 4 + Math.floor(hash(x, z, 35) * 3);
      yield* tree(dim, x, z, kind, h);
    }
  }
  // трава и цветы
  for (let dx = 0; dx < 16; dx++) {
    for (let dz = 0; dz < 16; dz++) {
      const x = x0 + dx;
      const z = z0 + dz;
      const r = hash(x, z, 41);
      const fr = forestness(x, z);
      const grassP = fr > TERRAIN.forestThreshold ? 0.12 : TERRAIN.grassChance;
      if (r >= grassP + TERRAIN.flowerChance) continue;
      const ground = dim.getBlock({ x, y: GY, z });
      if (ground?.typeId !== "minecraft:grass_block") continue;
      let id;
      if (r < grassP) id = hash(x, z, 42) < 0.15 ? "minecraft:fern" : "minecraft:short_grass";
      else id = TERRAIN.flowers[Math.floor(hash(x, z, 43) * TERRAIN.flowers.length)];
      putIfAir(dim, { x, y: GY + 1, z }, id);
    }
    if (dx % 4 === 3) yield;
  }
  mark.setType(MARK);
  return true;
}

/** Украшает квадрат чанков вокруг (cx, cz) — для поиска точек спавна. */
export function* decorateArea(dim, cx, cz, r) {
  for (let dx = -r; dx <= r; dx++)
    for (let dz = -r; dz <= r; dz++) {
      try {
        yield* decorateChunk(dim, cx + dx, cz + dz);
      } catch {} // соседний чанк ещё не готов
    }
}

let flatWorld = true;
export const isFlat = (dim, x, z) => dim.getBlock({ x, y: MARK_Y + 1, z })?.typeId === "minecraft:stone";

// ---------------------------------------------------------------- очередь вокруг игроков
const queue = [];
const queued = new Set();
const done = new Set(); // известные украшенные чанки (чтобы не проверять отметку снова)
let working = false;

function chunkKey(cx, cz) {
  return `${cx}|${cz}`;
}

function enqueueAround() {
  if (!flatWorld) return;
  const dim = overworld();
  for (const player of world.getPlayers()) {
    if (player.dimension.id !== "minecraft:overworld") continue;
    const pcx = Math.floor(player.location.x / 16);
    const pcz = Math.floor(player.location.z / 16);
    const r = TERRAIN.playerRadiusChunks;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = chunkKey(cx, cz);
        if (done.has(key) || queued.has(key)) continue;
        try {
          const mark = dim.getBlock({ x: cx * 16, y: MARK_Y, z: cz * 16 });
          if (!mark) continue;
          if (mark.typeId === MARK) {
            done.add(key);
            continue;
          }
        } catch {
          continue; // чанк не «тикает» — дойдём позже
        }
        queued.add(key);
        // ближние чанки — в начало очереди
        if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) queue.unshift([cx, cz]);
        else queue.push([cx, cz]);
      }
    }
  }
  if (!working && queue.length) {
    working = true;
    system.runJob(worker());
  }
}

function* worker() {
  const dim = overworld();
  try {
    while (queue.length) {
      const [cx, cz] = queue.shift();
      const key = chunkKey(cx, cz);
      queued.delete(key);
      try {
        yield* decorateChunk(dim, cx, cz);
        done.add(key);
      } catch {} // чанк выгрузился — вернётся в очередь, когда игрок подойдёт снова
      yield;
    }
  } finally {
    working = false;
  }
}

// ---------------------------------------------------------------- фоновый проход по карте
const PREGEN_KEY = "rust:terrain_pregen";
const AREA = "rc_terrain";
let batches = [];

function buildBatches() {
  // квадраты 4x4 чанка, от центра карты к краю
  const R = Math.ceil((SPAWN.radius + 64) / 64);
  const list = [];
  for (let bx = -R; bx < R; bx++) for (let bz = -R; bz < R; bz++) list.push([bx, bz]);
  list.sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1]));
  return list;
}

function cmd(command) {
  try {
    overworld().runCommand(command);
    return true;
  } catch {
    return false;
  }
}

function pregenStep() {
  let index = world.getDynamicProperty(PREGEN_KEY);
  index = typeof index === "number" ? index : 0;
  if (index >= batches.length) return; // вся карта готова
  const [bx, bz] = batches[index];
  const x1 = bx * 64;
  const z1 = bz * 64;
  cmd(`tickingarea remove ${AREA}`);
  if (!cmd(`tickingarea add ${x1} 0 ${z1} ${x1 + 63} 0 ${z1 + 63} ${AREA}`)) {
    system.runTimeout(pregenStep, 100);
    return;
  }
  const dim = overworld();
  let waited = 0;
  const handle = system.runInterval(() => {
    waited++;
    let ready = false;
    try {
      ready = dim.isChunkLoaded({ x: x1, y: 0, z: z1 }) && dim.isChunkLoaded({ x: x1 + 63, y: 0, z: z1 + 63 });
      if (ready) dim.getBlock({ x: x1 + 63, y: MARK_Y, z: z1 + 63 }); // «тикает» ли
    } catch {
      ready = false;
    }
    if (!ready && waited < 30) return;
    system.clearRun(handle);
    // мир не плоский (обычная генерация) — природа не нужна, фоновый проход выключаем навсегда
    if (ready && !isFlat(dim, x1, z1)) {
      cmd(`tickingarea remove ${AREA}`);
      world.setDynamicProperty(PREGEN_KEY, batches.length);
      flatWorld = false;
      console.warn("[RustCraft] Мир не плоский — плагин природы выключен");
      return;
    }
    system.runJob(
      (function* () {
        try {
          if (ready)
            for (let cx = bx * 4; cx < bx * 4 + 4; cx++)
              for (let cz = bz * 4; cz < bz * 4 + 4; cz++) {
                try {
                  yield* decorateChunk(dim, cx, cz);
                } catch {}
                yield;
              }
        } finally {
          cmd(`tickingarea remove ${AREA}`);
          world.setDynamicProperty(PREGEN_KEY, index + 1);
          const pct = Math.floor(((index + 1) / batches.length) * 100);
          if (pct !== Math.floor((index / batches.length) * 100) && pct % 10 === 0)
            console.warn(`[RustCraft] Природа на карте: ${pct}%`);
          system.runTimeout(pregenStep, TERRAIN.pregenPauseTicks);
        }
      })()
    );
  }, 10);
}

export function pregenProgress() {
  const index = world.getDynamicProperty(PREGEN_KEY);
  return batches.length ? Math.min(100, Math.floor(((typeof index === "number" ? index : 0) / batches.length) * 100)) : 0;
}

world.afterEvents.worldLoad.subscribe(() => {
  if (!TERRAIN.enabled) return;
  system.runInterval(enqueueAround, 10);
  if (TERRAIN.pregen) {
    batches = buildBatches();
    cmd(`tickingarea remove ${AREA}`);
    console.warn(`[RustCraft] Природа на карте: ${pregenProgress()}% (фоновая расстановка лесов)`);
    system.runTimeout(pregenStep, 200);
  }
});
