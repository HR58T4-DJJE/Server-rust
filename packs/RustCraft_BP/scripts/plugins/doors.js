// Плагин «Двери»: железная дверь и железный люк открываются и закрываются нажатием руки,
// как дверь с кодовым замком в Rust. Редстоуна на сервере нет, поэтому кнопки не нужны.
// Кто может открыть, решает шкаф: в чужой зоне открывают только авторизованные.
import { system, world } from "@minecraft/server";
import { canBuild } from "./toolCupboard.js";

const IRON_DOOR = "minecraft:iron_door";
const IRON_TRAPDOOR = "minecraft:iron_trapdoor";

export function toggleDoor(block) {
  // состояние «открыто» меняем у обеих половин, чтобы дверь не рассинхронизировалась
  const lower = block.permutation.getState("upper_block_bit") === true ? block.below() : block;
  const upper = lower?.above();
  if (!lower || lower.typeId !== IRON_DOOR) return;
  const open = !lower.permutation.getState("open_bit");
  lower.setPermutation(lower.permutation.withState("open_bit", open));
  if (upper?.typeId === IRON_DOOR) upper.setPermutation(upper.permutation.withState("open_bit", open));
  lower.dimension.playSound(open ? "random.door_open" : "random.door_close", lower.location);
}

export function toggleTrapdoor(block) {
  const open = !block.permutation.getState("open_bit");
  block.setPermutation(block.permutation.withState("open_bit", open));
  block.dimension.playSound(open ? "random.door_open" : "random.door_close", block.location);
}

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  if (ev.cancel || !ev.isFirstEvent) return;
  const { block, player } = ev;
  const type = block.typeId;
  if (type !== IRON_DOOR && type !== IRON_TRAPDOOR) return;
  // присев с блоком в руке — значит игрок строит рядом, а не открывает дверь
  if (player.isSneaking && ev.itemStack) return;
  ev.cancel = true;
  if (!canBuild(player, block.dimension.id, block.location)) return; // закрыто: нет авторизации
  system.run(() => {
    try {
      if (!block.isValid) return;
      if (block.typeId === IRON_DOOR) toggleDoor(block);
      else if (block.typeId === IRON_TRAPDOOR) toggleTrapdoor(block);
    } catch {}
  });
});
