You are building a recruiter-facing browser game in THIS folder.

## Identity and git
- git config user.name "Oscar Munoz"
- git config user.email "oscarxxi@gmail.com"
- Public GitHub under oscarmmi. Push `main`.
- Enable GitHub Pages from the Pages workflow that deploys `dist/` on every main push.
- Vite `base` must match the repo name: `/<repo>/`.
- After push, `gh repo edit --description` and `--add-topic` (include `game`, `vue`, `typescript`, plus the game name).

## Stack
- Vite + Vue 3 + TypeScript. Do not add Laravel, PHP, Redis, or a backend.
- All source and README in English.
- Vitest for game-logic tests (not only UI).
- No Impeccable. No NewPortfolio edits.

## Quality bar
- Looks like a finished product, not a Vite starter: custom palette, typography, spacing, motion.
- Playable on desktop and a 390px phone.
- Keyboard and pointer/touch.
- README: how to play, how to run, mermaid of the game loop, GitHub Pages URL.
- Do not invent logos of other companies. No fake high scores from real people.
- Pac-Man is a generic maze-chaser homage. Do not copy Namco sprites, logos, or the official maze.

When tests pass and Pages is configured, commit, push to the public repo, print the URL, stop.
