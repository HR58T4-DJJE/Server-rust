// Плагин «Оружие и медицина»: револьвер, самодельный дробовик, полуавтоматическая винтовка,
// бинты и шприцы. Пули — это стрелы без возможности подобрать.
import { system, world } from "@minecraft/server";
import { GUNS } from "../config.js";
import { actionbar, consumeHeld, countItem, nameOf, takeCost } from "../lib/util.js";

const BULLET_TAG = "rust_bullet";
const cooldowns = new Map();

function ready(player, key, ticks) {
  const now = system.currentTick;
  const id = `${player.id}|${key}`;
  if (now < (cooldowns.get(id) ?? 0)) return false;
  cooldowns.set(id, now + ticks);
  return true;
}

function fire(player, type) {
  const gun = GUNS[type];
  if (!gun) return;
  if (!ready(player, type, gun.cooldown)) return;
  if (countItem(player, gun.ammo) < 1) {
    player.playSound("random.click");
    return actionbar(player, `§cНет патронов: ${nameOf(gun.ammo)}`);
  }
  takeCost(player, { [gun.ammo]: 1 });
  player.startItemCooldown(`rust_${type}`, gun.cooldown);

  const dir = player.getViewDirection();
  const head = player.getHeadLocation();
  const from = { x: head.x + dir.x * 0.8, y: head.y + dir.y * 0.8, z: head.z + dir.z * 0.8 };
  for (let i = 0; i < gun.pellets; i++) {
    const arrow = player.dimension.spawnEntity("minecraft:arrow", from);
    arrow.addTag(BULLET_TAG);
    const proj = arrow.getComponent("minecraft:projectile");
    if (!proj) continue;
    proj.owner = player;
    proj.shoot({ x: dir.x * gun.speed, y: dir.y * gun.speed, z: dir.z * gun.speed }, { uncertainty: gun.spread });
  }
  player.dimension.playSound(gun.sound, player.location, { volume: 1.5, pitch: 1.2 + Math.random() * 0.2 });
  const left = countItem(player, gun.ammo);
  actionbar(player, `§7Патроны: §f${left}`);
}

// Пули исчезают при попадании в блок, чтобы их нельзя было собрать как стрелы
world.afterEvents.projectileHitBlock.subscribe(({ projectile }) => {
  try {
    if (projectile.isValid && projectile.hasTag(BULLET_TAG)) projectile.remove();
  } catch {}
});

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
  itemComponentRegistry.registerCustomComponent("rust:gun", {
    onUse(ev, { params }) {
      fire(ev.source, params.type);
    },
  });
  itemComponentRegistry.registerCustomComponent("rust:heal", {
    onUse(ev, { params }) {
      const player = ev.source;
      if (!ready(player, "heal", 20)) return;
      const health = player.getComponent("minecraft:health");
      if (!health) return;
      if (health.currentValue >= health.effectiveMax) return actionbar(player, "§7Здоровье и так полное");
      health.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + (params.amount ?? 4)));
      if (params.regen) player.addEffect("regeneration", params.regen * 20, { amplifier: 0, showParticles: false });
      consumeHeld(player, 1);
      player.playSound("armor.equip_leather");
      actionbar(player, "§aВы подлечились");
    },
  });
});
