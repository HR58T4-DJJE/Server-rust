// Плагин «Шкаф с инструментами» (Tool Cupboard / TC)
// - Ставишь шкаф -> вокруг него зона, где строить/ломать/открывать двери и сундуки
//   могут только авторизованные игроки.
// - Любой, кто добрался до шкафа, может авторизоваться (так и работает рейд в Rust).
import { system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { ADMIN_TAG, TC } from "../config.js";
import { actionbar, posKey, parseKey, readJSON, showForm, useHandlers, writeJSON } from "../lib/util.js";

const PREFIX = "tc|";
const TC_ID = "rust:tool_cupboard";
// Блоки, которые можно ломать даже в чужой зоне (залежи и бочки появляются где угодно)
const ALWAYS_BREAKABLE = /^rust:(stone_node|metal_node|sulfur_node|loot_barrel|loot_crate)$/;
// Предметы, которые можно ставить в чужой зоне (взрывчатка для рейда)
const RAID_ITEMS = new Set(["rust:c4", "rust:satchel_charge"]);

/** @type {Map<string, {owner: string, auth: string[]}>} */
const cupboards = new Map();
// разобранные координаты шкафов, чтобы не парсить строку на каждой проверке
const coords = new Map();
// Пространственный индекс: участок 64x64 -> шкафы в нём. Проверка зоны смотрит только
// соседние участки, а не все шкафы мира (важно, когда баз много).
const REGION = 64;
/** @type {Map<string, Set<string>>} */
const regions = new Map();
const regionKey = (dim, rx, rz) => `${dim}|${rx}|${rz}`;

function addCupboard(key, data) {
  cupboards.set(key, data);
  const c = parseKey(key);
  coords.set(key, c);
  const rk = regionKey(c.dim, Math.floor(c.x / REGION), Math.floor(c.z / REGION));
  let set = regions.get(rk);
  if (!set) regions.set(rk, (set = new Set()));
  set.add(key);
}

world.afterEvents.worldLoad.subscribe(() => {
  for (const id of world.getDynamicPropertyIds()) {
    if (!id.startsWith(PREFIX)) continue;
    const data = readJSON(world, id);
    if (data) addCupboard(id.slice(PREFIX.length), data);
  }
  console.warn(`[RustCraft] Загружено шкафов: ${cupboards.size}`);
});

function save(key) {
  writeJSON(world, PREFIX + key, cupboards.get(key));
}

export function removeCupboard(key) {
  const c = coords.get(key);
  if (c) {
    const rk = regionKey(c.dim, Math.floor(c.x / REGION), Math.floor(c.z / REGION));
    const set = regions.get(rk);
    set?.delete(key);
    if (set && !set.size) regions.delete(rk);
  }
  cupboards.delete(key);
  coords.delete(key);
  world.setDynamicProperty(PREFIX + key, undefined);
}

export function allCupboards() {
  return cupboards;
}

/** Шкафы, в зону которых попадает точка */
export function cupboardsAt(dimId, pos) {
  const out = [];
  if (!cupboards.size) return out;
  const px = Math.floor(pos.x);
  const py = Math.floor(pos.y);
  const pz = Math.floor(pos.z);
  const rx0 = Math.floor((px - TC.radius) / REGION);
  const rx1 = Math.floor((px + TC.radius) / REGION);
  const rz0 = Math.floor((pz - TC.radius) / REGION);
  const rz1 = Math.floor((pz + TC.radius) / REGION);
  for (let rx = rx0; rx <= rx1; rx++) {
    for (let rz = rz0; rz <= rz1; rz++) {
      const set = regions.get(regionKey(dimId, rx, rz));
      if (!set) continue;
      for (const key of set) {
        const c = coords.get(key);
        if (Math.abs(c.x - px) > TC.radius || Math.abs(c.z - pz) > TC.radius || Math.abs(c.y - py) > TC.height)
          continue;
        out.push({ key, data: cupboards.get(key) });
      }
    }
  }
  return out;
}

export function isAdmin(player) {
  return player.hasTag(ADMIN_TAG);
}

/** Может ли игрок строить/ломать в этой точке */
export function canBuild(player, dimId, pos) {
  if (isAdmin(player)) return true;
  return cupboardsAt(dimId, pos).every(({ data }) => data.auth.includes(player.name));
}

/** "none" — вне зон, "allowed" — есть права, "blocked" — чужая зона */
export function zoneStatus(player) {
  const zones = cupboardsAt(player.dimension.id, player.location);
  if (!zones.length) return "none";
  if (isAdmin(player) || zones.every(({ data }) => data.auth.includes(player.name))) return "allowed";
  return "blocked";
}

function deny(player, text = "§cСтроительство запрещено: чужой шкаф рядом") {
  system.run(() => actionbar(player, text));
}

// Проверка соседнего блока, куда игрок пытается что-то поставить
function faceTarget(block, face) {
  const o = { Up: [0, 1, 0], Down: [0, -1, 0], North: [0, 0, -1], South: [0, 0, 1], West: [-1, 0, 0], East: [1, 0, 0] }[
    face
  ] ?? [0, 0, 0];
  return { x: block.location.x + o[0], y: block.location.y + o[1], z: block.location.z + o[2] };
}

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  const { player, block } = ev;
  if (ALWAYS_BREAKABLE.test(block.typeId)) return;
  if (!canBuild(player, block.dimension.id, block.location)) {
    ev.cancel = true;
    deny(player);
  }
});

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  const { player, block, itemStack } = ev;
  const dimId = block.dimension.id;
  if (itemStack && RAID_ITEMS.has(itemStack.typeId)) return;
  const target = faceTarget(block, ev.blockFace);
  if (block.typeId === TC_ID) {
    // открыть шкаф может любой, кто до него добрался; а вот поставить блок вплотную (присев) — только с правами
    if (!(player.isSneaking && itemStack) || canBuild(player, dimId, target)) return;
  } else if (canBuild(player, dimId, block.location) && canBuild(player, dimId, target)) {
    return;
  }
  ev.cancel = true;
  if (!ev.isFirstEvent) return;
  // блок не трогаем, но оружие/бинт/меню крафта в руке всё равно срабатывают
  const use = itemStack && useHandlers.get(itemStack.typeId);
  if (use) system.run(() => use(player));
  else deny(player, "§cЗакрыто: нет авторизации в шкафу");
});

// Регистрируем шкаф и его владельца после установки
world.afterEvents.playerPlaceBlock.subscribe(({ player, block }) => {
  if (block.typeId !== TC_ID) return;
  const key = posKey(block.dimension.id, block.location);
  addCupboard(key, { owner: player.name, auth: [player.name] });
  save(key);
  actionbar(player, "§aШкаф установлен. Вы авторизованы.");
  player.sendMessage(
    `§6[Шкаф]§r Зона защиты: ${TC.radius * 2 + 1}x${TC.radius * 2 + 1} блоков. Нажмите на шкаф, чтобы управлять доступом.`
  );
});

function openMenu(player, key) {
  const data = cupboards.get(key);
  if (!data) {
    // шкаф поставлен командой /setblock или данные потеряны — берём его себе
    addCupboard(key, { owner: player.name, auth: [player.name] });
    save(key);
    return openMenu(player, key);
  }
  const authed = data.auth.includes(player.name);
  const form = new ActionFormData()
    .title("Шкаф с инструментами")
    .body(
      `Владелец: §e${data.owner}§r\n` +
        `Авторизованы (${data.auth.length}/${TC.maxAuthorized}):\n§7${data.auth.join(", ") || "никого"}§r\n\n` +
        (authed ? "§aУ вас есть право строить здесь." : "§cУ вас нет права строить здесь.")
    );
  const actions = [];
  if (!authed) {
    form.button("Авторизоваться", "textures/ui/icon_unlocked");
    actions.push("auth");
  } else {
    form.button("Выписаться", "textures/ui/icon_lock");
    actions.push("deauth");
    form.button("Очистить список\n§7выписать всех, включая себя", "textures/ui/trash");
    actions.push("clear");
  }
  form.button("Закрыть");
  actions.push("close");

  showForm(player, form).then((res) => {
    if (!res || res.canceled) return;
    const cur = cupboards.get(key);
    if (!cur) return;
    switch (actions[res.selection]) {
      case "auth":
        if (cur.auth.length >= TC.maxAuthorized) return actionbar(player, "§cСписок шкафа заполнен");
        if (!cur.auth.includes(player.name)) cur.auth.push(player.name);
        actionbar(player, "§aВы авторизованы в шкафу");
        break;
      case "deauth":
        cur.auth = cur.auth.filter((n) => n !== player.name);
        actionbar(player, "§eВы выписались из шкафа");
        break;
      case "clear":
        cur.auth = [];
        actionbar(player, "§eСписок шкафа очищен");
        break;
      default:
        return;
    }
    save(key);
  });
}

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("rust:tool_cupboard", {
    beforeOnPlayerPlace(ev) {
      if (!ev.player) return;
      if (!canBuild(ev.player, ev.dimension.id, ev.block.location)) {
        ev.cancel = true;
        deny(ev.player, "§cНельзя ставить шкаф в чужой зоне");
      }
    },
    onPlayerInteract(ev) {
      if (!ev.player) return;
      openMenu(ev.player, posKey(ev.dimension.id, ev.block.location));
    },
    onBreak(ev) {
      removeCupboard(posKey(ev.dimension.id, ev.block.location));
    },
  });
});

// Подчищаем записи шкафов, которых уже нет в мире (сломаны командой и т.п.)
system.runInterval(() => {
  for (const key of [...cupboards.keys()]) {
    const c = parseKey(key);
    try {
      const dim = world.getDimension(c.dim);
      if (!dim.isChunkLoaded(c)) continue;
      const block = dim.getBlock(c);
      if (block && block.typeId !== TC_ID) removeCupboard(key);
    } catch {}
  }
}, 20 * 60);
