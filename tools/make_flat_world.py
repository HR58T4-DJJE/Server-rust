#!/usr/bin/env python3
"""Делает шаблон level.dat плоского мира RustCraft: server/worlds/RustCraft/level.dat

Bedrock-сервер не умеет выбирать тип мира в server.properties, поэтому кладём готовый level.dat:
Generator=2 (плоский), биом «равнины», слои: бедрок, 120 камня, 3 земли, трава -> поверхность на y=60.
Природу (леса, траву, цветы, пруды) расставляет плагин terrain.js.
Запуск: python3 tools/make_flat_world.py <level.dat от свежего мира BDS>   (нужен pip install nbtlib)
"""
import io
import json
import struct
import sys

import nbtlib

LAYERS = {
    "biome_id": 1,  # plains
    "block_layers": [
        {"block_name": "minecraft:bedrock", "count": 1},
        {"block_name": "minecraft:stone", "count": 120},
        {"block_name": "minecraft:dirt", "count": 3},
        {"block_name": "minecraft:grass_block", "count": 1},
    ],
    "encoding_version": 6,
    "structure_options": None,
    "world_version": "version.post_1_18",
}


def main(src, dst):
    raw = open(src, "rb").read()
    version, _ = struct.unpack("<ii", raw[:8])
    nbt = nbtlib.File.parse(io.BytesIO(raw[8:]), byteorder="little")
    nbt["Generator"] = nbtlib.Int(2)
    nbt["FlatWorldLayers"] = nbtlib.String(json.dumps(LAYERS, separators=(",", ":")))
    nbt["SpawnY"] = nbtlib.Int(32767)  # сервер сам найдёт поверхность
    nbt["LevelName"] = nbtlib.String("RustCraft")
    buf = io.BytesIO()
    nbt.write(buf, byteorder="little")
    body = buf.getvalue()
    with open(dst, "wb") as f:
        f.write(struct.pack("<ii", version, len(body)) + body)
    print(f"{dst}: Generator=2, поверхность y={-64 + sum(l['count'] for l in LAYERS['block_layers']) - 1}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "server/worlds/RustCraft/level.dat")
