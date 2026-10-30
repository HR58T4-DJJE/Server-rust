// Плагин «Спавн»: случайное появление на карте, стартовый набор (камень + факел),
// спальные мешки с выбором точки возрождения после смерти.
import { system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { SPAWN } from "../config.js";
import { actionbar, countItem, giveItem, parseKey, posKey, readJSON, showForm, writeJSON } from "../lib/util.js";
import { fadeTeleport, pickSpawnPoint, teleportToSpawnPoint, verifySpawnPoint } from "./spawnPoints.js";

const BAG_PREFIX = "bag|";
const BAG_ID = "rust:sleeping_bag";

// Докладывает набор до нужного количества (книги и камни не копятся при каждой смерти)
function giveKit(player, kit) {
  for (const [id, n] of kit) {
    const missing = n - countItem(player, id);
    if (missing > 0) giveItem(player, id, missing);
  }
}

// ---------------------------------------------------------------- случайный спавн
const AUTO_KEY = "rust:auto_spawn"; // точка возрождения, которую назначил сервер (а не кровать)

const near = (a, b, r) => Math.abs(a.x - b.x) <= r && Math.abs(a.z - b.z) <= r && Math.abs(a.y - b.y) <= r + 1;

function randomSpawn(player) {
  if (SPAWN.randomSpawn) teleportToSpawnPoint(player);
}

/**
 * В момент смерти назначаем игроку случайную проверенную точку как точку возрождения.
 * Тогда игра сама подгружает это место на экране «Вы погибли», и игрок появляется сразу на земле,
 * без телепорта после возрождения. Если игрок спал в кровати — кровать главнее.
 */
function armRespawn(player) {
  if (!SPAWN.randomSpawn) return;
  const auto = readJSON(player, AUTO_KEY);
  const current = player.getSpawnPoint();
  const isOurs = auto && current && current.dimension.id === "minecraft:overworld" && near(current, auto, 1);
  if (current && !isOurs) return; // своя кровать
  const point = pickSpawnPoint();
  if (!point) {
    if (isOurs) player.setSpawnPoint(); // старая точка могла испортиться — вернём обычный спавн мира
    writeJSON(player, AUTO_KEY, undefined);
    return;
  }
  player.setSpawnPoint({ dimension: world.getDimension("minecraft:overworld"), x: point.x, y: point.y, z: point.z });
  writeJSON(player, AUTO_KEY, point);
}

world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
  if (deadEntity.typeId !== "minecraft:player") return;
  try {
    armRespawn(deadEntity);
  } catch {}
});

// ---------------------------------------------------------------- спальники
// Спальники держим в памяти (key -> {owner, last}), чтобы не перебирать всё хранилище мира
/** @type {Map<string, {owner: string, last: number}>} */
const bags = new Map();

world.afterEvents.worldLoad.subscribe(() => {
  for (const id of world.getDynamicPropertyIds()) {
    if (!id.startsWith(BAG_PREFIX)) continue;
    const data = readJSON(world, id);
    if (data) bags.set(id.slice(BAG_PREFIX.length), data);
  }
});

function saveBag(key, data) {
  bags.set(key, data);
  writeJSON(world, BAG_PREFIX + key, data);
}

function removeBag(key) {
  bags.delete(key);
  world.setDynamicProperty(BAG_PREFIX + key, undefined);
}

export function clearBags() {
  for (const key of [...bags.keys()]) removeBag(key);
}

function bagsOf(player) {
  const out = [];
  for (const [key, data] of bags) if (data.owner === player.name) out.push({ key, data });
  return out;
}

world.afterEvents.playerPlaceBlock.subscribe(({ player, block }) => {
  if (block.typeId !== BAG_ID) return;
  if (bagsOf(player).length >= SPAWN.maxBags) {
    block.setType("minecraft:air");
    giveItem(player, BAG_ID, 1);
    return actionbar(player, `§cМаксимум спальников: ${SPAWN.maxBags}`);
  }
  const key = posKey(block.dimension.id, block.location);
  saveBag(key, { owner: player.name, last: 0 });
  actionbar(player, "§aСпальник установлен — после смерти можно будет возродиться здесь");
});

function bagCooldownLeft(data) {
  return Math.max(0, Math.ceil((data.last + SPAWN.bagCooldownSec * 1000 - Date.now()) / 1000));
}

// atRandomPoint — игрок уже возродился на случайной точке, «случайное место» = остаться
function respawnMenu(player, atRandomPoint) {
  const mine = bagsOf(player);
  const stayOrRandom = () => (atRandomPoint ? undefined : randomSpawn(player));
  if (!mine.length) return stayOrRandom();
  const form = new ActionFormData().title("Возрождение").body("Где возродиться?");
  form.button("Случайное место", "textures/ui/World");
  for (const { key, data } of mine) {
    const p = parseKey(key);
    const cd = bagCooldownLeft(data);
    form.button(`Спальник ${p.x}, ${p.y}, ${p.z}\n${cd ? `§cперезарядка ${cd} с` : "§2готов"}`, "textures/blocks/rust_sleeping_bag");
  }
  showForm(player, form).then((res) => {
    if (!res || res.canceled || res.selection === 0) return stayOrRandom();
    const { key, data } = mine[res.selection - 1];
    const cd = bagCooldownLeft(data);
    if (cd) {
      actionbar(player, `§cСпальник перезаряжается: ${cd} с`);
      return respawnMenu(player, atRandomPoint);
    }
    const p = parseKey(key);
    fadeTeleport(player, { x: p.x + 0.5, y: p.y + 0.3, z: p.z + 0.5 }, world.getDimension(p.dim));
    // проверяем, что спальник ещё на месте (чанк загрузится после телепорта)
    system.runTimeout(() => {
      if (!player.isValid) return;
      let block;
      try {
        block = player.dimension.getBlock(p);
      } catch {} // чанк ещё грузится — спальник проверим в следующий раз
      if (block && block.typeId !== BAG_ID) {
        removeBag(key);
        actionbar(player, "§cСпальник уничтожен");
        randomSpawn(player);
        return;
      }
      if (bags.has(key)) saveBag(key, { ...data, last: Date.now() });
    }, 30);
  });
}

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (initialSpawn) {
    if (player.getDynamicProperty("rust:joined")) return;
    player.setDynamicProperty("rust:joined", true);
    giveKit(player, SPAWN.respawnKit);
    giveKit(player, SPAWN.firstJoinKit);
    player.sendMessage(
      "§6Добро пожаловать на RustCraft!§r\n" +
        "§7- Бейте залежи камня/металла/серы, рубите деревья\n" +
        "- Крафт: «Меню крафта» в инвентаре или /rust:craft\n" +
        "- Поставьте шкаф, чтобы защитить базу от строительства чужаками\n" +
        "- Помощь: /rust:info"
    );
    randomSpawn(player);
    return;
  }
  giveKit(player, SPAWN.respawnKit);
  const auto = readJSON(player, AUTO_KEY);
  const atRandomPoint = !!auto && player.dimension.id === "minecraft:overworld" && near(player.location, auto, 3);
  if (atRandomPoint) verifySpawnPoint(player, auto);
  if (bagsOf(player).length) return respawnMenu(player, atRandomPoint);
  if (atRandomPoint) return;
  // возродился у своей кровати — оставляем; иначе (кровать сломана, запас точек был пуст) — случайная точка
  const bed = player.getSpawnPoint();
  if (bed && bed.dimension.id === player.dimension.id && near(player.location, bed, 3)) return;
  randomSpawn(player);
});

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("rust:sleeping_bag", {
    onPlayerInteract(ev) {
      const data = bags.get(posKey(ev.dimension.id, ev.block.location));
      if (!ev.player) return;
      if (!data) return actionbar(ev.player, "§7Ничей спальник");
      const cd = bagCooldownLeft(data);
      actionbar(ev.player, `§7Спальник игрока §f${data.owner}§7${cd ? `, перезарядка ${cd} с` : ""}`);
    },
    onBreak(ev) {
      removeBag(posKey(ev.dimension.id, ev.block.location));
    },
  });
});
