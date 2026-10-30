// Плагин «Спавн»: случайное появление на карте, стартовый набор (камень + факел),
// спальные мешки с выбором точки возрождения после смерти.
import { system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { SPAWN } from "../config.js";
import { actionbar, countItem, dist2, giveItem, parseKey, posKey, readJSON, showForm, writeJSON } from "../lib/util.js";
import { teleportToSpawnPoint } from "./spawnPoints.js";

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
function randomSpawn(player) {
  if (SPAWN.randomSpawn) teleportToSpawnPoint(player);
}

// ---------------------------------------------------------------- спальники
function bagsOf(player) {
  const out = [];
  for (const id of world.getDynamicPropertyIds()) {
    if (!id.startsWith(BAG_PREFIX)) continue;
    const data = readJSON(world, id);
    if (data?.owner === player.name) out.push({ key: id.slice(BAG_PREFIX.length), data });
  }
  return out;
}

world.afterEvents.playerPlaceBlock.subscribe(({ player, block }) => {
  if (block.typeId !== BAG_ID) return;
  const bags = bagsOf(player);
  if (bags.length >= SPAWN.maxBags) {
    block.setType("minecraft:air");
    giveItem(player, BAG_ID, 1);
    return actionbar(player, `§cМаксимум спальников: ${SPAWN.maxBags}`);
  }
  const key = posKey(block.dimension.id, block.location);
  writeJSON(world, BAG_PREFIX + key, { owner: player.name, last: 0 });
  actionbar(player, "§aСпальник установлен — после смерти можно будет возродиться здесь");
});

function bagCooldownLeft(data) {
  return Math.max(0, Math.ceil((data.last + SPAWN.bagCooldownSec * 1000 - Date.now()) / 1000));
}

function respawnMenu(player) {
  const bags = bagsOf(player);
  if (!bags.length) return randomSpawn(player);
  const form = new ActionFormData().title("Возрождение").body("Где возродиться?");
  form.button("Случайное место", "textures/ui/World");
  for (const { key, data } of bags) {
    const p = parseKey(key);
    const cd = bagCooldownLeft(data);
    form.button(`Спальник ${p.x}, ${p.y}, ${p.z}\n${cd ? `§cперезарядка ${cd} с` : "§2готов"}`, "textures/blocks/rust_sleeping_bag");
  }
  showForm(player, form).then((res) => {
    if (!res || res.canceled || res.selection === 0) return randomSpawn(player);
    const { key, data } = bags[res.selection - 1];
    const cd = bagCooldownLeft(data);
    if (cd) {
      actionbar(player, `§cСпальник перезаряжается: ${cd} с`);
      return respawnMenu(player);
    }
    const p = parseKey(key);
    player.teleport({ x: p.x + 0.5, y: p.y + 0.3, z: p.z + 0.5 }, { dimension: world.getDimension(p.dim) });
    // проверяем, что спальник ещё на месте (чанк загрузится после телепорта)
    system.runTimeout(() => {
      if (!player.isValid) return;
      let block;
      try {
        block = player.dimension.getBlock(p);
      } catch {} // чанк ещё грузится — спальник проверим в следующий раз
      if (block && block.typeId !== BAG_ID) {
        world.setDynamicProperty(BAG_PREFIX + key, undefined);
        actionbar(player, "§cСпальник уничтожен");
        randomSpawn(player);
        return;
      }
      writeJSON(world, BAG_PREFIX + key, { ...data, last: Date.now() });
    }, 10);
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
  // кровать (ванильная точка возрождения) имеет приоритет над случайным спавном,
  // но только если игрок действительно появился у неё (кровать могли сломать)
  const bed = player.getSpawnPoint();
  if (bed && bed.dimension.id === player.dimension.id && dist2(bed, player.location) < 16) return;
  respawnMenu(player);
});

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("rust:sleeping_bag", {
    onPlayerInteract(ev) {
      const data = readJSON(world, BAG_PREFIX + posKey(ev.dimension.id, ev.block.location));
      if (!ev.player) return;
      if (!data) return actionbar(ev.player, "§7Ничей спальник");
      const cd = bagCooldownLeft(data);
      actionbar(ev.player, `§7Спальник игрока §f${data.owner}§7${cd ? `, перезарядка ${cd} с` : ""}`);
    },
    onBreak(ev) {
      world.setDynamicProperty(BAG_PREFIX + posKey(ev.dimension.id, ev.block.location), undefined);
    },
  });
});
