# gen_pixel.py - generate pixel-art assets for Dapur Ceria (Chef-RPG look).
# Uses the pixel-art-assets skill helper (PixelCanvas) with a warm project
# palette. Logical grids, limited palette, light from top-left, deterministic
# (no randomness). 1x PNGs go to game/pixel/, previews to tools/previews/.
# ASCII-only. Pillow only, no network.

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = "/home/hatch/workspace/custom-skills/pixel-art-assets/scripts"
sys.path.insert(0, SKILL)
from pixel_canvas import PixelCanvas  # noqa: E402

WORKDIR = "/home/hatch/workspace/makefun/best-cooking-game-20261125-v2"
OUT = os.path.join(WORKDIR, "game", "pixel")
PREVIEW = os.path.join(WORKDIR, "tools", "previews")
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREVIEW, exist_ok=True)

# ---- warm restaurant palette (project palette) ----
C = {
    "dark": (42, 26, 14, 255),
    "wood_l": (193, 147, 92, 255),
    "wood": (169, 122, 66, 255),
    "wood_d": (122, 82, 48, 255),
    "wood_dd": (90, 58, 32, 255),
    "table": (58, 42, 30, 255),
    "table_d": (36, 24, 18, 255),
    "cream": (232, 220, 192, 255),
    "skin1": (242, 200, 155, 255),
    "skin2": (232, 184, 138, 255),
    "skin3": (201, 141, 95, 255),
    "skin4": (138, 90, 59, 255),
    "hair_blue": (43, 74, 203, 255),
    "hair_blond": (242, 209, 60, 255),
    "hair_red": (217, 58, 43, 255),
    "hair_grey": (154, 154, 154, 255),
    "hair_brown": (74, 44, 20, 255),
    "hair_black": (26, 26, 26, 255),
    "shirt_red": (217, 79, 79, 255),
    "shirt_blue": (79, 143, 217, 255),
    "shirt_green": (88, 179, 104, 255),
    "shirt_orange": (232, 161, 60, 255),
    "shirt_purple": (155, 89, 208, 255),
    "shirt_white": (232, 232, 232, 255),
    "shirt_teal": (63, 167, 160, 255),
    "pants": (34, 34, 34, 255),
    "shoe": (26, 20, 14, 255),
    "tomato": (217, 56, 43, 255),
    "tomato_d": (160, 32, 24, 255),
    "lettuce": (88, 179, 104, 255),
    "lettuce_l": (126, 212, 145, 255),
    "fish": (90, 159, 212, 255),
    "fish_d": (52, 110, 170, 255),
    "bread": (224, 170, 94, 255),
    "bread_d": (170, 118, 58, 255),
    "patty": (122, 74, 34, 255),
    "patty_d": (90, 52, 24, 255),
    "soup": (232, 106, 42, 255),
    "cooked_fish": (232, 145, 58, 255),
    "leaf": (63, 143, 63, 255),
    "leaf_l": (88, 179, 104, 255),
    "pot": (176, 90, 40, 255),
    "white": (255, 255, 255, 255),
    "eye": (30, 20, 14, 255),
    "blush": (232, 140, 120, 255),
}


def save(cv, name):
    path = os.path.join(OUT, name + ".png")
    cv.img.save(path)
    cv.scaled(8).save(os.path.join(PREVIEW, name + "_preview.png"))
    return path


def shade_right(cv, x, y, w, h, color):
    # 2px shadow strip on the right/bottom edges (light from top-left)
    cv.rect(x + w - 2, y, 2, h, color)
    cv.rect(x, y + h - 2, w, 2, color)


# ---- characters: 32x48 chibi, down-facing ----
def draw_character(skin, hair, shirt, style="short", leg_pose=0, apron=False, hat=False):
    cv = PixelCanvas(32, 48)
    # legs (draw first so body overlaps tops)
    pants = C["pants"]
    if leg_pose == 0:  # standing
        cv.rect(10, 35, 5, 11, pants)
        cv.rect(17, 35, 5, 11, pants)
        cv.rect(9, 45, 7, 2, C["shoe"])
        cv.rect(16, 45, 7, 2, C["shoe"])
    elif leg_pose == 1:  # left forward, right lifted
        cv.rect(8, 35, 5, 11, pants)
        cv.rect(18, 34, 5, 9, pants)
        cv.rect(7, 45, 7, 2, C["shoe"])
        cv.rect(17, 42, 7, 2, C["shoe"])
    else:  # right forward, left lifted
        cv.rect(9, 34, 5, 9, pants)
        cv.rect(19, 35, 5, 11, pants)
        cv.rect(8, 42, 7, 2, C["shoe"])
        cv.rect(18, 45, 7, 2, C["shoe"])
    # long hair behind body
    if style == "long":
        cv.rect(8, 10, 16, 18, hair)
    # body / shirt
    cv.rect(8, 22, 16, 13, shirt)
    cv.rect(8, 22, 2, 13, C["white"] if shirt == C["shirt_white"] else shirt)
    # arms
    cv.rect(6, 23, 2, 10, shirt)
    cv.rect(24, 23, 2, 10, shirt)
    cv.rect(6, 33, 2, 2, skin)
    cv.rect(24, 33, 2, 2, skin)
    # apron (waiter)
    if apron:
        cv.rect(11, 26, 10, 9, C["pants"])
        cv.rect(11, 26, 10, 1, C["white"])
    # neck + head
    cv.rect(14, 20, 4, 3, skin)
    cv.ellipse(16, 14, 7, 6, skin)
    # face
    cv.rect(12, 14, 2, 2, C["eye"])
    cv.rect(18, 14, 2, 2, C["eye"])
    cv.rect(11, 17, 2, 1, C["blush"])
    cv.rect(19, 17, 2, 1, C["blush"])
    cv.rect(15, 18, 2, 1, C["tomato_d"])
    # hair on top
    if style == "spiky":
        cv.rect(10, 2, 3, 5, hair)
        cv.rect(14, 1, 3, 5, hair)
        cv.rect(19, 2, 3, 5, hair)
        cv.ellipse(16, 9, 8, 4, hair)
    elif style == "bun":
        cv.ellipse(16, 4, 3, 3, hair)
        cv.ellipse(16, 9, 8, 4, hair)
    else:
        cv.ellipse(16, 9, 8, 5, hair)
        cv.rect(8, 9, 2, 5, hair)
        cv.rect(22, 9, 2, 5, hair)
    # chef hat
    if hat:
        cv.rect(10, 0, 12, 8, C["white"])
        cv.ellipse(16, 2, 7, 3, C["white"])
    # highlight top-left of hair
    cv.rect(10, 5, 4, 1, C["white"])
    cv.outline_region(C["dark"])
    return cv


CHARACTERS = [
    ("cust_blue", C["skin1"], C["hair_blue"], C["shirt_red"], "short"),
    ("cust_blonde", C["skin2"], C["hair_blond"], C["shirt_blue"], "long"),
    ("cust_red", C["skin1"], C["hair_red"], C["shirt_green"], "spiky"),
    ("cust_grey", C["skin3"], C["hair_grey"], C["shirt_orange"], "short"),
    ("cust_brown", C["skin2"], C["hair_brown"], C["shirt_purple"], "long"),
    ("cust_black", C["skin4"], C["hair_black"], C["shirt_teal"], "bun"),
]
for name, skin, hair, shirt, style in CHARACTERS:
    save(draw_character(skin, hair, shirt, style), name)

# waiter walk cycle: 4 frames (stand, left-fwd, stand, right-fwd) with 1px bob
for i, pose in enumerate([0, 1, 0, 2]):
    cv = draw_character(C["skin1"], C["hair_black"], C["shirt_white"], "short", leg_pose=pose, apron=True)
    if pose != 0:
        cv = cv.shift(0, -1)
    save(cv, "waiter_walk_%d" % i)

# chef (white hat) standing at the kitchen
save(draw_character(C["skin1"], C["hair_black"], C["shirt_white"], "short", hat=True), "chef")


# ---- food icons: 16x16 ----
def food_canvas():
    return PixelCanvas(16, 16)


def draw_tomato():
    cv = food_canvas()
    cv.ellipse(8, 9, 6, 6, C["tomato"])
    cv.ellipse(6, 7, 3, 3, (232, 90, 70, 255))
    cv.rect(7, 1, 2, 3, C["leaf"])
    cv.rect(5, 2, 6, 1, C["leaf"])
    cv.outline_region(C["dark"])
    return cv


def draw_lettuce():
    cv = food_canvas()
    cv.ellipse(8, 8, 6, 6, C["lettuce"])
    cv.ellipse(8, 8, 4, 4, C["lettuce_l"])
    cv.ellipse(6, 6, 2, 2, C["lettuce_l"])
    cv.outline_region(C["dark"])
    return cv


def draw_fish(color, dark):
    cv = food_canvas()
    cv.ellipse(8, 8, 7, 4, color)
    cv.rect(1, 6, 3, 2, color)
    cv.rect(0, 4, 2, 2, color)
    cv.rect(0, 10, 2, 2, color)
    cv.rect(12, 7, 2, 2, C["eye"])
    cv.rect(4, 9, 5, 1, dark)
    cv.outline_region(C["dark"])
    return cv


def draw_bread():
    cv = food_canvas()
    cv.rect(3, 5, 10, 7, C["bread"])
    cv.ellipse(8, 5, 5, 3, C["bread"])
    cv.rect(3, 10, 10, 2, C["bread_d"])
    cv.rect(5, 7, 2, 1, C["bread_d"])
    cv.rect(9, 7, 2, 1, C["bread_d"])
    cv.outline_region(C["dark"])
    return cv


def draw_patty(cooked=False):
    cv = food_canvas()
    col = C["patty_d"] if cooked else C["patty"]
    cv.rect(3, 6, 10, 5, col)
    cv.ellipse(8, 6, 5, 2, col)
    if cooked:
        cv.rect(5, 7, 2, 1, C["dark"])
        cv.rect(9, 8, 2, 1, C["dark"])
    cv.outline_region(C["dark"])
    return cv


def draw_chopped(color, light):
    cv = food_canvas()
    cv.rect(2, 4, 5, 4, color)
    cv.rect(9, 3, 5, 4, light)
    cv.rect(5, 9, 6, 4, light)
    cv.rect(11, 10, 3, 3, color)
    cv.outline_region(C["dark"])
    return cv


def draw_soup():
    cv = food_canvas()
    cv.ellipse(8, 10, 6, 4, C["pot"])
    cv.ellipse(8, 8, 6, 3, C["soup"])
    cv.rect(2, 8, 2, 2, C["pot"])
    cv.rect(12, 8, 2, 2, C["pot"])
    cv.rect(6, 7, 4, 1, (255, 180, 110, 255))
    cv.outline_region(C["dark"])
    return cv


FOODS = {
    "food_tomato": draw_tomato(),
    "food_lettuce": draw_lettuce(),
    "food_fish": draw_fish(C["fish"], C["fish_d"]),
    "food_bread": draw_bread(),
    "food_patty": draw_patty(False),
    "food_choppedLettuce": draw_chopped(C["lettuce"], C["lettuce_l"]),
    "food_choppedTomato": draw_chopped(C["tomato"], (232, 90, 70, 255)),
    "food_cookedFish": draw_fish(C["cooked_fish"], C["patty_d"]),
    "food_cookedPatty": draw_patty(True),
    "food_soup": draw_soup(),
}
for name, cv in FOODS.items():
    save(cv, name)


# ---- floor tile: 64x64 wooden planks (seamless) ----
def draw_floor():
    cv = PixelCanvas(64, 64)
    tones = [C["wood_l"], C["wood"], C["wood_d"], C["wood"]]
    for row in range(4):
        y = row * 16
        tone = tones[row % len(tones)]
        cv.rect(0, y, 64, 16, tone)
        # grain lines
        for gy in (y + 5, y + 11):
            cv.hline(0, gy, 64, C["wood_dd"])
        cv.hline(0, y, 64, C["wood_l"])
        # staggered vertical seams
        seam_x = 32 if row % 2 == 0 else 16
        cv.vline(seam_x, y, 16, C["wood_dd"])
        cv.vline((seam_x + 32) % 64, y, 16, C["wood_dd"])
    return cv


save(draw_floor(), "floor")


# ---- table top: 64x32 dark wood ----
def draw_table():
    cv = PixelCanvas(64, 32)
    cv.rect(0, 0, 64, 32, C["table"])
    for row in range(4):
        y = row * 8
        cv.hline(0, y, 64, C["table_d"])
        cv.hline(0, y + 1, 64, (74, 54, 38, 255))
    cv.rect(0, 0, 64, 2, C["table_d"])
    cv.rect(0, 30, 64, 2, C["table_d"])
    cv.rect(0, 0, 2, 32, C["table_d"])
    cv.rect(62, 0, 2, 32, C["table_d"])
    return cv


save(draw_table(), "table")


# ---- plant 32x32 / barrel 32x32 ----
def draw_plant():
    cv = PixelCanvas(32, 32)
    cv.ellipse(16, 12, 9, 8, C["leaf"])
    cv.ellipse(10, 14, 5, 5, C["leaf_l"])
    cv.ellipse(22, 14, 5, 5, C["leaf"])
    cv.rect(11, 20, 10, 9, C["pot"])
    cv.rect(10, 19, 12, 2, (200, 110, 55, 255))
    cv.outline_region(C["dark"])
    return cv


def draw_barrel():
    cv = PixelCanvas(32, 32)
    cv.rect(7, 4, 18, 24, C["wood"])
    cv.ellipse(16, 4, 9, 3, C["wood_l"])
    cv.rect(7, 9, 18, 2, C["wood_dd"])
    cv.rect(7, 20, 18, 2, C["wood_dd"])
    cv.vline(12, 4, 24, C["wood_d"])
    cv.vline(20, 4, 24, C["wood_d"])
    cv.outline_region(C["dark"])
    return cv


save(draw_plant(), "plant")
save(draw_barrel(), "barrel")

print("generated assets in", OUT)
print(sorted(os.listdir(OUT)))
