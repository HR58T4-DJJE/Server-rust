// Рецепты меню крафта. wb — нужный уровень верстака (0 — без верстака).
// Добавляйте свои строки по образцу; id может быть и ванильным предметом.
export const CATEGORIES = ["Ресурсы", "Инструменты", "Строительство", "Оружие", "Взрывчатка", "Медицина", "Одежда"];

export const RECIPES = [
  // Ресурсы
  { cat: "Ресурсы", id: "rust:cloth", count: 1, cost: { "minecraft:string": 2 }, wb: 0 },
  { cat: "Ресурсы", id: "minecraft:gunpowder", count: 2, cost: { "minecraft:charcoal": 3, "rust:sulfur": 2 }, wb: 1 },
  {
    cat: "Ресурсы",
    id: "rust:explosives",
    count: 1,
    cost: { "minecraft:gunpowder": 5, "rust:sulfur": 2, "rust:metal_fragments": 2 },
    wb: 3,
  },

  // Инструменты
  { cat: "Инструменты", id: "rust:rock", count: 1, cost: { "rust:stones": 4 }, wb: 0 },
  { cat: "Инструменты", id: "minecraft:torch", count: 2, cost: { "rust:wood": 1, "rust:cloth": 1 }, wb: 0 },
  { cat: "Инструменты", id: "rust:stone_hatchet", count: 1, cost: { "rust:wood": 5, "rust:stones": 3 }, wb: 0 },
  { cat: "Инструменты", id: "rust:stone_pickaxe", count: 1, cost: { "rust:wood": 5, "rust:stones": 3 }, wb: 0 },
  { cat: "Инструменты", id: "rust:hammer", count: 1, cost: { "rust:wood": 4 }, wb: 0 },
  { cat: "Инструменты", id: "rust:metal_hatchet", count: 1, cost: { "rust:wood": 4, "rust:metal_fragments": 10 }, wb: 1 },
  { cat: "Инструменты", id: "rust:metal_pickaxe", count: 1, cost: { "rust:wood": 4, "rust:metal_fragments": 10 }, wb: 1 },

  // Строительство
  { cat: "Строительство", id: "rust:build_twig", count: 4, cost: { "rust:wood": 4 }, wb: 0 },
  { cat: "Строительство", id: "rust:tool_cupboard", count: 1, cost: { "rust:wood": 40 }, wb: 0 },
  { cat: "Строительство", id: "rust:sleeping_bag", count: 1, cost: { "rust:cloth": 6 }, wb: 0 },
  { cat: "Строительство", id: "minecraft:wooden_door", count: 1, cost: { "rust:wood": 8 }, wb: 0 },
  { cat: "Строительство", id: "minecraft:chest", count: 1, cost: { "rust:wood": 12 }, wb: 0 },
  { cat: "Строительство", id: "minecraft:furnace", count: 1, cost: { "rust:stones": 12, "rust:wood": 4 }, wb: 0 },
  { cat: "Строительство", id: "minecraft:ladder", count: 3, cost: { "rust:wood": 3 }, wb: 0 },
  {
    cat: "Строительство",
    id: "rust:workbench_1",
    count: 1,
    cost: { "rust:wood": 25, "rust:metal_fragments": 10, "rust:scrap": 5 },
    wb: 0,
  },
  { cat: "Строительство", id: "minecraft:iron_door", count: 1, cost: { "rust:metal_fragments": 20 }, wb: 1 },
  { cat: "Строительство", id: "minecraft:iron_bars", count: 4, cost: { "rust:metal_fragments": 6 }, wb: 1 },
  {
    cat: "Строительство",
    id: "rust:workbench_2",
    count: 1,
    cost: { "rust:metal_fragments": 40, "rust:hqm": 3, "rust:scrap": 30 },
    wb: 1,
  },
  {
    cat: "Строительство",
    id: "rust:workbench_3",
    count: 1,
    cost: { "rust:metal_fragments": 80, "rust:hqm": 10, "rust:scrap": 60 },
    wb: 2,
  },

  // Оружие
  { cat: "Оружие", id: "rust:wooden_spear", count: 1, cost: { "rust:wood": 8 }, wb: 0 },
  { cat: "Оружие", id: "minecraft:bow", count: 1, cost: { "rust:wood": 6, "rust:cloth": 2 }, wb: 0 },
  { cat: "Оружие", id: "minecraft:arrow", count: 4, cost: { "rust:wood": 2, "rust:stones": 1 }, wb: 0 },
  {
    cat: "Оружие",
    id: "rust:pipe_shotgun",
    count: 1,
    cost: { "rust:metal_pipe": 1, "rust:wood": 6, "rust:metal_fragments": 8 },
    wb: 1,
  },
  { cat: "Оружие", id: "rust:handmade_shell", count: 4, cost: { "minecraft:gunpowder": 1, "rust:stones": 2 }, wb: 1 },
  {
    cat: "Оружие",
    id: "rust:revolver",
    count: 1,
    cost: { "rust:metal_pipe": 1, "rust:metal_spring": 1, "rust:metal_fragments": 12 },
    wb: 1,
  },
  {
    cat: "Оружие",
    id: "rust:pistol_ammo",
    count: 4,
    cost: { "minecraft:gunpowder": 1, "rust:metal_fragments": 2 },
    wb: 1,
  },
  {
    cat: "Оружие",
    id: "rust:sar",
    count: 1,
    cost: { "rust:metal_pipe": 1, "rust:metal_spring": 1, "rust:hqm": 3, "rust:metal_fragments": 20 },
    wb: 2,
  },
  { cat: "Оружие", id: "rust:rifle_ammo", count: 4, cost: { "minecraft:gunpowder": 2, "rust:metal_fragments": 3 }, wb: 2 },

  // Взрывчатка
  {
    cat: "Взрывчатка",
    id: "rust:satchel_charge",
    count: 1,
    cost: { "minecraft:gunpowder": 6, "rust:cloth": 2, "rust:metal_fragments": 4 },
    wb: 1,
  },
  { cat: "Взрывчатка", id: "rust:c4", count: 1, cost: { "rust:explosives": 4, "rust:cloth": 2, "rust:gears": 1 }, wb: 3 },

  // Медицина
  { cat: "Медицина", id: "rust:bandage", count: 1, cost: { "rust:cloth": 2 }, wb: 0 },
  { cat: "Медицина", id: "rust:syringe", count: 1, cost: { "rust:cloth": 3, "rust:metal_fragments": 4 }, wb: 1 },

  // Одежда
  { cat: "Одежда", id: "minecraft:leather_helmet", count: 1, cost: { "rust:cloth": 5 }, wb: 0 },
  { cat: "Одежда", id: "minecraft:leather_chestplate", count: 1, cost: { "rust:cloth": 8 }, wb: 0 },
  { cat: "Одежда", id: "minecraft:leather_leggings", count: 1, cost: { "rust:cloth": 7 }, wb: 0 },
  { cat: "Одежда", id: "minecraft:leather_boots", count: 1, cost: { "rust:cloth": 4 }, wb: 0 },
  { cat: "Одежда", id: "minecraft:iron_boots", count: 1, cost: { "rust:metal_fragments": 12 }, wb: 1 },
  { cat: "Одежда", id: "minecraft:iron_helmet", count: 1, cost: { "rust:metal_fragments": 18 }, wb: 2 },
  { cat: "Одежда", id: "minecraft:iron_leggings", count: 1, cost: { "rust:metal_fragments": 24 }, wb: 2 },
  {
    cat: "Одежда",
    id: "minecraft:iron_chestplate",
    count: 1,
    cost: { "rust:metal_fragments": 28, "rust:hqm": 1 },
    wb: 2,
  },
];

// Названия для меню (для rust:* блоков и ванильных предметов)
export const RESULT_NAMES = {
  "rust:rock": "Камень (инструмент)",
  "rust:stone_hatchet": "Каменный топор",
  "rust:stone_pickaxe": "Каменная кирка",
  "rust:metal_hatchet": "Топор",
  "rust:metal_pickaxe": "Кирка",
  "rust:hammer": "Киянка",
  "rust:build_twig": "Постройка: солома",
  "rust:tool_cupboard": "Шкаф с инструментами",
  "rust:sleeping_bag": "Спальный мешок",
  "rust:workbench_1": "Верстак 1 уровня",
  "rust:workbench_2": "Верстак 2 уровня",
  "rust:workbench_3": "Верстак 3 уровня",
  "rust:wooden_spear": "Деревянное копьё",
  "rust:pipe_shotgun": "Самодельный дробовик",
  "rust:handmade_shell": "Самодельные патроны",
  "rust:revolver": "Револьвер",
  "rust:pistol_ammo": "Пистолетные патроны",
  "rust:sar": "Полуавтоматическая винтовка",
  "rust:rifle_ammo": "Патроны 5.56",
  "rust:satchel_charge": "Сумка с зарядом",
  "rust:c4": "Взрывчатка C4",
  "rust:bandage": "Бинт",
  "rust:syringe": "Медицинский шприц",
  "minecraft:torch": "Факел",
  "minecraft:wooden_door": "Деревянная дверь",
  "minecraft:chest": "Ящик",
  "minecraft:furnace": "Печь",
  "minecraft:ladder": "Лестница",
  "minecraft:iron_door": "Металлическая дверь",
  "minecraft:iron_bars": "Решётка",
  "minecraft:bow": "Охотничий лук",
  "minecraft:arrow": "Стрелы",
  "minecraft:leather_helmet": "Капюшон",
  "minecraft:leather_chestplate": "Куртка",
  "minecraft:leather_leggings": "Штаны",
  "minecraft:leather_boots": "Ботинки",
  "minecraft:iron_boots": "Металлические ботинки",
  "minecraft:iron_helmet": "Металлическая маска",
  "minecraft:iron_leggings": "Металлические поножи",
  "minecraft:iron_chestplate": "Металлический нагрудник",
};

// Иконки кнопок (пути к текстурам ресурс-пака)
export function iconOf(id) {
  if (id.startsWith("rust:")) {
    const name = id.replace(":", "_");
    const blockTex = {
      "rust:tool_cupboard": "rust_tc_front",
      "rust:workbench_1": "rust_wb1_side",
      "rust:workbench_2": "rust_wb2_side",
      "rust:workbench_3": "rust_wb3_side",
      "rust:sleeping_bag": "rust_sleeping_bag",
      "rust:build_twig": "rust_build_twig",
    }[id];
    return blockTex ? `textures/blocks/${blockTex}` : `textures/items/${name}`;
  }
  return undefined;
}
