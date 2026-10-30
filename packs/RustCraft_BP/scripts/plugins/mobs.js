// Плагин «Мобы»: в воде остаются только рыбы (треска, лосось, иглобрюх, тропические рыбы).
// Естественный спавн запрещённых мобов выключен правилами в spawn_rules/, а этот скрипт
// удаляет тех, кто всё же появился: стражей у подводных храмов, утопленников из руин
// и из зомби, утонувших в воде, а также мобов, сохранённых в старых чанках.
import { world } from "@minecraft/server";
import { BANNED_MOBS } from "../config.js";

const BANNED = new Set(BANNED_MOBS);

world.afterEvents.entitySpawn.subscribe(({ entity }) => {
  try {
    if (BANNED.has(entity.typeId)) entity.remove();
  } catch {}
});
