#!/usr/bin/env python3
"""3D-модели блоков RustCraft (геометрия Bedrock из кубиков) и их текстуры.

Запуск (после gen_textures.py):  python3 tools/gen_models.py [--preview папка]
- пишет packs/RustCraft_RP/models/blocks/rust_m_*.geo.json и атласы textures/blocks/rust_m_*.png;
- переключает блоки в packs/RustCraft_BP/blocks/*.json на эти модели;
- кладёт текстуры Pixel Perfection (CC BY-SA 4.0, XSSheep) для залежей, каменной стены и железной двери.

Текстуры моделей рисуются «пиксель в пиксель»: 1 пиксель текстуры = 1 пиксель модели (стиль Minecraft).
Каждая модель — атлас 64x64 из плиток 16x16; грань кубика берёт кусок нужной плитки.
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gen_textures import STONE, DARKSTONE, PLANK, WOOD, METAL, border, flecks, hexc, line, noise_fill, px, rect  # noqa: E402

ROOT = os.path.join(HERE, "..")
RP = os.path.join(ROOT, "packs", "RustCraft_RP")
BP = os.path.join(ROOT, "packs", "RustCraft_BP")
PP = os.path.join(HERE, "third_party", "pixel_perfection")


def pp(name):
    return Image.open(os.path.join(PP, name + ".png")).convert("RGBA")


def tile(fill=None, seed=0):
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    if fill:
        noise_fill(img, fill, seed)
    return img


# ---------------------------------------------------------------- плитки
def t_solid(palette, seed, edge=None):
    img = tile(palette, seed)
    if edge:
        border(img, hexc(edge))
    return img


def t_c4_body():
    img = tile(["#d9cfa8", "#d2c79f", "#ddd4b0", "#cfc49a"], 201)  # пластит
    for x in range(0, 16, 4):
        px(img, [(x + 1, 3), (x + 2, 9), (x, 13)], hexc("#bfb388"))
    return img


def t_c4_keypad():
    img = tile(["#3c3f42", "#383b3e"], 202)
    for yy in (4, 7, 10, 13):
        for xx in (2, 5, 8, 11, 14):
            px(img, [(xx, yy)], hexc("#9aa1a6"))
    rect(img, 1, 0, 14, 2, hexc("#1d1d1d"))  # экран
    rect(img, 2, 1, 4, 1, hexc("#e03030"))
    rect(img, 6, 1, 8, 1, hexc("#e03030"))
    rect(img, 10, 1, 12, 1, hexc("#e03030"))
    return img


def t_tape():
    return t_solid(["#1f2023", "#26272a", "#1b1c1e"], 203)


def t_red():
    img = tile(["#e02a2a"], 0)
    px(img, [(0, 0)], hexc("#ff8080"))
    return img


def t_wire():
    img = tile(["#c42a2a"], 0)
    for y in range(16):
        if y % 4 == 0:
            rect(img, 0, y, 15, y, hexc("#2a5ac4"))
    return img


def t_canvas(dark=False):
    pal = ["#6f5532", "#68502f", "#755a36"] if dark else ["#8a6a3e", "#83653b", "#917043", "#7d5f37"]
    img = tile(pal, 210 + dark)
    for y in range(1, 16, 3):
        for x in range((y // 3) % 2, 16, 2):
            px(img, [(x, y)], hexc("#5e4528" if dark else "#7a5c34"))
    return img


def t_fuse():
    img = tile(["#d8c060", "#cbb355"], 212)
    for y in range(0, 16, 2):
        px(img, [(0, y)], hexc("#a08a3a"))
    return img


def t_planks(seed=220, dark=False):
    base = ["#8a6239", "#7f5832", "#94693e"] if dark else PLANK
    img = tile(base, seed)
    for y in (3, 7, 11, 15):
        rect(img, 0, y, 15, y, hexc("#4f3620" if dark else "#6b4a2a"))
    for x, y in ((5, 1), (11, 5), (3, 9), (9, 13)):
        px(img, [(x, y)], hexc("#4f3620" if dark else "#6b4a2a"))
    return img


def t_tc_door():
    img = tile(["#7a5631", "#73502e", "#805a34"], 230)
    border(img, hexc("#4a3420"))
    rect(img, 2, 2, 13, 13, hexc("#6b4a2a"))
    noise_fill(img, ["#7a5631", "#805a34"], 231, (3, 3, 13, 13))
    return img


def t_metal(seed=240, dark=False):
    pal = ["#5a5f63", "#555a5e", "#60656a"] if dark else METAL
    img = tile(pal, seed)
    flecks(img, ["#8a4b22", "#a0582a"], 3, seed + 1, size=1)
    return img


def t_numeral(n):
    """Фартук верстака 14x4: жёлтые кромки и римская цифра уровня."""
    img = tile(["#2c2f32", "#303336"], 250 + n)
    rect(img, 0, 0, 15, 0, hexc("#e0b030"))
    rect(img, 0, 3, 15, 3, hexc("#e0b030"))
    xs = {1: [6], 2: [5, 8], 3: [3, 6, 9]}[n]
    for x in xs:
        rect(img, x, 1, x + 1, 2, hexc("#f4f4f4"))
    return img


def t_hazard():
    img = tile(["#1f1f1f"], 0)
    for x in range(-16, 16, 4):
        for k in range(2):
            line(img, x + k, 15, x + k + 15, 0, hexc("#e0b030"))
    return img


def t_green(seed=260, dark=False):
    pal = ["#3d6630", "#38602c", "#426c34"] if dark else ["#4f7a3a", "#4a7236", "#56823f"]
    img = tile(pal, seed)
    border(img, hexc("#2d4521"))
    return img


def t_dark():
    return t_solid(["#161616", "#1b1b1b", "#121212"], 270)


def t_barrel(seed=280):
    img = tile(["#2f5d8f", "#2b5786", "#346599"], seed)
    for x in (3, 8, 13):
        rect(img, x, 0, x, 15, hexc("#26507c"))
    flecks(img, ["#8a4b22", "#a35a2a"], 4, seed + 1, size=1)
    return img


def t_barrel_rim():
    return t_solid(["#1d3a5a", "#1a3552", "#21405f"], 281)


def t_barrel_top():
    img = tile(["#2b5786", "#2f5d8f"], 282)
    rect(img, 10, 3, 12, 5, hexc("#1d3a5a"))
    rect(img, 3, 10, 4, 11, hexc("#1d3a5a"))
    return img


def t_olive(seed=290, dark=False):
    pal = ["#434d27", "#3f4825", "#47522a"] if dark else ["#4e5a2f", "#4a552c", "#556233"]
    img = tile(pal, seed)
    border(img, hexc("#2f361b"))
    return img


def t_stencil():
    """Бок военного ящика 14x8: трафаретная звезда и полоса."""
    img = t_olive(292)
    for x, y in ((6, 1), (5, 2), (6, 2), (7, 2), (4, 2), (8, 2), (6, 3), (5, 4), (7, 4)):
        px(img, [(x, y)], hexc("#d8d0a0"))
    rect(img, 1, 6, 12, 6, hexc("#d8d0a0"))
    return img


def sulfur_from_gold(img):
    """Золотая руда -> сера: вкрапления переводим в лимонно-жёлтый."""
    out = img.copy()
    for y in range(16):
        for x in range(16):
            r, g, b, a = out.getpixel((x, y))
            if r > g + 18 and r > b + 40:  # тёплые (золотые) пиксели
                lum = (r + g + b) / 3
                k = min(1.25, max(0.55, lum / 150))
                out.putpixel((x, y), (int(min(255, 236 * k)), int(min(255, 214 * k)), int(60 * k), a))
    return out


# ---------------------------------------------------------------- геометрия
class Model:
    def __init__(self, name, tiles):
        self.name = name
        self.tiles = tiles  # имя -> Image 16x16 (до 16 штук)
        self.slot = {k: i for i, k in enumerate(tiles)}
        self.cubes = []

    def cube(self, origin, size, mat, faces=None):
        """mat — плитка для всех граней; faces — {грань: плитка} для отдельных граней."""
        self.cubes.append((origin, size, mat, faces or {}))
        return self

    def tile_uv(self, mat):
        i = self.slot[mat]
        return (i % 4) * 16, (i // 4) * 16

    def atlas(self):
        img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        for k, t in self.tiles.items():
            u, v = self.tile_uv(k)
            img.paste(t, (u, v))
        return img

    def geo(self):
        cubes = []
        for (ox, oy, oz), (sx, sy, sz), mat, faces in self.cubes:
            dims = {"north": (sx, sy), "south": (sx, sy), "east": (sz, sy), "west": (sz, sy), "up": (sx, sz), "down": (sx, sz)}
            uv = {}
            for f, (w, h) in dims.items():
                u, v = self.tile_uv(faces.get(f, mat))
                uv[f] = {"uv": [u, v], "uv_size": [min(w, 16), min(h, 16)]}
            cubes.append({"origin": [ox, oy, oz], "size": [sx, sy, sz], "uv": uv})
        return {
            "format_version": "1.12.0",
            "minecraft:geometry": [
                {
                    "description": {
                        "identifier": f"geometry.{self.name}",
                        "texture_width": 64,
                        "texture_height": 64,
                        "visible_bounds_width": 2,
                        "visible_bounds_height": 2.5,
                        "visible_bounds_offset": [0, 0.75, 0],
                    },
                    "bones": [{"name": "root", "pivot": [0, 0, 0], "cubes": cubes}],
                }
            ],
        }

    def bounds(self):
        lo = [min(c[0][i] for c in self.cubes) for i in range(3)]
        hi = [max(c[0][i] + c[1][i] for c in self.cubes) for i in range(3)]
        return lo, hi


# ---------------------------------------------------------------- модели
def m_c4():
    m = Model("rust_m_c4", {"body": t_c4_body(), "tape": t_tape(), "pad": t_c4_keypad(), "red": t_red(), "wire": t_wire()})
    m.cube([-5, 0, -3], [10, 4, 6], "body")
    for z in (-2.5, 1.0):  # две ленты-стяжки
        m.cube([-5.25, -0.01, z], [10.5, 4.26, 1.5], "tape")
    m.cube([-3, 4, -2], [6, 1, 4], "pad", {"up": "pad"})
    m.cube([3.5, 4, 1], [1, 1, 1], "red")  # мигающий диод
    m.cube([-4.5, 4, -0.5], [1, 0.5, 1], "wire")
    return m


def m_satchel():
    m = Model("rust_m_satchel", {"cloth": t_canvas(), "flap": t_canvas(True), "fuse": t_fuse(), "red": t_red()})
    m.cube([-4, 0, -3], [8, 6, 6], "cloth")
    m.cube([-4.25, 3.5, -3.25], [8.5, 2.75, 6.5], "flap")
    m.cube([-0.5, 6, -3], [1, 2, 1], "flap")
    m.cube([-0.5, 6, 2], [1, 2, 1], "flap")
    m.cube([-0.5, 8, -3], [1, 1, 6], "flap")  # ручка
    m.cube([2, 6, -1], [1, 3, 1], "fuse")
    m.cube([2, 9, -1], [1, 1, 1], "red")  # горящий фитиль
    return m


def m_tc():
    m = Model(
        "rust_m_tc",
        {"wood": t_planks(220), "dark": t_planks(221, True), "door": t_tc_door(), "metal": t_metal(), "red": t_red(), "tape": t_tape()},
    )
    for x, z in ((-6, -4), (4, -4), (-6, 2), (4, 2)):  # ножки
        m.cube([x, 0, z], [2, 1, 2], "dark")
    m.cube([-6, 1, -4], [12, 13, 8], "wood")
    m.cube([-6.5, 14, -4.5], [13, 1, 9], "dark")  # крышка
    m.cube([-5.5, 2, -4.4], [5.25, 11, 0.5], "door")
    m.cube([0.25, 2, -4.4], [5.25, 11, 0.5], "door")
    m.cube([-1.25, 7, -4.7], [0.75, 2, 0.4], "metal")  # ручки
    m.cube([0.5, 7, -4.7], [0.75, 2, 0.4], "metal")
    m.cube([-1.5, 10, -4.8], [3, 2, 0.5], "red")  # табличка-замок
    m.cube([-4, 15, -1], [6, 1, 2], "metal")  # киянка на крышке
    m.cube([2, 15, -2], [2, 2, 4], "tape")
    return m


def m_workbench(tier):
    top = {1: t_planks(300), 2: t_metal(301), 3: t_metal(302, True)}[tier]
    leg = {1: t_planks(303, True), 2: t_metal(304, True), 3: t_metal(305, True)}[tier]
    tiles = {"top": top, "leg": leg, "apron": t_numeral(tier), "vise": t_metal(306), "tape": t_tape(), "red": t_red()}
    if tier == 3:
        tiles["hazard"] = t_hazard()
    m = Model(f"rust_m_wb{tier}", tiles)
    for x, z in ((-7, -7), (5, -7), (-7, 5), (5, 5)):
        m.cube([x, 0, z], [2, 12, 2], "leg")
    m.cube([-7, 3, -7], [14, 1, 14], "leg")  # нижняя полка
    m.cube([-8, 12, -8], [16, 2, 16], "top")
    m.cube([-7, 8, -7.5], [14, 4, 0.5], "apron")  # фартук с уровнем верстака
    m.cube([3, 14, -6], [3, 2, 3], "vise")  # тиски
    m.cube([3.5, 16, -5.5], [2, 1, 2], "tape")
    m.cube([-6, 14, 1], [6, 1, 1], "vise")  # гаечный ключ
    m.cube([-6, 14, 0], [1, 1, 3], "vise")
    if tier >= 2:
        m.cube([-7, 4, -6], [5, 4, 4], "tape")  # ящик с деталями на полке
    if tier == 3:
        m.cube([-7, 8, 7.5], [14, 4, 0.5], "hazard")  # задний щит с разметкой
        m.cube([1, 14, 3], [5, 4, 1], "tape")  # монитор
        m.cube([1.5, 14.5, 2.9], [4, 3, 0.2], "red")
    return m


def m_recycler():
    m = Model("rust_m_recycler", {"g": t_green(), "gd": t_green(261, True), "hole": t_dark(), "metal": t_metal(), "red": t_red(), "tape": t_tape()})
    m.cube([-7, 0, -7], [14, 11, 14], "g")
    m.cube([-6, 11, -6], [12, 3, 12], "gd", {"up": "hole"})  # бункер загрузки
    m.cube([-7, 14, -7], [14, 1, 2], "gd")
    m.cube([-7, 14, 5], [14, 1, 2], "gd")
    m.cube([-4, 1, -8.5], [8, 3, 1.5], "metal", {"up": "hole"})  # лоток выдачи
    m.cube([-5.5, 7, -7.3], [3, 2, 0.4], "tape")  # панель
    m.cube([-5, 7.5, -7.4], [1, 1, 0.2], "red")
    m.cube([2, 6, -7.25], [4, 4, 0.3], "metal")  # шестерня-люк
    return m


def m_barrel():
    m = Model("rust_m_barrel", {"b": t_barrel(), "rim": t_barrel_rim(), "top": t_barrel_top()})
    # «восьмиугольник»: центр + две пластины чуть ниже, чтобы крышки не мерцали
    m.cube([-5, 0, -5], [10, 14, 10], "b", {"up": "top", "down": "rim"})
    m.cube([-6, 0, -3], [12, 13.98, 6], "b", {"up": "top", "down": "rim"})
    m.cube([-3, 0, -6], [6, 13.98, 12], "b", {"up": "top", "down": "rim"})
    for y in (2, 11):
        m.cube([-6.25, y, -4.25], [12.5, 1, 8.5], "rim")
        m.cube([-4.25, y, -6.25], [8.5, 1, 12.5], "rim")
    return m


def m_crate():
    m = Model("rust_m_crate", {"o": t_olive(), "od": t_olive(291, True), "st": t_stencil(), "metal": t_metal()})
    m.cube([-7, 0, -5], [14, 8, 10], "o", {"north": "st", "south": "st"})
    m.cube([-7.25, 8, -5.25], [14.5, 1.5, 10.5], "od")
    m.cube([-8, 4, -1.5], [1, 1, 3], "metal")  # ручки
    m.cube([7, 4, -1.5], [1, 1, 3], "metal")
    m.cube([-4, 6.5, -5.5], [1.5, 2.5, 0.5], "metal")  # защёлки
    m.cube([2.5, 6.5, -5.5], [1.5, 2.5, 0.5], "metal")
    return m


def m_node(name, tex):
    m = Model(name, {"s": tex})
    m.cube([-6, 0, -5], [12, 7, 10], "s")
    m.cube([-4, 7, -3], [8, 3, 7], "s")
    m.cube([-7.5, 0, -2], [2, 4, 5], "s")
    m.cube([5.5, 0, -3.5], [2, 5, 4], "s")
    m.cube([-2, 0, 4.5], [5, 4, 2.5], "s")
    m.cube([-1, 10, -1], [3, 1.5, 3], "s")
    return m


# ---------------------------------------------------------------- превью
def render(model, scale=14):
    """Изометрическое превью с северо-востока (видны верх, север и восток)."""
    atlas = model.atlas()
    c, s = math.cos(math.radians(30)), 0.5

    def proj(x, y, z):
        z = -z
        return ((x - z) * c * scale, ((x + z) * s - y) * scale)

    faces = []
    for (ox, oy, oz), (sx, sy, sz), mat, fmap in model.cubes:
        x0, y0, z0, x1, y1, z1 = ox, oy, oz, ox + sx, oy + sy, oz + sz
        # координаты передаём через аргументы по умолчанию, иначе лямбды увидят последний кубик
        spec = {
            "up": (lambda a, b, x0=x0, y1=y1, z1=z1: (x0 + a, y1, z1 - b), sx, sz, 1.0, (x0 + x1) / 2 - (z0 + z1) / 2 + y1),
            "north": (lambda a, b, x1=x1, y1=y1, z0=z0: (x1 - a, y1 - b, z0), sx, sy, 0.82, (x0 + x1) / 2 - z0 + (y0 + y1) / 2),
            "east": (lambda a, b, x1=x1, y1=y1, z0=z0: (x1, y1 - b, z0 + a), sz, sy, 0.66, x1 - (z0 + z1) / 2 + (y0 + y1) / 2),
        }
        for f, (fn, w, h, light, depth) in spec.items():
            faces.append((depth, fn, w, h, light, fmap.get(f, mat)))
    faces.sort(key=lambda t: t[0])
    pts = []
    for _, fn, w, h, *_ in faces:
        for a, b in ((0, 0), (w, 0), (0, h), (w, h)):
            pts.append(proj(*fn(a, b)))
    minx, miny = min(p[0] for p in pts), min(p[1] for p in pts)
    maxx, maxy = max(p[0] for p in pts), max(p[1] for p in pts)
    pad = 10
    img = Image.new("RGBA", (int(maxx - minx) + 2 * pad, int(maxy - miny) + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for _, fn, w, h, light, mat in faces:
        u0, v0 = model.tile_uv(mat)
        for j in range(math.ceil(h)):
            for i in range(math.ceil(w)):
                r, g, b, a = atlas.getpixel((u0 + min(i, 15), v0 + min(j, 15)))
                if a < 128:
                    continue
                a1, b1 = min(i + 1, w), min(j + 1, h)
                quad = [fn(i, j), fn(a1, j), fn(a1, b1), fn(i, b1)]
                poly = [(p[0] - minx + pad, p[1] - miny + pad) for p in map(lambda q: proj(*q), quad)]
                d.polygon(poly, fill=(int(r * light), int(g * light), int(b * light), 255))
    return img


# ---------------------------------------------------------------- запись
def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def patch_block(block_id, model, collision=True):
    path = os.path.join(BP, "blocks", block_id + ".json")
    data = json.load(open(path, encoding="utf-8"))
    comps = data["minecraft:block"]["components"]
    comps["minecraft:geometry"] = f"geometry.{model.name}"
    comps["minecraft:material_instances"] = {"*": {"texture": model.name, "render_method": "alpha_test"}}
    comps["minecraft:light_dampening"] = 0
    lo, hi = model.bounds()
    # коллизия и выделение внутри блока: [-8..8] x [0..16]
    o = [max(-8, lo[0]), max(0, lo[1]), max(-8, lo[2])]
    e = [min(8, hi[0]), min(16, hi[1]), min(8, hi[2])]
    box = {"origin": o, "size": [round(e[i] - o[i], 3) for i in range(3)]}
    comps["minecraft:selection_box"] = box
    comps["minecraft:collision_box"] = box if collision else False
    write_json(path, data)


def main():
    preview_dir = sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None
    stone = pp("default_stone")
    models = {
        "c4_planted": m_c4(),
        "satchel_planted": m_satchel(),
        "tool_cupboard": m_tc(),
        "workbench_1": m_workbench(1),
        "workbench_2": m_workbench(2),
        "workbench_3": m_workbench(3),
        "recycler": m_recycler(),
        "loot_barrel": m_barrel(),
        "loot_crate": m_crate(),
        "stone_node": m_node("rust_m_stone_node", stone),
        "metal_node": m_node("rust_m_metal_node", pp("mcl_core_iron_ore")),
        "sulfur_node": m_node("rust_m_sulfur_node", sulfur_from_gold(pp("mcl_core_gold_ore"))),
    }
    terrain_path = os.path.join(RP, "textures", "terrain_texture.json")
    terrain = json.load(open(terrain_path, encoding="utf-8"))
    for block_id, model in models.items():
        model.atlas().save(os.path.join(RP, "textures", "blocks", model.name + ".png"))
        write_json(os.path.join(RP, "models", "blocks", model.name + ".geo.json"), model.geo())
        terrain["texture_data"][model.name] = {"textures": f"textures/blocks/{model.name}"}
        patch_block(block_id, model)
    write_json(terrain_path, terrain)

    # Pixel Perfection: каменная стена и ванильная железная дверь/люк
    pp("default_stone_brick").save(os.path.join(RP, "textures", "blocks", "rust_build_stone.png"))
    pp("mcl_doors_door_iron_lower").save(os.path.join(RP, "textures", "blocks", "door_iron_lower.png"))
    pp("mcl_doors_door_iron_upper").save(os.path.join(RP, "textures", "blocks", "door_iron_upper.png"))
    pp("doors_trapdoor_steel").save(os.path.join(RP, "textures", "blocks", "iron_trapdoor.png"))
    # иконка двери: две половины, ужатые в 16x16
    door = Image.new("RGBA", (16, 32))
    door.paste(pp("mcl_doors_door_iron_upper"), (0, 0))
    door.paste(pp("mcl_doors_door_iron_lower"), (0, 16))
    icon = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    icon.paste(door.resize((8, 16), Image.NEAREST), (4, 0))
    os.makedirs(os.path.join(RP, "textures", "items"), exist_ok=True)
    icon.save(os.path.join(RP, "textures", "items", "door_iron.png"))

    if preview_dir:
        os.makedirs(preview_dir, exist_ok=True)
        for block_id, model in models.items():
            render(model).save(os.path.join(preview_dir, block_id + ".png"))
    for block_id, model in models.items():
        lo, hi = model.bounds()
        print(f"{block_id:16} кубиков: {len(model.cubes):2}  размер: {[round(hi[i] - lo[i], 2) for i in range(3)]}")


if __name__ == "__main__":
    main()
