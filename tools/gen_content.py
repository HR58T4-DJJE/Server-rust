#!/usr/bin/env python3
"""Генератор JSON блоков/предметов/рецептов RustCraft.

Запуск: python3 tools/gen_content.py .  — затем ОБЯЗАТЕЛЬНО python3 tools/gen_models.py
(он переключает блоки на 3D-модели и кладёт текстуры Pixel Perfection).
"""
import json, os, sys
R = sys.argv[1]
BP = os.path.join(R, "packs/RustCraft_BP"); RP = os.path.join(R, "packs/RustCraft_RP")
FMT = "1.21.100"
def w(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2); f.write("\n")

terrain = {}
def tex(name): terrain[name] = {"textures": f"textures/blocks/{name}"}; return name

def block(ident, name, comps, cat="construction", mat=None, traits=None, perms=None, states=None, group=None):
    desc = {"identifier": ident, "menu_category": {"category": cat}}
    if group: desc["menu_category"]["group"] = group
    if traits: desc["traits"] = traits
    if states: desc["states"] = states
    c = {"minecraft:display_name": name, "minecraft:geometry": "minecraft:geometry.full_block"}
    if mat: c["minecraft:material_instances"] = mat
    c.update(comps)
    b = {"description": desc, "components": c}
    if perms: b["permutations"] = perms
    w(f"{BP}/blocks/{ident.split(':')[1]}.json", {"format_version": FMT, "minecraft:block": b})

def mat_all(t, rm="opaque"):
    return {"*": {"texture": tex(t), "render_method": rm}}
def mat_tsb(top, side, front=None, rm="opaque"):
    m = {"*": {"texture": tex(side), "render_method": rm}, "up": {"texture": tex(top), "render_method": rm},
         "down": {"texture": tex(top), "render_method": rm}}
    if front: m["north"] = {"texture": tex(front), "render_method": rm}
    return m
EMPTY = "loot_tables/empty.json"
IMMOVABLE = {"minecraft:movable": {"movement_type": "immovable"}}
def mining(s): return {"minecraft:destructible_by_mining": {"seconds_to_destroy": s}}
def expl(r): return {"minecraft:destructible_by_explosion": {"explosion_resistance": r}}

ROT_TRAIT = {"minecraft:placement_direction": {"enabled_states": ["minecraft:cardinal_direction"], "y_rotation_offset": 180}}
ROT_PERMS = [{"condition": f"q.block_state('minecraft:cardinal_direction') == '{d}'",
              "components": {"minecraft:transformation": {"rotation": [0, r, 0]}}}
             for d, r in (("north", 0), ("west", 90), ("south", 180), ("east", 270))]

# --- залежи
for k, nm, col in (("stone", "Каменная залежь", "#888888"), ("metal", "Металлическая залежь", "#7a5a40"),
                   ("sulfur", "Серная залежь", "#d8c32e")):
    block(f"rust:{k}_node", nm, {**mining(4), **expl(3), "minecraft:loot": EMPTY, "minecraft:map_color": col,
          "tag:rust_node": {}, "tag:stone": {}}, cat="nature", mat=mat_all(f"rust_{k}_node"))
# --- лут
block("rust:loot_barrel", "Бочка", {**mining(1.0), **expl(1), "minecraft:loot": EMPTY, "tag:rust_loot": {},
      "minecraft:map_color": "#2f5d8f"}, cat="nature", mat=mat_tsb("rust_barrel_top", "rust_barrel_side"))
block("rust:loot_crate", "Военный ящик", {**mining(2.0), **expl(1), "minecraft:loot": EMPTY, "tag:rust_loot": {},
      "minecraft:map_color": "#4e5a2f"}, cat="nature", mat=mat_tsb("rust_crate_top", "rust_crate_side"))
# --- шкаф
block("rust:tool_cupboard", "Шкаф с инструментами", {**mining(3), **expl(1200), **IMMOVABLE, "rust:tool_cupboard": {},
      "minecraft:map_color": "#a27848", "tag:wood": {}},
      cat="items", mat=mat_tsb("rust_tc_top", "rust_tc_side", "rust_tc_front"), traits=ROT_TRAIT, perms=ROT_PERMS)
# --- верстаки
for t in (1, 2, 3):
    block(f"rust:workbench_{t}", f"Верстак {t} уровня", {**mining(3), **expl(6), **IMMOVABLE, "rust:workbench": {"tier": t},
          "minecraft:map_color": "#5a5a5a"}, cat="items", mat=mat_tsb(f"rust_wb{t}_top", f"rust_wb{t}_side"))
# --- переработчик
block("rust:recycler", "Переработчик", {"minecraft:destructible_by_mining": False, **expl(3600000), **IMMOVABLE,
      "rust:recycler": {}, "minecraft:map_color": "#4f7a3a"}, cat="items",
      mat=mat_tsb("rust_recycler_side", "rust_recycler_side", "rust_recycler_front"), traits=ROT_TRAIT, perms=ROT_PERMS)
# --- спальник
block("rust:sleeping_bag", "Спальный мешок", {**mining(0.5), **expl(1), **IMMOVABLE, "rust:sleeping_bag": {},
      "minecraft:geometry": "geometry.rust_flat",
      "minecraft:collision_box": {"origin": [-8, 0, -8], "size": [16, 3, 16]},
      "minecraft:selection_box": {"origin": [-8, 0, -8], "size": [16, 3, 16]},
      "minecraft:light_dampening": 0, "minecraft:map_color": "#5d6b3a"},
      cat="items", mat=mat_all("rust_sleeping_bag"))
# --- строительство
tiers = [("twig", "Постройка: солома", 0.4, "#9b7a4a"), ("wood", "Постройка: дерево", 3, "#8a6239"),
         ("stone", "Постройка: камень", 6, "#7d7d7d"), ("metal", "Постройка: листовой металл", 10, "#8c9296"),
         ("armored", "Постройка: МВК (бронированная)", 15, "#3c4044")]
for k, nm, s, col in tiers:
    comps = {**mining(s), **expl(1200), **IMMOVABLE, "minecraft:loot": EMPTY, "tag:rust_building": {}, "minecraft:map_color": col}
    rm = "opaque"
    if k == "twig":
        rm = "alpha_test"; comps["minecraft:light_dampening"] = 0
    block(f"rust:build_{k}", nm, comps, cat="construction", mat=mat_all(f"rust_build_{k}", rm))
# --- заряды
for k, nm, fuse in (("c4", "Заряд C4", [200, 200]), ("satchel", "Сумка с зарядом", [80, 160])):
    block(f"rust:{k}_planted", nm, {"minecraft:destructible_by_mining": False, **expl(3600000), **IMMOVABLE,
          "minecraft:loot": EMPTY, "rust:charge": {"type": k},
          "minecraft:tick": {"interval_range": fuse, "looping": False},
          "minecraft:geometry": "geometry.rust_small",
          "minecraft:collision_box": {"origin": [-4, 0, -4], "size": [8, 5, 8]},
          "minecraft:selection_box": {"origin": [-4, 0, -4], "size": [8, 5, 8]},
          "minecraft:light_dampening": 0, "minecraft:map_color": "#d6d0b8"},
          cat="none", mat=mat_all(f"rust_{k}_planted"))

w(f"{BP}/loot_tables/empty.json", {"pools": []})
w(f"{RP}/textures/terrain_texture.json", {"resource_pack_name": "rustcraft", "texture_name": "atlas.terrain",
  "padding": 8, "num_mip_levels": 4, "texture_data": terrain})

# ------------------------------------------------------------ предметы
itex = {}
def item(ident, name, comps=None, cat="items", stack=64, group=None):
    key = ident.replace(":", "_")
    itex[key] = {"textures": f"textures/items/{key}"}
    desc = {"identifier": ident, "menu_category": {"category": cat}}
    if group: desc["menu_category"]["group"] = group
    c = {"minecraft:icon": {"textures": {"default": key}}, "minecraft:display_name": {"value": name},
         "minecraft:max_stack_size": stack}
    c.update(comps or {})
    w(f"{BP}/items/{ident.split(':')[1]}.json", {"format_version": FMT, "minecraft:item": {"description": desc, "components": c}})

RES = [("wood", "Дерево"), ("stones", "Камни"), ("metal_ore", "Металлическая руда"), ("metal_fragments", "Фрагменты металла"),
       ("sulfur_ore", "Серная руда"), ("sulfur", "Сера"), ("hqm_ore", "Руда МВК"), ("hqm", "Металл высокого качества (МВК)"),
       ("cloth", "Ткань"), ("scrap", "Скрап"), ("metal_pipe", "Металлическая труба"), ("gears", "Шестерёнки"),
       ("metal_spring", "Металлическая пружина"), ("explosives", "Взрывчатка")]
for k, nm in RES:
    extra = {"minecraft:fuel": {"duration": 4}} if k == "wood" else {}
    item(f"rust:{k}", nm, extra)

def digger(speeds):
    return {"minecraft:digger": {"use_efficiency": True, "destroy_speeds":
            [{"block": {"tags": q}, "speed": s} for q, s in speeds]}}
def tool(ident, name, dmg, dur, speeds, extra=None, cat="equipment"):
    c = {"minecraft:hand_equipped": True, "minecraft:damage": {"value": dmg},
         "minecraft:durability": {"max_durability": dur}}
    if speeds: c.update(digger(speeds))
    c.update(extra or {})
    item(ident, name, c, cat=cat, stack=1)

WOODQ = "query.any_tag('wood', 'log')"; NODEQ = "query.any_tag('rust_node', 'stone', 'rust_loot')"
tool("rust:rock", "Камень", 3, 300, [(WOODQ, 2), (NODEQ, 2)])
tool("rust:stone_hatchet", "Каменный топор", 4, 250, [(WOODQ, 5), (NODEQ, 2)])
tool("rust:stone_pickaxe", "Каменная кирка", 3, 250, [(NODEQ, 5), (WOODQ, 2)])
tool("rust:metal_hatchet", "Топор", 6, 600, [(WOODQ, 9), (NODEQ, 3)])
tool("rust:metal_pickaxe", "Кирка", 5, 600, [(NODEQ, 9), (WOODQ, 3)])
tool("rust:wooden_spear", "Деревянное копьё", 7, 120, [])
tool("rust:hammer", "Киянка", 2, 1000, [], {"rust:hammer": {}})
item("rust:craft_book", "Меню крафта", {"rust:craft_book": {}}, stack=1)

for k, nm in (("revolver", "Револьвер"), ("pipe_shotgun", "Самодельный дробовик"), ("sar", "Полуавтоматическая винтовка")):
    item(f"rust:{k}", nm, {"minecraft:hand_equipped": True, "rust:gun": {"type": k},
         "minecraft:cooldown": {"category": f"rust_{k}", "duration": 0.1}}, cat="equipment", stack=1)
for k, nm in (("pistol_ammo", "Пистолетный патрон"), ("handmade_shell", "Самодельный патрон (дробь)"), ("rifle_ammo", "Патрон 5.56")):
    item(f"rust:{k}", nm, cat="equipment")
item("rust:bandage", "Бинт", {"rust:heal": {}}, cat="equipment", stack=16)
item("rust:syringe", "Медицинский шприц", {"rust:heal": {}}, cat="equipment", stack=8)
item("rust:c4", "Взрывчатка C4", {"minecraft:block_placer": {"block": "rust:c4_planted"}}, cat="equipment", stack=16)
item("rust:satchel_charge", "Сумка с зарядом", {"minecraft:block_placer": {"block": "rust:satchel_planted"}}, cat="equipment", stack=16)

w(f"{RP}/textures/item_texture.json", {"resource_pack_name": "rustcraft", "texture_name": "atlas.items", "texture_data": itex})

# ------------------------------------------------------------ рецепты
w(f"{BP}/recipes/wood_from_logs.json", {"format_version": "1.20.10", "minecraft:recipe_shapeless": {
  "description": {"identifier": "rust:wood_from_logs"}, "tags": ["crafting_table"],
  "ingredients": [{"tag": "minecraft:logs"}], "result": {"item": "rust:wood", "count": 6}, "unlock": {"context": "AlwaysUnlocked"}}})
for k, inp, out in (("metal", "rust:metal_ore", "rust:metal_fragments"), ("sulfur", "rust:sulfur_ore", "rust:sulfur"),
                    ("hqm", "rust:hqm_ore", "rust:hqm"), ("charcoal", "rust:wood", "minecraft:charcoal")):
    w(f"{BP}/recipes/smelt_{k}.json", {"format_version": "1.12", "minecraft:recipe_furnace": {
      "description": {"identifier": f"rust:smelt_{k}"}, "tags": ["furnace", "blast_furnace"], "input": inp, "output": out}})

# ------------------------------------------------------------ геометрия
def geo(ident, size):
    sx, sy, sz = size
    uv = {f: {"uv": [0, 0], "uv_size": [sx, sy]} for f in ("north", "south", "east", "west")}
    uv["up"] = {"uv": [0, 0], "uv_size": [sx, sz]}; uv["down"] = {"uv": [0, 0], "uv_size": [sx, sz]}
    w(f"{RP}/models/blocks/{ident}.geo.json", {"format_version": "1.12.0", "minecraft:geometry": [{
      "description": {"identifier": f"geometry.{ident}", "texture_width": 16, "texture_height": 16,
                      "visible_bounds_width": 2, "visible_bounds_height": 2, "visible_bounds_offset": [0, 0.5, 0]},
      "bones": [{"name": "root", "pivot": [0, 0, 0],
                 "cubes": [{"origin": [-sx / 2, 0, -sz / 2], "size": [sx, sy, sz], "uv": uv}]}]}]})
geo("rust_flat", (16, 3, 16))
geo("rust_small", (8, 5, 8))
print("ok")
