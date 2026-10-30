// Плагин «HUD»: надпись «Строительство разрешено/запрещено» в зоне шкафа, как в Rust.
import { system, world } from "@minecraft/server";
import { TC } from "../config.js";
import { lastMessageTick } from "../lib/util.js";
import { zoneStatus } from "./toolCupboard.js";

system.runInterval(() => {
  const now = system.currentTick;
  for (const player of world.getPlayers()) {
    if (now - (lastMessageTick.get(player.id) ?? -1000) < 40) continue; // не перебиваем свежие сообщения
    try {
      const status = zoneStatus(player);
      if (status === "none") continue;
      player.onScreenDisplay.setActionBar(
        status === "allowed" ? "§aСтроительство разрешено" : "§cСтроительство запрещено"
      );
    } catch {} // игрок вышел в этот же тик
  }
}, TC.hudIntervalTicks);
