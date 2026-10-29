// Плагин «Переработчик»: держите компонент в руке и нажмите на переработчик.
// Ставится администратором на «монументах»: /give @s rust:recycler
import { system } from "@minecraft/server";
import { RECYCLE } from "../config.js";
import { actionbar, giveItem, inventory, nameOf } from "../lib/util.js";

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("rust:recycler", {
    onPlayerInteract(ev) {
      const player = ev.player;
      if (!player) return;
      const inv = inventory(player);
      const slot = player.selectedSlotIndex;
      const item = inv?.getItem(slot);
      const out = item && RECYCLE[item.typeId];
      if (!out) {
        const list = Object.keys(RECYCLE).map(nameOf).join(", ");
        return player.sendMessage(`§6[Переработчик]§r Возьмите в руку: §7${list}`);
      }
      const n = item.amount;
      inv.setItem(slot);
      for (const [id, k] of Object.entries(out)) giveItem(player, id, k * n);
      ev.dimension.playSound("block.grindstone.use", ev.block.location);
      actionbar(player, `§aПереработано: ${nameOf(item.typeId)} x${n}`);
    },
  });
});
