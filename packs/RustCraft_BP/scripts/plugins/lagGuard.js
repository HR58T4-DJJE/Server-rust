// Плагин «Защита от лагов»:
// - раз в минуту ищет скопления выпавших предметов, опыта и животных-ферм в одном чанке
//   и удаляет лишнее (животные с именем или приручённые не трогаются);
// - считает TPS сервера и пишет в консоль, если сервер не успевает (с подсказкой, где нагрузка).
// Вся работа идёт через system.runJob — понемногу за тик, без фризов.
import { system, world } from "@minecraft/server";
import { LAG } from "../config.js";

const DIMS = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const ANIMALS = new Set(LAG.animals);

// ---------------------------------------------------------------- TPS
const samples = [];
let lastTime = Date.now();
let lastWarn = 0;

system.runInterval(() => {
  const now = Date.now();
  const tps = Math.min(20, 20000 / Math.max(1, now - lastTime));
  lastTime = now;
  samples.push(tps);
  if (samples.length > 60) samples.shift();
  const recent = samples.slice(-10);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  if (recent.length === 10 && avg < LAG.tpsWarn && now - lastWarn > 5 * 60 * 1000) {
    lastWarn = now;
    console.warn(`[RustCraft] Сервер не успевает: TPS ${avg.toFixed(1)}. ${entitySummary()}`);
  }
}, 20);

/** Средний TPS за последние seconds секунд */
export function getTps(seconds = 60) {
  const s = samples.slice(-seconds);
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 20;
}

/** Сколько сущностей загружено и каких больше всего */
export function entitySummary() {
  const byType = new Map();
  let total = 0;
  for (const dimId of DIMS) {
    try {
      for (const e of world.getDimension(dimId).getEntities()) {
        total++;
        byType.set(e.typeId, (byType.get(e.typeId) ?? 0) + 1);
      }
    } catch {}
  }
  const top = [...byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, n]) => `${id.replace("minecraft:", "")} ${n}`)
    .join(", ");
  return `Сущностей: ${total}${top ? ` (больше всего: ${top})` : ""}`;
}

// ---------------------------------------------------------------- чистка скоплений
function isProtected(e) {
  if (e.nameTag) return true;
  try {
    return e.getComponent("minecraft:tameable")?.isTamed === true;
  } catch {
    return false;
  }
}

function* sweep() {
  const removed = { items: 0, xp: 0, animals: 0 };
  for (const dimId of DIMS) {
    let entities;
    try {
      entities = world.getDimension(dimId).getEntities();
    } catch {
      continue;
    }
    yield;
    const counts = new Map();
    let i = 0;
    for (const e of entities) {
      if (++i % 50 === 0) yield;
      try {
        if (!e.isValid) continue;
        const id = e.typeId;
        let kind;
        let limit;
        if (id === "minecraft:item") {
          kind = "items";
          limit = LAG.maxItemsPerChunk;
        } else if (id === "minecraft:xp_orb") {
          kind = "xp";
          limit = LAG.maxXpPerChunk;
        } else if (ANIMALS.has(id)) {
          if (isProtected(e)) continue;
          kind = "animals";
          limit = LAG.maxAnimalsPerChunk;
        } else continue;
        const { x, z } = e.location;
        const key = `${kind}|${Math.floor(x) >> 4}|${Math.floor(z) >> 4}`;
        const n = (counts.get(key) ?? 0) + 1;
        counts.set(key, n);
        if (n > limit) {
          e.remove();
          removed[kind]++;
        }
      } catch {} // сущность исчезла, пока шла проверка
    }
  }
  if (removed.items || removed.xp || removed.animals)
    console.warn(
      `[RustCraft] Защита от лагов: удалено предметов ${removed.items}, опыта ${removed.xp}, животных ${removed.animals}`
    );
}

let sweeping = false;
system.runInterval(() => {
  if (sweeping) return;
  sweeping = true;
  system.runJob(
    (function* () {
      try {
        yield* sweep();
      } finally {
        sweeping = false;
      }
    })()
  );
}, LAG.sweepIntervalTicks);
