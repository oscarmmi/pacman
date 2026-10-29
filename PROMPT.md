Build a Pac-Man style maze chaser in THIS folder: C:\xampp\htdocs\pacman

A recruiter-ready browser maze game. Playable, polished, no backend.
The GitHub repo https://github.com/oscarmmi/pacman already exists and is empty. Use that repo. Do not create a different name.

## Game
- Tile maze. Player eats pellets. 4 ghosts with distinct colors and simple chase/scatter AI (not identical paths).
- Power pellet: ghosts turn vulnerable for a few seconds; eating a ghost scores extra and it respawns.
- Keyboard: Arrow keys and WASD. Space pause. R restart.
- Touch: on-screen D-pad so a 390px phone is playable.
- Score, lives (3), level up when the maze is cleared (slightly faster ghosts). Local best in localStorage.
- Original maze layout. No Namco logos, no official maze copy, no trademarked character names on screen. Call the player "Muncher". Ghosts: Ember, Aqua, Pink, Butter.

## UI
- Dark navy maze, glowing pellets, saturated ghost colors, monospace HUD.
- Not a default Vite page. No Vue logo. 390px phone and 1280px desktop.

## Tests
- Vitest (pure logic): eating a pellet increments score and removes it; a ghost collision while not powered costs a life; eating a vulnerable ghost scores and removes that ghost.
- `npm test` and `npm run build` must pass.

## GitHub
- Repo: https://github.com/oscarmmi/pacman (already exists, empty)
- Pages: https://oscarmmi.github.io/pacman/
- vite base `/pacman/`
- Commit: feat: add pacman
- gh repo edit --description "Maze chaser in Vue 3 + TypeScript, playable on GitHub Pages." --add-topic vue --add-topic typescript --add-topic game --add-topic pacman --add-topic canvas
- Stop. Print the repo URL and Pages URL.
