# N-Dimensional Grid

An interactive playground for shapes that move and collide in 2–8 dimensions.

Points, lines, planes, and volumes drift along chosen axes. When they meet, you decide what happens: bounce, merge, absorb, annihilate, redirect, or pass through.

**Try it live:** [yoans.github.io/n-dimensional-arrow-grid](https://yoans.github.io/n-dimensional-arrow-grid/)

## Quick start

```bash
npm install
npm run dev
```

Opens on [http://localhost:3000](http://localhost:3000).

## How to play

1. Pick a **preset** in the bottom bar (Billiard Points is a great first try).
2. Hit **Play** (or press `Space`).
3. **Drag** to orbit the camera; **click** to paint more shapes from the left panel.

Shortcuts: `Space` play/pause · `S` step · `R` reset · `?` help

## Features

- **Ranks** — point / line / plane / volume with configurable span and move axes
- **Collision table** — editable rules for every rank pair
- **Dimension mapping** — map extra dims to hue, size, opacity, tesseract projection, or slice sliders
- **10 presets** — billiards, predator chains, hyperspace, tesseract dance, and more
- **Three.js** viewport with smooth step interpolation

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Local Vite server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build |

GitHub Pages deploys automatically from `main` via Actions.

## License

MIT
