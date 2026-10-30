// Плагин «Оружие и медицина»: револьвер, самодельный дробовик, полуавтоматическая винтовка,
// бинты и шприцы. Пули — это стрелы, которые нельзя подобрать.
import { system, world } from "@minecraft/server";
import { GUNS, HEALS } from "../config.js";
import { actionbar, consumeHeld, countItem, nameOf, once, takeCost, useHandlers } from "../lib/util.js";

const BULLET_TAG = "rust_bullet";

function fire(player, type) {
  const gun = GUNS[type];
  if (!gun) return;
  if (!once(player, `gun_${type}`, gun.cooldown)) return;
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
    let arrow;
    try {
      arrow = player.dimension.spawnEntity("minecraft:arrow", from);
    } catch {
      return; // упёрлись в край мира / незагруженный чанк
    }
    arrow.addTag(BULLET_TAG);
    const proj = arrow.getComponent("minecraft:projectile");
    if (!proj) continue;
    proj.owner = player;
    proj.shoot({ x: dir.x * gun.speed, y: dir.y * gun.speed, z: dir.z * gun.speed }, { uncertainty: gun.spread });
  }
  player.dimension.playSound(gun.sound, player.location, { volume: 1.5, pitch: 1.2 + Math.random() * 0.2 });
  actionbar(player, `§7Патроны: §f${countItem(player, gun.ammo)}`);
}

function heal(player, itemId) {
  const cfg = HEALS[itemId];
  if (!cfg || !once(player, "heal", 20)) return;
  const health = player.getComponent("minecraft:health");
  if (!health) return;
  if (health.currentValue >= health.effectiveMax) return actionbar(player, "§7Здоровье и так полное");
  health.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + cfg.amount));
  if (cfg.regen) player.addEffect("regeneration", cfg.regen * 20, { amplifier: 0, showParticles: false });
  consumeHeld(player, 1);
  player.playSound("armor.equip_leather");
  actionbar(player, "§aВы подлечились");
}

for (const type of Object.keys(GUNS)) useHandlers.set(`rust:${type}`, (p) => fire(p, type));
for (const id of Object.keys(HEALS)) useHandlers.set(id, (p) => heal(p, id));

// Пули исчезают при попадании в блок, чтобы их нельзя было собрать как стрелы
world.afterEvents.projectileHitBlock.subscribe(({ projectile }) => {
  try {
    if (projectile.isValid && projectile.hasTag(BULLET_TAG)) projectile.remove();
  } catch {}
});

// Срабатывает и при нажатии в воздух (onUse), и при нажатии по блоку (onUseOn) —
// на телефоне палец часто попадает в землю или стену.
const useComponent = {
  onUse(ev) {
    if (ev.itemStack) useHandlers.get(ev.itemStack.typeId)?.(ev.source);
  },
  onUseOn(ev) {
    const player = ev.source;
    if (player?.typeId === "minecraft:player" && ev.itemStack) useHandlers.get(ev.itemStack.typeId)?.(player);
  },
};

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
  itemComponentRegistry.registerCustomComponent("rust:gun", useComponent);
  itemComponentRegistry.registerCustomComponent("rust:heal", useComponent);
});
