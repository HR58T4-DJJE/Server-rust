#!/usr/bin/env python3
"""Генератор пиксельных текстур 16x16 для ресурс-пака RustCraft.

Запуск:  python3 tools/gen_textures.py
Перезаписывает PNG в packs/RustCraft_RP/textures/{blocks,items} и pack_icon.png.
Нужен Pillow (pip install pillow). Рисунки детерминированные (фиксированный seed).
"""
import os
import random
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "packs")
RP = os.path.join(ROOT, "RustCraft_RP")
BP = os.path.join(ROOT, "RustCraft_BP")
BLOCKS = os.path.join(RP, "textures", "blocks")
ITEMS = os.path.join(RP, "textures", "items")

T = (0, 0, 0, 0)


def hexc(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (c[3],)


def new():
    return Image.new("RGBA", (16, 16), T)


def noise_fill(img, palette, seed, box=(0, 0, 16, 16)):
    rnd = random.Random(seed)
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        for x in range(x0, x1):
            img.putpixel((x, y), hexc(rnd.choice(palette)))


def rect(img, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= x < 16 and 0 <= y < 16:
                img.putpixel((x, y), c)


def px(img, pts, c):
    for x, y in pts:
        if 0 <= x < 16 and 0 <= y < 16:
            img.putpixel((x, y), c)


def line(img, x0, y0, x1, y1, c):
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        if 0 <= x0 < 16 and 0 <= y0 < 16:
            img.putpixel((x0, y0), c)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def blob(img, cx, cy, r, palette, seed, outline=None):
    rnd = random.Random(seed)
    for y in range(16):
        for x in range(16):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if d <= r + rnd.uniform(-0.4, 0.4):
                img.putpixel((x, y), hexc(rnd.choice(palette)))
    if outline:
        add_outline(img, hexc(outline))


def add_outline(img, c):
    src = img.copy()
    for y in range(16):
        for x in range(16):
            if src.getpixel((x, y))[3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < 16 and 0 <= ny < 16 and src.getpixel((nx, ny))[3] > 0:
                        img.putpixel((x, y), c)
                        break


def flecks(img, colors, n, seed, box=(1, 1, 14, 14), size=2):
    rnd = random.Random(seed)
    for _ in range(n):
        x = rnd.randint(box[0], box[2])
        y = rnd.randint(box[1], box[3])
        c = hexc(rnd.choice(colors))
        px(img, [(x, y)], c)
        if size > 1:
            px(img, [(x + 1, y)], shade(c, 0.8))
            if rnd.random() < 0.5:
                px(img, [(x, y + 1)], shade(c, 0.7))


def border(img, c, w=1):
    for i in range(w):
        rect(img, i, i, 15 - i, i, c)
        rect(img, i, 15 - i, 15 - i, 15 - i, c)
        rect(img, i, i, i, 15 - i, c)
        rect(img, 15 - i, i, 15 - i, 15 - i, c)


STONE = ["#7d7d7d", "#747474", "#868686", "#6b6b6b", "#8f8f8f"]
DARKSTONE = ["#5e5b58", "#56524f", "#67625e", "#4d4a47"]
WOOD = ["#8a6239", "#7f5832", "#94693e", "#76512e"]
PLANK = ["#a27848", "#9a7043", "#ab8050"]
METAL = ["#9aa1a6", "#8d9499", "#a6adb2", "#868c90"]


# ---------------------------------------------------------------- блоки
def node(base_pal, fleck, seed):
    img = new()
    noise_fill(img, base_pal, seed)
    # трещины
    rnd = random.Random(seed + 1)
    for _ in range(3):
        x, y = rnd.randint(1, 14), rnd.randint(1, 14)
        line(img, x, y, x + rnd.randint(-3, 3), y + rnd.randint(1, 4), hexc("#3f3c3a"))
    flecks(img, fleck, 9, seed + 2)
    return img


def tool_cupboard_side():
    img = new()
    noise_fill(img, PLANK, 11)
    border(img, hexc("#4a3420"))
    rect(img, 7, 1, 8, 14, hexc("#4a3420"))  # створки
    rect(img, 1, 5, 14, 5, hexc("#5a3f26"))
    rect(img, 1, 10, 14, 10, hexc("#5a3f26"))
    px(img, [(6, 7), (9, 7)], hexc("#c9c9c9"))  # ручки
    # красный знак "шкафа"
    rect(img, 2, 2, 5, 3, hexc("#b33a2e"))
    return img


def tool_cupboard_front():
    img = tool_cupboard_side()
    # инструменты на дверце: молоток и гаечный ключ
    line(img, 10, 2, 13, 4, hexc("#8a8f93"))
    line(img, 11, 3, 11, 9, hexc("#6b4a2a"))
    px(img, [(3, 12), (4, 12), (12, 12), (13, 12)], hexc("#d0b040"))  # замок
    return img


def tool_cupboard_top():
    img = new()
    noise_fill(img, PLANK, 12)
    border(img, hexc("#4a3420"))
    for y in (4, 8, 12):
        rect(img, 1, y, 14, y, hexc("#7a5631"))
    return img


def workbench_top(level):
    img = new()
    noise_fill(img, PLANK if level == 1 else METAL, 20 + level)
    border(img, hexc("#3b2a19" if level == 1 else "#4b5054"))
    # инструменты на столешнице
    line(img, 3, 3, 8, 8, hexc("#55595c"))
    line(img, 3, 8, 6, 5, hexc("#6b4a2a"))
    rect(img, 10, 10, 12, 12, hexc("#b33a2e"))
    return img


def workbench_side(level):
    img = new()
    top = PLANK if level == 1 else METAL
    noise_fill(img, top, 30 + level, (0, 0, 16, 4))
    noise_fill(img, ["#3d3d3d", "#353535", "#444444"], 31 + level, (0, 4, 16, 16))
    rect(img, 1, 4, 2, 15, hexc("#6b6f72"))
    rect(img, 13, 4, 14, 15, hexc("#6b6f72"))
    rect(img, 0, 3, 15, 3, hexc("#2a2a2a"))
    # римская цифра уровня
    marks = {1: [7], 2: [6, 9], 3: [5, 7, 9]}[level]
    for m in marks:
        rect(img, m, 7, m, 12, hexc("#e0c040"))
    return img


def sleeping_bag():
    img = new()
    noise_fill(img, ["#5d6b3a", "#566336", "#64723f"], 40)
    rect(img, 0, 0, 15, 4, hexc("#8f8467"))  # подушка/капюшон
    noise_fill(img, ["#958a6c", "#8a7f62"], 41, (1, 1, 15, 4))
    for x in range(1, 15, 3):
        rect(img, x, 6, x, 15, hexc("#4b5730"))
    rect(img, 7, 5, 8, 15, hexc("#3a4325"))  # молния
    return img


def recycler(face):
    img = new()
    noise_fill(img, ["#4f7a3a", "#4a7236", "#56823f"], 50)
    border(img, hexc("#2d4521"))
    if face == "front":
        rect(img, 3, 3, 12, 8, hexc("#1d1d1d"))  # окно загрузки
        rect(img, 4, 4, 11, 7, hexc("#2b2b2b"))
        px(img, [(5, 11), (6, 11)], hexc("#3fd04a"))  # лампочка
        px(img, [(9, 11), (10, 11)], hexc("#d04a3f"))
    else:
        # шестерня
        for (x, y) in [(7, 4), (8, 4), (4, 7), (4, 8), (11, 7), (11, 8), (7, 11), (8, 11)]:
            px(img, [(x, y)], hexc("#a0a6aa"))
        rect(img, 5, 5, 10, 10, hexc("#8a9094"))
        rect(img, 7, 7, 8, 8, hexc("#2d4521"))
    return img


def barrel_side():
    img = new()
    noise_fill(img, ["#2f5d8f", "#2b5786", "#346599"], 60)
    for y in (2, 13):
        rect(img, 0, y, 15, y, hexc("#1d3a5a"))
    rect(img, 0, 7, 15, 8, hexc("#7c1f1f"))  # ржавая полоса
    flecks(img, ["#8a4b22", "#a35a2a"], 5, 61, size=1)
    return img


def barrel_top():
    img = new()
    noise_fill(img, ["#2f5d8f", "#2b5786"], 62)
    border(img, hexc("#1d3a5a"))
    rect(img, 10, 3, 12, 5, hexc("#1d3a5a"))  # пробка
    return img


def crate(face):
    img = new()
    noise_fill(img, ["#4e5a2f", "#4a552c", "#556233"], 70)
    border(img, hexc("#2f361b"))
    if face == "side":
        rect(img, 1, 7, 14, 8, hexc("#2f361b"))
        rect(img, 5, 3, 10, 5, hexc("#d8d0a0"))  # трафаретная надпись
        px(img, [(6, 4), (8, 4)], hexc("#2f361b"))
        rect(img, 2, 10, 3, 12, hexc("#8a8f93"))  # защёлки
        rect(img, 12, 10, 13, 12, hexc("#8a8f93"))
    else:
        line(img, 1, 1, 14, 14, hexc("#2f361b"))
        line(img, 14, 1, 1, 14, hexc("#2f361b"))
    return img


def twig():
    img = new()  # прозрачный каркас из веток
    stick = ["#9b7a4a", "#8a6a3e", "#a8865a"]
    rnd = random.Random(80)
    for (x0, y0, x1, y1) in [(0, 0, 15, 0), (0, 15, 15, 15), (0, 0, 0, 15), (15, 0, 15, 15),
                             (0, 0, 15, 15), (15, 0, 0, 15), (0, 7, 15, 8)]:
        line(img, x0, y0, x1, y1, hexc(rnd.choice(stick)))
    return img


def wood_wall():
    img = new()
    noise_fill(img, WOOD, 90)
    for x in (0, 5, 10, 15):
        rect(img, x, 0, x, 15, hexc("#4f3620"))
    for y in (3, 12):
        rect(img, 0, y, 15, y, hexc("#5e4127"))
    px(img, [(2, 3), (7, 3), (12, 3), (2, 12), (7, 12), (12, 12)], hexc("#3a3a3a"))  # гвозди
    return img


def stone_wall():
    img = new()
    noise_fill(img, STONE, 100)
    mortar = hexc("#5a5a5a")
    for y in (0, 5, 10, 15):
        rect(img, 0, y, 15, y, mortar)
    for row, y0 in enumerate((1, 6, 11)):
        off = 0 if row % 2 == 0 else 4
        for x in range(off, 16, 8):
            rect(img, x, y0, x, min(y0 + 3, 15), mortar)
    return img


def sheet_metal():
    img = new()
    rnd = random.Random(110)
    for x in range(16):
        base = ["#8c9296", "#7d8387", "#9aa0a4", "#858b8f"][x % 4]
        for y in range(16):
            c = hexc(base)
            if rnd.random() < 0.12:
                c = hexc(rnd.choice(["#8a4b22", "#a0582a", "#6e3a1a"]))  # ржавчина
            img.putpixel((x, y), c)
    border(img, hexc("#5a5f63"))
    px(img, [(2, 2), (13, 2), (2, 13), (13, 13), (7, 2), (7, 13)], hexc("#d0d4d6"))  # заклёпки
    return img


def armored():
    img = new()
    noise_fill(img, ["#3c4044", "#373b3f", "#42464a"], 120)
    rect(img, 0, 7, 15, 8, hexc("#24272a"))
    rect(img, 7, 0, 8, 15, hexc("#24272a"))
    border(img, hexc("#24272a"))
    for (x, y) in [(2, 2), (12, 2), (2, 12), (12, 12), (2, 5), (12, 5), (5, 2), (10, 12)]:
        rect(img, x, y, x + 1, y + 1, hexc("#9aa0a4"))
    return img


def c4_planted():
    img = new()
    noise_fill(img, ["#d6d0b8", "#ccc6ae", "#ddd7c0"], 130)
    border(img, hexc("#55595c"))
    rect(img, 4, 4, 11, 8, hexc("#1d1d1d"))
    rect(img, 5, 5, 10, 7, hexc("#b32020"))  # таймер
    line(img, 2, 11, 13, 11, hexc("#c02020"))
    line(img, 2, 13, 13, 13, hexc("#2050c0"))
    return img


def satchel_planted():
    img = new()
    noise_fill(img, ["#7a5a34", "#715330", "#836139"], 140)
    border(img, hexc("#4a3420"))
    rect(img, 1, 1, 14, 5, hexc("#5e4427"))
    rect(img, 7, 0, 8, 2, hexc("#e0c040"))  # фитиль
    return img


# ---------------------------------------------------------------- предметы
def it_wood():
    img = new()
    for cx, cy in ((5, 10), (11, 10), (8, 5)):
        blob(img, cx, cy, 3, ["#8a6239", "#94693e"], cx * cy)
        px(img, [(cx, cy)], hexc("#c49a62"))
        px(img, [(cx + 1, cy), (cx, cy - 1)], hexc("#b08650"))
    add_outline(img, hexc("#3b2a19"))
    return img


def it_stones():
    img = new()
    blob(img, 5, 10, 3, STONE, 1)
    blob(img, 11, 11, 2.6, STONE, 2)
    blob(img, 8, 5, 2.6, STONE, 3)
    add_outline(img, hexc("#3d3d3d"))
    return img


def it_ore(base, fleck, seed):
    img = new()
    blob(img, 8, 8, 5.5, base, seed)
    flecks(img, fleck, 6, seed + 1, (4, 4, 11, 11))
    add_outline(img, hexc("#2e2b29"))
    return img


def it_fragments():
    img = new()
    for pts in ([(3, 9), (6, 6), (8, 10)], [(9, 3), (13, 5), (10, 8)], [(9, 11), (13, 10), (12, 14)]):
        (ax, ay), (bx, by), (cx, cy) = pts
        for y in range(16):
            for x in range(16):
                d1 = (x - bx) * (ay - by) - (ax - bx) * (y - by)
                d2 = (x - cx) * (by - cy) - (bx - cx) * (y - cy)
                d3 = (x - ax) * (cy - ay) - (cx - ax) * (y - ay)
                if (d1 <= 0 and d2 <= 0 and d3 <= 0) or (d1 >= 0 and d2 >= 0 and d3 >= 0):
                    img.putpixel((x, y), hexc(random.Random(x * 31 + y).choice(METAL)))
    add_outline(img, hexc("#45494c"))
    px(img, [(6, 7), (10, 5), (12, 11)], hexc("#e6eaec"))
    return img


def it_sulfur():
    img = new()
    rnd = random.Random(5)
    for y in range(7, 15):
        half = (y - 6)
        for x in range(8 - half, 8 + half):
            if 0 <= x < 16:
                img.putpixel((x, y), hexc(rnd.choice(["#e6d23a", "#d8c32e", "#f0de4a", "#c9b42a"])))
    add_outline(img, hexc("#7a6a10"))
    return img


def it_hqm():
    img = new()
    rect(img, 2, 7, 13, 11, hexc("#6f8fa8"))
    rect(img, 4, 5, 11, 6, hexc("#9ab8cf"))
    rect(img, 3, 7, 12, 7, hexc("#b8d2e4"))
    rect(img, 2, 11, 13, 11, hexc("#4d6a80"))
    add_outline(img, hexc("#2c3d4a"))
    return img


def it_cloth():
    img = new()
    rect(img, 2, 4, 13, 12, hexc("#cdbf9a"))
    for y in (6, 9):
        rect(img, 2, y, 13, y, hexc("#b3a580"))
    rect(img, 2, 12, 13, 12, hexc("#9c8f6c"))
    add_outline(img, hexc("#5e5640"))
    return img


def it_scrap():
    img = new()
    rect(img, 2, 8, 7, 12, hexc("#8a4b22"))
    rect(img, 6, 4, 11, 9, hexc("#7d8387"))
    rect(img, 9, 9, 13, 13, hexc("#a0582a"))
    px(img, [(3, 9), (7, 5), (10, 10), (12, 12)], hexc("#c9c9c9"))
    add_outline(img, hexc("#3a2414"))
    return img


def it_pipe():
    img = new()
    for i in range(10):
        rect(img, 3 + i, 11 - i, 4 + i, 12 - i, hexc("#8d9499"))
        px(img, [(3 + i, 11 - i)], hexc("#c3c8cb"))
    rect(img, 2, 12, 4, 13, hexc("#5a5f63"))
    rect(img, 12, 2, 13, 4, hexc("#5a5f63"))
    add_outline(img, hexc("#33373a"))
    return img


def it_gears():
    img = new()
    blob(img, 8, 8, 4.5, ["#8d9499", "#9aa1a6"], 7)
    for (x, y) in [(7, 1), (8, 1), (7, 14), (8, 14), (1, 7), (1, 8), (14, 7), (14, 8),
                   (3, 3), (12, 3), (3, 12), (12, 12)]:
        rect(img, x, y, x, y + 1, hexc("#8d9499"))
    rect(img, 7, 7, 8, 8, T)
    add_outline(img, hexc("#33373a"))
    return img


def it_spring():
    img = new()
    for i, y in enumerate(range(3, 14, 2)):
        x0, x1 = (4, 11) if i % 2 == 0 else (11, 4)
        line(img, x0, y, x1, y + 2, hexc("#a6adb2"))
    add_outline(img, hexc("#33373a"))
    return img


def it_explosives():
    img = new()
    for x in (3, 7, 11):
        rect(img, x, 5, x + 2, 13, hexc("#b33a2e"))
        rect(img, x, 5, x, 13, hexc("#d4574a"))
    rect(img, 3, 8, 13, 9, hexc("#3a3a3a"))
    line(img, 8, 5, 10, 1, hexc("#c9b42a"))
    add_outline(img, hexc("#4a1410"))
    return img


def it_rock():
    img = new()
    blob(img, 8, 9, 5, STONE, 9)
    px(img, [(6, 7), (7, 6), (9, 8)], hexc("#a5a5a5"))
    add_outline(img, hexc("#3d3d3d"))
    return img


def tool(head, kind, seed):
    img = new()
    line(img, 3, 14, 11, 6, hexc("#6b4a2a"))
    line(img, 4, 14, 12, 6, hexc("#8a6239"))
    if kind == "axe":
        rect(img, 9, 2, 13, 6, hexc(head[0]))
        rect(img, 12, 1, 14, 8, hexc(head[1]))
    elif kind == "pick":
        line(img, 5, 3, 13, 10, hexc(head[0]))
        line(img, 6, 3, 14, 10, hexc(head[1]))
        px(img, [(4, 3), (14, 11)], hexc(head[1]))
    elif kind == "hammer":
        rect(img, 8, 2, 14, 7, hexc("#9a7043"))
        rect(img, 8, 2, 14, 2, hexc("#b88a58"))
    elif kind == "spear":
        img = new()
        line(img, 2, 14, 12, 4, hexc("#8a6239"))
        line(img, 3, 14, 13, 4, hexc("#6b4a2a"))
        rect(img, 12, 1, 14, 3, hexc("#c49a62"))
        px(img, [(15, 0)], hexc("#c49a62"))
    add_outline(img, hexc("#2a1d10"))
    return img


def it_book():
    img = new()
    rect(img, 3, 2, 12, 13, hexc("#7c3a2a"))
    rect(img, 4, 3, 12, 12, hexc("#9c4a36"))
    rect(img, 12, 3, 13, 13, hexc("#e8e0c8"))
    blob(img, 8, 7, 2.3, ["#e0c040"], 3)
    px(img, [(8, 7)], hexc("#9c4a36"))
    add_outline(img, hexc("#3a1a12"))
    return img


def gun(kind):
    img = new()
    dark, mid, wood = hexc("#3a3d40"), hexc("#5a5f63"), hexc("#7a5631")
    if kind == "revolver":
        rect(img, 4, 5, 14, 6, mid)  # ствол
        rect(img, 4, 4, 5, 4, dark)
        rect(img, 3, 5, 8, 8, dark)  # барабан
        rect(img, 4, 6, 7, 7, mid)
        rect(img, 2, 8, 5, 13, wood)  # рукоять
        px(img, [(6, 9), (7, 10)], dark)  # спуск
    elif kind == "shotgun":
        rect(img, 5, 6, 15, 7, mid)
        rect(img, 5, 5, 15, 5, hexc("#8d9499"))
        rect(img, 0, 7, 6, 9, wood)
        rect(img, 0, 9, 2, 11, wood)
        rect(img, 8, 8, 11, 9, hexc("#8a4b22"))  # проволока
    elif kind == "sar":
        rect(img, 4, 6, 15, 7, dark)
        rect(img, 1, 7, 9, 9, wood)
        rect(img, 0, 9, 2, 11, wood)
        rect(img, 7, 9, 8, 12, dark)  # магазин
        rect(img, 5, 4, 8, 5, mid)  # прицел
    add_outline(img, hexc("#151617"))
    return img


def ammo(color, n):
    img = new()
    xs = [3, 7, 11][:n]
    for x in xs:
        rect(img, x, 6, x + 2, 13, hexc(color))
        rect(img, x, 6, x, 13, shade(hexc(color), 1.2))
        rect(img, x, 3, x + 2, 5, hexc("#b87333"))
        px(img, [(x + 1, 2)], hexc("#b87333"))
    add_outline(img, hexc("#2a1d10"))
    return img


def it_bandage():
    img = new()
    blob(img, 7, 8, 5, ["#f0ece0", "#e6e0d0"], 4)
    blob(img, 7, 8, 2, ["#c9c0aa"], 5)
    rect(img, 11, 9, 14, 12, hexc("#f0ece0"))
    px(img, [(12, 10)], hexc("#c03030"))
    add_outline(img, hexc("#6a6455"))
    return img


def it_syringe():
    img = new()
    for i in range(9):
        rect(img, 3 + i, 11 - i, 4 + i, 12 - i, hexc("#d8eef0"))
    for i in range(2, 7):
        px(img, [(3 + i, 11 - i)], hexc("#d03030"))
    line(img, 12, 3, 14, 1, hexc("#c9c9c9"))
    rect(img, 1, 12, 3, 14, hexc("#3a8ad0"))
    add_outline(img, hexc("#33373a"))
    return img


def it_c4():
    img = new()
    rect(img, 2, 4, 13, 12, hexc("#d6d0b8"))
    rect(img, 4, 6, 11, 9, hexc("#1d1d1d"))
    rect(img, 5, 7, 10, 8, hexc("#b32020"))
    line(img, 2, 11, 13, 11, hexc("#c02020"))
    add_outline(img, hexc("#33373a"))
    return img


def it_satchel():
    img = new()
    rect(img, 3, 5, 12, 13, hexc("#7a5a34"))
    rect(img, 3, 5, 12, 8, hexc("#5e4427"))
    rect(img, 6, 2, 9, 4, hexc("#4a3420"))
    line(img, 10, 4, 13, 1, hexc("#e0c040"))
    add_outline(img, hexc("#2a1d10"))
    return img


def item_from_block(face_img, top_img=None):
    """Изометрическая иконка блока не нужна — Bedrock рисует её сам. Оставлено для pack_icon."""
    return face_img


def pack_icon():
    big = Image.new("RGBA", (64, 64), hexc("#2b2b2b"))
    tiles = [sheet_metal(), stone_wall(), node(STONE, ["#e6d23a", "#f0de4a"], 7), tool_cupboard_front()]
    for i, t in enumerate(tiles):
        big.paste(t.resize((32, 32), Image.NEAREST), ((i % 2) * 32, (i // 2) * 32))
    return big.resize((256, 256), Image.NEAREST)


def main():
    os.makedirs(BLOCKS, exist_ok=True)
    os.makedirs(ITEMS, exist_ok=True)
    blocks = {
        "rust_stone_node": node(STONE, ["#9a9a9a", "#b0b0b0"], 1),
        "rust_metal_node": node(DARKSTONE, ["#b0703a", "#c98447", "#8a5a30"], 2),
        "rust_sulfur_node": node(STONE, ["#e6d23a", "#f0de4a", "#c9b42a"], 3),
        "rust_tc_side": tool_cupboard_side(),
        "rust_tc_front": tool_cupboard_front(),
        "rust_tc_top": tool_cupboard_top(),
        "rust_wb1_top": workbench_top(1), "rust_wb1_side": workbench_side(1),
        "rust_wb2_top": workbench_top(2), "rust_wb2_side": workbench_side(2),
        "rust_wb3_top": workbench_top(3), "rust_wb3_side": workbench_side(3),
        "rust_sleeping_bag": sleeping_bag(),
        "rust_recycler_front": recycler("front"), "rust_recycler_side": recycler("side"),
        "rust_barrel_side": barrel_side(), "rust_barrel_top": barrel_top(),
        "rust_crate_side": crate("side"), "rust_crate_top": crate("top"),
        "rust_build_twig": twig(), "rust_build_wood": wood_wall(), "rust_build_stone": stone_wall(),
        "rust_build_metal": sheet_metal(), "rust_build_armored": armored(),
        "rust_c4_planted": c4_planted(), "rust_satchel_planted": satchel_planted(),
    }
    items = {
        "rust_wood": it_wood(), "rust_stones": it_stones(),
        "rust_metal_ore": it_ore(DARKSTONE, ["#b0703a", "#c98447"], 11),
        "rust_metal_fragments": it_fragments(),
        "rust_sulfur_ore": it_ore(STONE, ["#e6d23a", "#f0de4a"], 12),
        "rust_sulfur": it_sulfur(),
        "rust_hqm_ore": it_ore(DARKSTONE, ["#9ab8cf", "#c8e0f0"], 13),
        "rust_hqm": it_hqm(), "rust_cloth": it_cloth(), "rust_scrap": it_scrap(),
        "rust_metal_pipe": it_pipe(), "rust_gears": it_gears(), "rust_metal_spring": it_spring(),
        "rust_explosives": it_explosives(), "rust_rock": it_rock(),
        "rust_stone_hatchet": tool(("#7d7d7d", "#9a9a9a"), "axe", 1),
        "rust_stone_pickaxe": tool(("#7d7d7d", "#9a9a9a"), "pick", 2),
        "rust_metal_hatchet": tool(("#8d9499", "#c3c8cb"), "axe", 3),
        "rust_metal_pickaxe": tool(("#8d9499", "#c3c8cb"), "pick", 4),
        "rust_hammer": tool(None, "hammer", 5),
        "rust_wooden_spear": tool(None, "spear", 6),
        "rust_craft_book": it_book(),
        "rust_revolver": gun("revolver"), "rust_pipe_shotgun": gun("shotgun"), "rust_sar": gun("sar"),
        "rust_pistol_ammo": ammo("#c9a040", 3), "rust_handmade_shell": ammo("#b03030", 2),
        "rust_rifle_ammo": ammo("#a08a30", 3),
        "rust_bandage": it_bandage(), "rust_syringe": it_syringe(),
        "rust_c4": it_c4(), "rust_satchel_charge": it_satchel(),
    }
    for name, img in blocks.items():
        img.save(os.path.join(BLOCKS, name + ".png"))
    for name, img in items.items():
        img.save(os.path.join(ITEMS, name + ".png"))
    icon = pack_icon()
    icon.save(os.path.join(RP, "pack_icon.png"))
    icon.save(os.path.join(BP, "pack_icon.png"))
    print(f"blocks: {len(blocks)}, items: {len(items)}")


if __name__ == "__main__":
    main()
