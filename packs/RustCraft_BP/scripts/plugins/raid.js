// Плагин «Рейды»: прочность (HP) построек и дверей, C4 и сумки с зарядом.
// Ванильные взрывы (TNT, криперы) постройки RustCraft не ломают — только наша взрывчатка.
import { system, world, ItemStack } from "@minecraft/server";
import { BLOCK_HP, EXPLOSIVES, WOOD_DOOR_HP } from "../config.js";
import { posKey } from "../lib/util.js";
import { removeCupboard } from "./toolCupboard.js";

const HP_PREFIX = "hp|";

export function maxHp(typeId) {
  if (BLOCK_HP[typeId]) return BLOCK_HP[typeId];
  if (/^minecraft:.*(door|trapdoor)$/.test(typeId)) return WOOD_DOOR_HP;
  return 0;
}

const isDoor = (typeId) => /^minecraft:.*door$/.test(typeId) && !typeId.endsWith("trapdoor");

// У двери HP хранится на нижней половине
export function hpAnchor(block) {
  if (isDoor(block.typeId) && block.permutation.getState("upper_block_bit") === true) return block.below() ?? block;
  return block;
}

export function getHp(block) {
  const max = maxHp(block.typeId);
  const v = world.getDynamicProperty(HP_PREFIX + posKey(block.dimension.id, block.location));
  return typeof v === "number" ? Math.min(v, max) : max;
}

export function setHp(block, hp) {
  const key = HP_PREFIX + posKey(block.dimension.id, block.location);
  world.setDynamicProperty(key, hp >= maxHp(block.typeId) ? undefined : hp);
}

export function clearHp(dimension, location) {
  world.setDynamicProperty(HP_PREFIX + posKey(dimension.id, location), undefined);
}

/** Наносит урон блоку. Возвращает оставшееся HP (0 — разрушен) */
export function damageBlock(block, amount) {
  block = hpAnchor(block);
  const max = maxHp(block.typeId);
  if (!max) return -1;
  const hp = getHp(block) - amount;
  if (hp > 0) {
    setHp(block, hp);
    return hp;
  }
  clearHp(block.dimension, block.location);
  if (block.typeId === "rust:tool_cupboard") removeCupboard(posKey(block.dimension.id, block.location));
  if (isDoor(block.typeId)) block.above()?.setType("minecraft:air");
  block.setType("minecraft:air");
  return 0;
}

export function detonate(dimension, location, type) {
  const cfg = EXPLOSIVES[type];
  const center = { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 };
  if (Math.random() < cfg.dudChance) {
    // осечка: заряд выпадает обратно, его можно поставить снова
    dimension.playSound("random.fizz", center);
    dimension.spawnItem(new ItemStack("rust:satchel_charge", 1), center);
    return;
  }
  const r = Math.ceil(cfg.radius);
  const done = new Set();
  for (let dx = -r; dx <= r; dx++)
    for (let dy = -r; dy <= r; dy++)
      for (let dz = -r; dz <= r; dz++) {
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > cfg.radius) continue;
        let block;
        try {
          block = dimension.getBlock({ x: location.x + dx, y: location.y + dy, z: location.z + dz });
        } catch {
          continue;
        }
        if (!block || !maxHp(block.typeId)) continue;
        const anchor = hpAnchor(block);
        const key = posKey(dimension.id, anchor.location);
        if (done.has(key)) continue;
        done.add(key);
        damageBlock(anchor, d <= 1.5 ? cfg.damage : cfg.damage / 2);
      }
  dimension.createExplosion(center, cfg.power, { breaksBlocks: true });
}

// Ванильные взрывы не трогают блоки с HP
world.beforeEvents.explosion.subscribe((ev) => {
  const blocks = ev.getImpactedBlocks();
  const keep = blocks.filter((b) => !maxHp(b.typeId));
  if (keep.length !== blocks.length) ev.setImpactedBlocks(keep);
});

// Сломал руками — забываем сохранённое HP
world.afterEvents.playerBreakBlock.subscribe(({ block, brokenBlockPermutation }) => {
  if (maxHp(brokenBlockPermutation.type.id)) clearHp(block.dimension, block.location);
});

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("rust:charge", {
    onPlace(ev) {
      ev.dimension.playSound("random.fuse", ev.block.location);
    },
    onTick(ev, { params }) {
      const loc = ev.block.location;
      ev.block.setType("minecraft:air");
      detonate(ev.dimension, loc, params.type);
    },
  });
});
