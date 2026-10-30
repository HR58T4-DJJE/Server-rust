// Плагин «Команды»: /rust:info, /rust:craft, /rust:tc, /rust:admin, /rust:wipe
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system, world } from "@minecraft/server";
import { ADMIN_TAG } from "../config.js";
import { openCraft } from "./crafting.js";
import { allCupboards, cupboardsAt, removeCupboard } from "./toolCupboard.js";

const HELP = `§6==== RustCraft ====§r
§eРесурсы:§r бейте залежи (камень, металл, сера) киркой, деревья — топором.
Руды плавьте в печи: металл. руда -> фрагменты, серная руда -> сера.
§eКрафт:§r «Меню крафта» (нажмите с ним в руке) или верстак. Верстаки 1-3 открывают новые рецепты.
§eДом:§r ставьте «Постройку: солома» и улучшайте киянкой: дерево -> камень -> металл -> МВК.
§eШкаф:§r защищает зону вокруг базы. Нажмите на него, чтобы авторизоваться.
§eРейд:§r сумка с зарядом и C4 — единственное, что ломает постройки. Ванильный TNT не работает.
§eСпальник:§r точка возрождения после смерти.
§7Команды: /rust:craft, /rust:tc, /rust:info`;

function playerOf(origin) {
  const e = origin.sourceEntity ?? origin.initiator;
  return e?.typeId === "minecraft:player" ? e : undefined;
}

const ok = (message) => ({ status: CustomCommandStatus.Success, message });
const fail = (message) => ({ status: CustomCommandStatus.Failure, message });

system.beforeEvents.startup.subscribe(({ customCommandRegistry: reg }) => {
  reg.registerEnum("rust:onoff", ["on", "off"]);

  reg.registerCommand(
    {
      name: "rust:info",
      description: "Помощь по серверу RustCraft",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    () => ok(HELP)
  );

  reg.registerCommand(
    {
      name: "rust:craft",
      description: "Открыть меню крафта",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    (origin) => {
      const player = playerOf(origin);
      if (!player) return fail("Только для игроков");
      system.run(() => openCraft(player));
      return ok();
    }
  );

  reg.registerCommand(
    {
      name: "rust:tc",
      description: "Информация о шкафах рядом",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    (origin) => {
      const player = playerOf(origin);
      if (!player) return fail("Только для игроков");
      const zones = cupboardsAt(player.dimension.id, player.location);
      if (!zones.length) return ok("Рядом нет шкафов — строить можно.");
      const lines = zones.map(({ data }) => `Владелец: ${data.owner}, авторизованы: ${data.auth.join(", ") || "никто"}`);
      return ok(lines.join("\n"));
    }
  );

  reg.registerCommand(
    {
      name: "rust:admin",
      description: "Режим администратора: игнорировать шкафы",
      permissionLevel: CommandPermissionLevel.GameDirectors,
      cheatsRequired: false,
      mandatoryParameters: [{ name: "rust:onoff", type: CustomCommandParamType.Enum }],
    },
    (origin, mode) => {
      const player = playerOf(origin);
      if (!player) return fail("Только для игроков");
      system.run(() => (mode === "on" ? player.addTag(ADMIN_TAG) : player.removeTag(ADMIN_TAG)));
      return ok(mode === "on" ? "Админ-режим включён" : "Админ-режим выключен");
    }
  );

  reg.registerCommand(
    {
      name: "rust:wipe",
      description: "Вайп данных RustCraft (шкафы, HP, спальники, счётчики залежей)",
      permissionLevel: CommandPermissionLevel.Admin,
      cheatsRequired: false,
    },
    () => {
      system.run(() => {
        for (const id of world.getDynamicPropertyIds()) {
          if (/^(tc|hp|bag|cell)\|/.test(id)) world.setDynamicProperty(id, undefined);
        }
        for (const key of [...allCupboards().keys()]) removeCupboard(key);
        world.sendMessage("§c[RustCraft] Вайп данных выполнен.");
      });
      return ok();
    }
  );
});
