// Все настройки RustCraft в одном месте. Меняйте числа здесь и перезапускайте сервер.

// ---------------------------------------------------------------- Шкаф (Tool Cupboard)
export const TC = {
  radius: 16, // зона действия по горизонтали (в блоках)
  height: 24, // зона по вертикали вверх/вниз
  maxAuthorized: 16, // максимум игроков в списке одного шкафа
  hudIntervalTicks: 10, // как часто обновлять надпись «Строительство разрешено/запрещено»
};

// Тег администратора: игрок с этим тегом игнорирует шкафы (/rust:admin on)
export const ADMIN_TAG = "rust_admin";

// ---------------------------------------------------------------- Прочность построек и рейды
// HP блоков, которые ломаются только нашей взрывчаткой (ванильный TNT/крипер их не берёт)
export const BLOCK_HP = {
  "rust:build_twig": 10,
  "rust:build_wood": 250,
  "rust:build_stone": 500,
  "rust:build_metal": 1000,
  "rust:build_armored": 2000,
  "rust:tool_cupboard": 100,
  "minecraft:iron_door": 400,
  "minecraft:iron_trapdoor": 300,
};
// Любая деревянная дверь/люк (oak_door, spruce_door, wooden_door, ...)
export const WOOD_DOOR_HP = 200;

// Взрывчатка: урон в центре, радиус урона по постройкам, сила ванильного взрыва
export const EXPLOSIVES = {
  c4: { damage: 275, radius: 2.5, power: 3, dudChance: 0 },
  satchel: { damage: 75, radius: 2, power: 2, dudChance: 0.2 }, // 20% осечка, как в Rust
};

// ---------------------------------------------------------------- Улучшение построек киянкой
// tier: [следующий блок, стоимость улучшения]
export const UPGRADES = {
  "rust:build_twig": { next: "rust:build_wood", cost: { "rust:wood": 4 } },
  "rust:build_wood": { next: "rust:build_stone", cost: { "rust:stones": 6 } },
  "rust:build_stone": { next: "rust:build_metal", cost: { "rust:metal_fragments": 4 } },
  "rust:build_metal": { next: "rust:build_armored", cost: { "rust:hqm": 1 } },
};
// Цена ремонта = доля стоимости улучшения в предыдущий тир (покрывается материалом этого тира)
export const REPAIR_MATERIAL = {
  "rust:build_twig": "rust:wood",
  "rust:build_wood": "rust:wood",
  "rust:build_stone": "rust:stones",
  "rust:build_metal": "rust:metal_fragments",
  "rust:build_armored": "rust:hqm",
};

// ---------------------------------------------------------------- Добыча ресурсов
// Множитель добычи от инструмента
export const TOOL_GATHER = {
  "rust:rock": 1,
  "rust:stone_pickaxe": 2,
  "rust:stone_hatchet": 1,
  "rust:metal_pickaxe": 3,
  "rust:metal_hatchet": 1.5,
};
// Бонусное дерево при рубке брёвен топором
export const WOOD_BONUS = { "rust:rock": 1, "rust:stone_hatchet": 3, "rust:metal_hatchet": 5 };

// Что выпадает из залежей (на множитель 1). [предмет, мин, макс, шанс]
export const NODE_DROPS = {
  "rust:stone_node": [["rust:stones", 10, 14, 1]],
  "rust:metal_node": [
    ["rust:metal_ore", 5, 7, 1],
    ["rust:stones", 2, 4, 1],
    ["rust:hqm_ore", 1, 1, 0.35],
  ],
  "rust:sulfur_node": [
    ["rust:sulfur_ore", 5, 7, 1],
    ["rust:stones", 1, 3, 1],
  ],
};

export const LOOT = {
  "rust:loot_barrel": [
    ["rust:scrap", 2, 5, 1],
    ["rust:metal_fragments", 3, 8, 0.5],
    ["rust:cloth", 2, 4, 0.4],
    ["rust:metal_pipe", 1, 1, 0.15],
    ["rust:gears", 1, 1, 0.15],
    ["rust:metal_spring", 1, 1, 0.1],
    ["rust:pistol_ammo", 2, 5, 0.15],
    ["rust:handmade_shell", 2, 4, 0.15],
    ["rust:bandage", 1, 1, 0.2],
  ],
  "rust:loot_crate": [
    ["rust:scrap", 8, 15, 1],
    ["rust:hqm", 1, 3, 0.4],
    ["rust:metal_pipe", 1, 2, 0.4],
    ["rust:metal_spring", 1, 2, 0.4],
    ["rust:gears", 1, 2, 0.3],
    ["rust:rifle_ammo", 4, 10, 0.3],
    ["rust:pistol_ammo", 5, 10, 0.4],
    ["rust:syringe", 1, 2, 0.3],
    ["rust:revolver", 1, 1, 0.08],
    ["rust:pipe_shotgun", 1, 1, 0.08],
    ["rust:sar", 1, 1, 0.03],
    ["rust:explosives", 1, 2, 0.05],
  ],
};

// Появление залежей и бочек вокруг игроков
export const SPAWNER = {
  intervalTicks: 20 * 20, // раз в 20 секунд
  attemptsPerPlayer: 3,
  minDist: 20,
  maxDist: 56,
  cellSize: 32, // мир делится на клетки 32x32...
  maxPerCell: 4, // ...и в каждой не больше 4 залежей/бочек
  weights: {
    "rust:stone_node": 40,
    "rust:metal_node": 28,
    "rust:sulfur_node": 20,
    "rust:loot_barrel": 10,
    "rust:loot_crate": 2,
  },
  // на каких блоках может появиться залежь
  ground: [
    "minecraft:grass_block",
    "minecraft:dirt",
    "minecraft:coarse_dirt",
    "minecraft:stone",
    "minecraft:sand",
    "minecraft:red_sand",
    "minecraft:gravel",
    "minecraft:snow",
    "minecraft:podzol",
    "minecraft:andesite",
    "minecraft:granite",
    "minecraft:diorite",
    "minecraft:terracotta",
  ],
};

// ---------------------------------------------------------------- Спавн
export const SPAWN = {
  randomSpawn: true, // случайный спавн по карте при первом входе и смерти
  radius: 1500, // радиус от точки 0,0
  // Точки спавна ищутся заранее в фоне: сервер подгружает участок карты, проверяет, что там суша,
  // и запоминает точку. Игрок появляется сразу на готовой земле, без висения в воздухе.
  poolSize: 40, // сколько проверенных точек держать в запасе
  scoutIntervalTicks: 20 * 5, // как часто искать новую точку, пока запас не заполнен
  refreshIntervalTicks: 20 * 60 * 5, // когда запас полон — раз в 5 минут заменять одну точку на новую
  // на чём можно появиться
  safeGround: [
    "minecraft:grass_block",
    "minecraft:dirt",
    "minecraft:coarse_dirt",
    "minecraft:podzol",
    "minecraft:mycelium",
    "minecraft:moss_block",
    "minecraft:sand",
    "minecraft:red_sand",
    "minecraft:gravel",
    "minecraft:stone",
    "minecraft:andesite",
    "minecraft:granite",
    "minecraft:diorite",
    "minecraft:snow",
    "minecraft:terracotta",
  ],
  bagCooldownSec: 120, // перезарядка спальника
  maxBags: 6,
  // выдаётся при каждом возрождении (как камень и факел в Rust)
  respawnKit: [
    ["rust:rock", 1],
    ["minecraft:torch", 1],
    ["rust:craft_book", 1],
  ],
  // дополнительно при самом первом входе
  firstJoinKit: [["rust:bandage", 2]],
};

// ---------------------------------------------------------------- Мобы
// Эти мобы удаляются: не появляются сами и исчезают, если всё же возникли
// (из структур, превращений, рейдов, старых чанков).
export const BANNED_MOBS = [
  // нечисть в воде (в воде остаются только рыбы)
  "minecraft:drowned",
  "minecraft:guardian",
  "minecraft:elder_guardian",
  "minecraft:squid",
  "minecraft:glow_squid",
  "minecraft:dolphin",
  // скелеты всех видов
  "minecraft:skeleton",
  "minecraft:stray",
  "minecraft:bogged",
  "minecraft:wither_skeleton",
  // криперы и ведьмы
  "minecraft:creeper",
  "minecraft:witch",
  // разбойники и вся их банда (патрули, рейды, особняки)
  "minecraft:pillager",
  "minecraft:vindicator",
  "minecraft:evocation_illager",
  "minecraft:vex",
  "minecraft:ravager",
];

// ---------------------------------------------------------------- Запрещённые блоки и предметы
// Нельзя поставить, нельзя использовать, а из инвентаря они исчезают (скрафтил, нашёл, выкопал).
// Это блоки, которые ломают геймплей в стиле Rust:
//  - обсидиан и т.п. не берёт ни C4, ни сумка -> база становится нерейдабельной;
//  - эндер-сундук и шалкеры позволяют прятать лут так, что его нельзя зарейдить;
//  - TNT бесполезен (постройки ломаются только C4/сумкой) и только путает игроков.
export const BANNED_ITEMS = [
  "minecraft:tnt",
  "minecraft:tnt_minecart",
  "minecraft:obsidian",
  "minecraft:crying_obsidian",
  "minecraft:ender_chest",
  "minecraft:respawn_anchor",
  "minecraft:enchanting_table",
  "minecraft:anvil",
  "minecraft:chipped_anvil",
  "minecraft:damaged_anvil",
  "minecraft:netherite_block",
  "minecraft:end_crystal",
  "minecraft:beacon",
  // телепорт сквозь стены баз — обход шкафа и дверей без рейда
  "minecraft:ender_pearl",
  "minecraft:chorus_fruit",
  // редстоун-механизмы: в Rust их нет (железные двери открываются рукой — см. doors.js)
  "minecraft:observer",
  "minecraft:dispenser",
  "minecraft:dropper",
  "minecraft:hopper",
  "minecraft:lever",
  "minecraft:tripwire_hook",
  "minecraft:target",
  "minecraft:noteblock",
  "minecraft:crafter",
  "minecraft:lightning_rod",
  "minecraft:trapped_chest",
  // магия и «майнкрафтовый» прогресс, которого нет в Rust
  "minecraft:brewing_stand",
  "minecraft:elytra",
  "minecraft:ender_eye",
];
export const BANNED_ITEM_PATTERNS = [
  /^minecraft:.*shulker_box$/, // шалкеры всех цветов
  /^minecraft:.*redstone/, // пыль, блок, факел, лампа, руда редстоуна
  /^minecraft:.*piston/, // поршни и липкие поршни
  /^minecraft:.*(repeater|comparator)$/, // повторители и компараторы
  /^minecraft:daylight_detector/, // датчики дневного света
  /^minecraft:.*_button$/, // все кнопки
  /^minecraft:.*pressure_plate$/, // все нажимные плиты
  /^minecraft:(rail|golden_rail|detector_rail|activator_rail)$/, // рельсы
  /^minecraft:.*minecart$/, // все вагонетки
  /^minecraft:.*sculk_sensor$/, // скалк-датчики
];

// ---------------------------------------------------------------- Защита от лагов
export const LAG = {
  sweepIntervalTicks: 20 * 60, // раз в минуту проверять скопления сущностей
  // лимиты на один чанк (16x16): лишнее удаляется
  maxItemsPerChunk: 64, // выпавшие предметы
  maxXpPerChunk: 40, // сферы опыта
  maxAnimalsPerChunk: 24, // фермы животных (с именем или приручённые не трогаются)
  animals: [
    "minecraft:cow",
    "minecraft:mooshroom",
    "minecraft:sheep",
    "minecraft:pig",
    "minecraft:chicken",
    "minecraft:rabbit",
    "minecraft:goat",
    "minecraft:llama",
    "minecraft:horse",
    "minecraft:donkey",
    "minecraft:mule",
    "minecraft:camel",
    "minecraft:armadillo",
    "minecraft:frog",
  ],
  tpsWarn: 15, // если TPS ниже — предупреждение в консоль с причинами
};

// ---------------------------------------------------------------- Природа (плоский мир)
// Мир RustCraft плоский: без гор, оврагов и пещер. Леса, поляны, цветы и пруды расставляет terrain.js.
// В обычном (неплоском) мире плагин ничего не делает.
export const TERRAIN = {
  enabled: true,
  groundY: 60, // высота травы в плоском мире (см. tools/make_flat_world.py)
  playerRadiusChunks: 3, // украшать чанки вокруг игроков (в пределах tick-distance)
  pregen: true, // в фоне пройти всю карту (радиус SPAWN.radius), чтобы деревья не «вырастали» на глазах
  pregenPauseTicks: 10, // пауза между участками 64x64 фонового прохода
  forestThreshold: 0.55, // выше — густой лес
  forestDensity: 0.55, // шанс дерева в точке сетки в лесу
  meadowTreeChance: 0.04, // шанс дерева на поляне
  spruceThreshold: 0.62, // выше — холодная зона с елями
  grassChance: 0.3, // трава на поляне
  flowerChance: 0.025, // цветы
  pondChance: 0.04, // пруд в чанке поляны
  flowers: ["minecraft:dandelion", "minecraft:poppy", "minecraft:cornflower", "minecraft:oxeye_daisy", "minecraft:azure_bluet"],
};

// ---------------------------------------------------------------- Оружие
// speed — скорость пули (урон стрелы зависит от скорости), cooldown — в тиках
export const GUNS = {
  revolver: { ammo: "rust:pistol_ammo", speed: 3.6, pellets: 1, spread: 0.6, cooldown: 8, sound: "firework.blast" },
  pipe_shotgun: {
    ammo: "rust:handmade_shell",
    speed: 2.6,
    pellets: 6,
    spread: 6,
    cooldown: 30,
    sound: "random.explode",
  },
  sar: { ammo: "rust:rifle_ammo", speed: 4.6, pellets: 1, spread: 0.3, cooldown: 6, sound: "firework.large_blast" },
};

// Медицина: сколько HP лечит сразу и сколько секунд регенерации
export const HEALS = {
  "rust:bandage": { amount: 4, regen: 0 },
  "rust:syringe": { amount: 8, regen: 5 },
};

// ---------------------------------------------------------------- Переработчик
// Что получается из одного предмета
export const RECYCLE = {
  "rust:metal_pipe": { "rust:scrap": 3, "rust:hqm": 1 },
  "rust:gears": { "rust:scrap": 3, "rust:metal_fragments": 4 },
  "rust:metal_spring": { "rust:scrap": 3, "rust:hqm": 1 },
  "rust:revolver": { "rust:scrap": 6, "rust:metal_pipe": 1 },
  "rust:pipe_shotgun": { "rust:scrap": 4, "rust:metal_fragments": 5 },
  "minecraft:iron_ingot": { "rust:metal_fragments": 3 },
  "minecraft:raw_iron": { "rust:metal_ore": 2 },
};
