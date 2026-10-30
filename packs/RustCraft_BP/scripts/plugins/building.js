// Плагин «Строительство»: киянка улучшает постройки
// солома -> дерево -> камень -> листовой металл -> МВК, а также чинит их после рейда.
import { system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { REPAIR_MATERIAL, UPGRADES } from "../config.js";
import { actionbar, costText, nameOf, once, showForm, takeCost } from "../lib/util.js";
import { canBuild } from "./toolCupboard.js";
import { clearHp, getHp, hpAnchor, maxHp, setHp } from "./raid.js";

const TIER_NAMES = {
  "rust:build_twig": "Солома",
  "rust:build_wood": "Дерево",
  "rust:build_stone": "Камень",
  "rust:build_metal": "Листовой металл",
  "rust:build_armored": "МВК",
  "rust:tool_cupboard": "Шкаф",
};

const blockName = (typeId) =>
  TIER_NAMES[typeId] ?? (/door$/.test(typeId) ? (typeId.includes("iron") ? "Металлическая дверь" : "Дверь") : nameOf(typeId));

// Удар по постройке или двери показывает её прочность, как в Rust
world.afterEvents.entityHitBlock.subscribe(({ damagingEntity, hitBlock }) => {
  if (damagingEntity?.typeId !== "minecraft:player") return;
  try {
    if (!maxHp(hitBlock.typeId) || !once(damagingEntity, "hp_view", 4)) return;
    const block = hpAnchor(hitBlock);
    const hp = Math.ceil(getHp(block));
    const max = maxHp(block.typeId);
    const color = hp > max * 0.6 ? "§a" : hp > max * 0.3 ? "§e" : "§c";
    actionbar(damagingEntity, `§7${blockName(block.typeId)}: ${color}${hp}§7 / ${max}`);
  } catch {}
});

const lastUse = new Map();
world.afterEvents.playerLeave.subscribe(({ playerId }) => lastUse.delete(playerId));

function openHammer(player, block) {
  block = hpAnchor(block);
  const typeId = block.typeId;
  const max = maxHp(typeId);
  if (!max) return actionbar(player, "§7Киянкой можно улучшать и чинить постройки");
  if (!canBuild(player, block.dimension.id, block.location))
    return actionbar(player, "§cНужна авторизация в шкафу");

  const hp = getHp(block);
  const name = blockName(typeId);
  const up = UPGRADES[typeId];
  const repairMat = REPAIR_MATERIAL[typeId];
  const missing = max - hp;
  // 1 единица материала за каждые 25% недостающей прочности
  const repairCost = repairMat && missing > 0 ? { [repairMat]: Math.ceil((missing / max) * 4) } : undefined;

  const form = new ActionFormData().title("Киянка").body(`${name}\nПрочность: §e${Math.ceil(hp)}§r / ${max}`);
  const actions = [];
  if (up) {
    form.button(`Улучшить: ${TIER_NAMES[up.next]}\n${costText(up.cost, player)}`, `textures/blocks/${up.next.replace(":", "_")}`);
    actions.push("upgrade");
  }
  if (repairCost) {
    form.button(`Починить\n${costText(repairCost, player)}`, "textures/ui/anvil_icon");
    actions.push("repair");
  }
  form.button("Закрыть");
  actions.push("close");

  showForm(player, form).then((res) => {
    if (!res || res.canceled) return;
    // блок мог измениться, пока было открыто меню
    if (!block.isValid || block.typeId !== typeId) return;
    const action = actions[res.selection];
    if (action === "upgrade") {
      if (!takeCost(player, up.cost)) return actionbar(player, `§cНе хватает: ${costText(up.cost, player)}`);
      block.setType(up.next);
      clearHp(block.dimension, block.location);
      block.dimension.playSound("random.anvil_use", block.location, { volume: 0.6 });
      actionbar(player, `§aУлучшено до: ${TIER_NAMES[up.next]}`);
    } else if (action === "repair") {
      if (!takeCost(player, repairCost)) return actionbar(player, `§cНе хватает: ${costText(repairCost, player)}`);
      setHp(block, max);
      block.dimension.playSound("random.anvil_use", block.location, { volume: 0.6, pitch: 1.4 });
      actionbar(player, "§aПостройка починена");
    }
  });
}

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
  itemComponentRegistry.registerCustomComponent("rust:hammer", {
    onUseOn(ev) {
      const player = ev.source;
      if (player?.typeId !== "minecraft:player") return;
      const now = system.currentTick;
      if (now - (lastUse.get(player.id) ?? -100) < 10) return;
      lastUse.set(player.id, now);
      openHammer(player, ev.block);
    },
  });
});
