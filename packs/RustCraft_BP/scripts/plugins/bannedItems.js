// Плагин «Запрещённые блоки»: блоки и предметы из BANNED_ITEMS нельзя ставить и использовать,
// а из инвентаря они исчезают. Уже стоящие в мире (например, обсидиан порталов) нельзя открыть
// или использовать; выкопанный блок пропадёт из инвентаря.
import { EquipmentSlot, system, world } from "@minecraft/server";
import { BANNED_ITEMS, BANNED_ITEM_PATTERNS } from "../config.js";
import { actionbar, inventory } from "../lib/util.js";

const BANNED = new Set(BANNED_ITEMS);
export const isBanned = (id) => BANNED.has(id) || BANNED_ITEM_PATTERNS.some((re) => re.test(id));

function warn(player) {
  system.run(() => actionbar(player, "§cЭтот блок/предмет отключён на сервере"));
}

// Нельзя ставить запрещённый блок и пользоваться запрещёнными блоками в мире (эндер-сундук, наковальня…)
world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  if ((ev.itemStack && isBanned(ev.itemStack.typeId)) || isBanned(ev.block.typeId)) {
    ev.cancel = true;
    if (ev.isFirstEvent) warn(ev.player);
  }
});

world.beforeEvents.itemUse.subscribe((ev) => {
  if (isBanned(ev.itemStack.typeId)) {
    ev.cancel = true;
    warn(ev.source);
  }
});

// Чистка инвентарей: раз в 2 секунды, 36 слотов + вторая рука — нагрузка ничтожная
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    try {
      cleanInventory(player);
    } catch {} // игрок вышел в этот же тик
  }
}, 40);

function cleanInventory(player) {
  const inv = inventory(player);
  if (!inv) return;
  let removed = false;
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (it && isBanned(it.typeId)) {
      inv.setItem(i);
      removed = true;
    }
  }
  const equip = player.getComponent("minecraft:equippable");
  const off = equip?.getEquipment(EquipmentSlot.Offhand);
  if (off && isBanned(off.typeId)) {
    equip.setEquipment(EquipmentSlot.Offhand);
    removed = true;
  }
  if (removed) actionbar(player, "§cЗапрещённый предмет удалён из инвентаря");
}
