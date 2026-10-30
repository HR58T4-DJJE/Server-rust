import { ItemStack, system, world } from "@minecraft/server";
import { FormCancelationReason } from "@minecraft/server-ui";

// Русские названия для меню и сообщений
export const NAMES = {
  "rust:wood": "Дерево",
  "rust:stones": "Камни",
  "rust:metal_ore": "Металл. руда",
  "rust:metal_fragments": "Фрагменты металла",
  "rust:sulfur_ore": "Серная руда",
  "rust:sulfur": "Сера",
  "rust:hqm_ore": "Руда МВК",
  "rust:hqm": "МВК",
  "rust:cloth": "Ткань",
  "rust:scrap": "Скрап",
  "rust:metal_pipe": "Труба",
  "rust:gears": "Шестерёнки",
  "rust:metal_spring": "Пружина",
  "rust:explosives": "Взрывчатка",
  "minecraft:gunpowder": "Порох",
  "minecraft:charcoal": "Древесный уголь",
  "minecraft:string": "Нить",
};

export const nameOf = (id) => NAMES[id] ?? id.replace(/^.*:/, "");

export const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

export const posKey = (dimId, p) => `${dimId}|${Math.floor(p.x)}|${Math.floor(p.y)}|${Math.floor(p.z)}`;

export function parseKey(key) {
  const [dim, x, y, z] = key.split("|");
  return { dim, x: +x, y: +y, z: +z };
}

export function inventory(player) {
  return player.getComponent("minecraft:inventory")?.container;
}

export function countItem(player, id) {
  const inv = inventory(player);
  if (!inv) return 0;
  let n = 0;
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (it?.typeId === id) n += it.amount;
  }
  return n;
}

export function hasCost(player, cost) {
  return Object.entries(cost).every(([id, n]) => countItem(player, id) >= n);
}

// Списывает ресурсы, только если хватает всего сразу
export function takeCost(player, cost) {
  if (!hasCost(player, cost)) return false;
  const inv = inventory(player);
  for (const [id, need] of Object.entries(cost)) {
    let left = need;
    for (let i = 0; i < inv.size && left > 0; i++) {
      const it = inv.getItem(i);
      if (it?.typeId !== id) continue;
      if (it.amount > left) {
        it.amount -= left;
        inv.setItem(i, it);
        left = 0;
      } else {
        left -= it.amount;
        inv.setItem(i);
      }
    }
  }
  return true;
}

// Выдаёт предметы; если инвентарь полон — бросает под ноги
export function giveItem(player, id, amount) {
  const inv = inventory(player);
  let left = amount;
  while (left > 0) {
    const stack = new ItemStack(id, 1);
    const size = Math.min(left, stack.maxAmount);
    stack.amount = size;
    left -= size;
    const rest = inv?.addItem(stack);
    if (rest) player.dimension.spawnItem(rest, player.location);
  }
}

export function costText(cost, player) {
  return Object.entries(cost)
    .map(([id, n]) => {
      const ok = !player || countItem(player, id) >= n;
      return `${ok ? "§7" : "§c"}${nameOf(id)} ${n}`;
    })
    .join("§7, ");
}

// Уменьшает предмет в руке на n
export function consumeHeld(player, n = 1) {
  const inv = inventory(player);
  const slot = player.selectedSlotIndex;
  const it = inv?.getItem(slot);
  if (!it) return;
  if (it.amount > n) {
    it.amount -= n;
    inv.setItem(slot, it);
  } else inv.setItem(slot);
}

// Защита от двойного срабатывания: true, если с прошлого раза прошло не меньше ticks
const onceMap = new Map();
export function once(player, key, ticks) {
  const now = system.currentTick;
  const id = `${player.id}|${key}`;
  if (now < (onceMap.get(id) ?? 0)) return false;
  onceMap.set(id, now + ticks);
  return true;
}

// Предметы, которые «используются» (оружие, бинт, меню крафта). Если игрок нажал ими по блоку
// в чужой зоне шкафа, сам блок не трогаем, но предмет срабатывает: стрелять и лечиться можно везде.
/** @type {Map<string, (player: import("@minecraft/server").Player) => void>} */
export const useHandlers = new Map();

// Когда игроку последний раз показали важное сообщение (HUD шкафа его не перебивает)
export const lastMessageTick = new Map();

// Вышедший игрок больше не держит записи в памяти (сервер может работать неделями)
world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  lastMessageTick.delete(playerId);
  for (const key of onceMap.keys()) if (key.startsWith(`${playerId}|`)) onceMap.delete(key);
});

export function actionbar(player, text) {
  lastMessageTick.set(player.id, system.currentTick);
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {}
}

// Показ формы с повтором, если у игрока открыт чат/другое окно
export async function showForm(player, form, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const res = await form.show(player);
    if (res.cancelationReason !== FormCancelationReason.UserBusy) return res;
    await new Promise((r) => system.runTimeout(() => r(undefined), 5));
  }
  return undefined;
}

export function readJSON(holder, key, fallback) {
  const raw = holder.getDynamicProperty(key);
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(holder, key, value) {
  holder.setDynamicProperty(key, value === undefined ? undefined : JSON.stringify(value));
}

export const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;

export function dropLoot(dimension, location, table) {
  for (const [id, min, max, chance] of table) {
    if (Math.random() > chance) continue;
    dimension.spawnItem(new ItemStack(id, randInt(min, max)), location);
  }
}
