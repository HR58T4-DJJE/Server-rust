// Плагин «Крафт»: меню крафта как в Rust (книга «Меню крафта» или нажатие на верстак).
// Чем выше уровень ближайшего верстака, тем больше рецептов открыто.
import { ItemStack, system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { CATEGORIES, RECIPES, RESULT_NAMES, iconOf } from "../recipes.js";
import { actionbar, costText, giveItem, hasCost, once, showForm, takeCost, useHandlers } from "../lib/util.js";

const WB = /^rust:workbench_(\d)$/;

/** Уровень самого крутого верстака в радиусе 3 блоков от игрока */
export function nearbyWorkbench(player) {
  const { x, y, z } = player.location;
  let best = 0;
  for (let dx = -3; dx <= 3; dx++)
    for (let dy = -2; dy <= 2; dy++)
      for (let dz = -3; dz <= 3; dz++) {
        try {
          const m = player.dimension.getBlock({ x: x + dx, y: y + dy, z: z + dz })?.typeId.match(WB);
          if (m) best = Math.max(best, +m[1]);
        } catch {}
      }
  return best;
}

// Проверка, что предмет существует (иначе ресурсы списались бы впустую)
const validCache = new Map();
function validItem(id) {
  if (!validCache.has(id)) {
    try {
      new ItemStack(id, 1);
      validCache.set(id, true);
    } catch {
      validCache.set(id, false);
    }
  }
  return validCache.get(id);
}

world.afterEvents.worldLoad.subscribe(() => {
  const bad = RECIPES.flatMap((r) => [r.id, ...Object.keys(r.cost)]).filter((id) => !validItem(id));
  if (bad.length) console.error(`[RustCraft] Неизвестные предметы в рецептах: ${[...new Set(bad)].join(", ")}`);
});

const tierLabel = (t) => (t ? `Верстак ${t}` : "без верстака");

export function openCraft(player, tier = nearbyWorkbench(player)) {
  const form = new ActionFormData()
    .title("Крафт")
    .body(`Доступно: §e${tierLabel(tier)}§r\nПодойдите к верстаку, чтобы открыть больше рецептов.`);
  for (const cat of CATEGORIES) form.button(cat);
  showForm(player, form).then((res) => {
    if (!res || res.canceled) return;
    openCategory(player, tier, CATEGORIES[res.selection]);
  });
}

function openCategory(player, tier, cat) {
  const list = RECIPES.filter((r) => r.cat === cat);
  const form = new ActionFormData().title(cat).body(`Доступно: §e${tierLabel(tier)}`);
  for (const r of list) {
    const name = `${RESULT_NAMES[r.id] ?? r.id}${r.count > 1 ? ` x${r.count}` : ""}`;
    const line2 = r.wb > tier ? `§8Нужен верстак ${r.wb}` : costText(r.cost, player);
    form.button(`${r.wb > tier ? "§8" : hasCost(player, r.cost) ? "§2" : "§0"}${name}\n${line2}`, iconOf(r.id));
  }
  form.button("< Назад");
  showForm(player, form).then((res) => {
    if (!res || res.canceled) return;
    const r = list[res.selection];
    if (!r) return openCraft(player, tier);
    if (r.wb > tier) {
      actionbar(player, `§cНужен верстак ${r.wb} уровня`);
    } else if (!validItem(r.id)) {
      actionbar(player, "§cЭтот рецепт сломан — сообщите администратору");
    } else if (!takeCost(player, r.cost)) {
      actionbar(player, `§cНе хватает: ${costText(r.cost, player)}`);
    } else {
      giveItem(player, r.id, r.count);
      player.playSound("random.pop", { pitch: 1.2 });
      actionbar(player, `§aСкрафчено: ${RESULT_NAMES[r.id] ?? r.id}`);
    }
    openCategory(player, tier, cat);
  });
}

system.beforeEvents.startup.subscribe(({ blockComponentRegistry, itemComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("rust:workbench", {
    onPlayerInteract(ev, { params }) {
      if (ev.player) openCraft(ev.player, Math.max(params.tier ?? 1, nearbyWorkbench(ev.player)));
    },
  });
  // книга открывается и при нажатии в воздух, и при нажатии по блоку
  const openBook = (player) => {
    if (player?.typeId === "minecraft:player" && once(player, "craft_book", 10)) openCraft(player);
  };
  useHandlers.set("rust:craft_book", openBook);
  itemComponentRegistry.registerCustomComponent("rust:craft_book", {
    onUse: (ev) => openBook(ev.source),
    onUseOn: (ev) => openBook(ev.source),
  });
});
