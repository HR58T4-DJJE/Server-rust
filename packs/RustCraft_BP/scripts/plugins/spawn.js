// Плагин «Спавн»: случайное появление на карте, стартовый набор (камень + факел),
// спальные мешки с выбором точки возрождения после смерти.
import { system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { SPAWN } from "../config.js";
import { actionbar, giveItem, parseKey, posKey, readJSON, showForm, writeJSON } from "../lib/util.js";

const BAG_PREFIX = "bag|";
const BAG_ID = "rust:sleeping_bag";
const BAD_SURFACE = /water|lava|ice|leaves|cactus|magma/;

function giveKit(player, kit) {
  for (const [id, n] of kit) giveItem(player, id, n);
}

// ---------------------------------------------------------------- случайный спавн
export function randomTeleport(player, attempt = 0) {
  const overworld = world.getDimension("minecraft:overworld");
  const x = Math.floor((Math.random() * 2 - 1) * SPAWN.radius);
  const z = Math.floor((Math.random() * 2 - 1) * SPAWN.radius);
  player.teleport({ x: x + 0.5, y: 250, z: z + 0.5 }, { dimension: overworld });
  player.addEffect("slow_falling", 20 * 30, { showParticles: false });
  player.addEffect("resistance", 20 * 30, { amplifier: 4, showParticles: false });
  waitForGround(player, x, z, attempt, 0);
}

function waitForGround(player, x, z, attempt, wait) {
  system.runTimeout(() => {
    if (!player.isValid) return;
    let top;
    try {
      top = player.dimension.getTopmostBlock({ x, z });
    } catch {}
    if (!top) {
      if (wait < 10) return waitForGround(player, x, z, attempt, wait + 1); // чанк ещё грузится
    } else if (!BAD_SURFACE.test(top.typeId) || attempt >= 6) {
      player.teleport({ x: x + 0.5, y: top.y + 1, z: z + 0.5 });
      player.removeEffect("slow_falling");
      player.removeEffect("resistance");
      return;
    }
    randomTeleport(player, attempt + 1); // вода/лава — пробуем другое место
  }, 20);
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
  if (!bags.length) return SPAWN.randomSpawn && randomTeleport(player);
  const form = new ActionFormData().title("Возрождение").body("Где возродиться?");
  form.button("Случайное место", "textures/ui/World");
  for (const { key, data } of bags) {
    const p = parseKey(key);
    const cd = bagCooldownLeft(data);
    form.button(`Спальник ${p.x}, ${p.y}, ${p.z}\n${cd ? `§cперезарядка ${cd} с` : "§2готов"}`, "textures/blocks/rust_sleeping_bag");
  }
  showForm(player, form).then((res) => {
    if (!res || res.canceled || res.selection === 0) return SPAWN.randomSpawn && randomTeleport(player);
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
      const block = player.dimension.getBlock(p);
      if (block && block.typeId !== BAG_ID) {
        world.setDynamicProperty(BAG_PREFIX + key, undefined);
        actionbar(player, "§cСпальник уничтожен");
        if (SPAWN.randomSpawn) randomTeleport(player);
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
    if (SPAWN.randomSpawn) randomTeleport(player);
    return;
  }
  giveKit(player, SPAWN.respawnKit);
  // кровать (ванильная точка возрождения) имеет приоритет над случайным спавном
  if (player.getSpawnPoint()) return;
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
