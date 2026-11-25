# 🍳 Dapur Ceria — Game Masak 3D

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137/Fattih210494/best-cooking-game-20261125-v2.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Fattih210494/best-cooking-game-20261125-v2/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Fattih210494/best-cooking-game-20261125-v2/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

A complete, original 3D cooking game for the [make.fun bounty](https://make.fun/bounty/best-cooking-game-20261125-0137) — run your own tiny restaurant in a warm low-poly 3D dining room. Take orders, chop, grill, simmer, plate, and serve before your customers lose patience.

## How to play

Serve `game/` from any static server (or just open `game/index.html`):

```sh
node serve.ts
# open http://localhost:8080
```

1. **Grab ingredients** — click the crates on the back counter (tomato, lettuce, fish, bread, patty). Your hand holds up to 3.
2. **Cook** — click a station with the right ingredient: chopping board (lettuce/tomato, 3s), stove (fish 7s / patty 6s), soup pot (tomato, 6s). Click the station again to pick up the finished food.
3. **Plate it** — click the long cream serving counter (MEJA SAJI) on the left to move your hand onto the plate. When the plate matches an order it glows green in the HUD.
4. **Serve** — click the customer who ordered that dish. Serve fast for combos: every consecutive serve raises the payout multiplier up to x5.

Watch the patience bars in the speech bubbles: an expired order costs a heart, a wrong dish clears your combo. You have 3 hearts and a 3-minute shift. Burger Ceria unlocks in minute two. Game over shows your final score — press R or click to play again.

**Controls:** mouse (click crates / stations / pass / customers) · `1-3` use a station · `4`/`Space` plate · `P` pause · `M` mute · `R` restart.

## Tech

- Three.js r185 (vendored into `game/vendor/three.module.min.js` — no CDN, no network request at runtime)
- WebGLRenderer, orthographic top-down camera, PBR materials, warm lighting, soft shadows
- All models, textures, and sounds are procedural — drawn and synthesized in code, no external assets
- `main.ts` (Node 22, stdlib only) copies `game/` + `screenshots/` to `/output` and writes `dossier.json` via `vendor/makefun-game.ts`

## Dishes

| Dish | Chain | Price |
| --- | --- | --- |
| Sup Tomat | tomato → pot (6s) | 12 |
| Ikan Bakar | fish → stove (7s) | 18 |
| Salad Taman | lettuce + tomato → board (3s each) | 15 |
| Burger Ceria | patty → stove (6s) + bread | 24 |
