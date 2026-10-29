export type Direction = 'up' | 'down' | 'left' | 'right'
export type GameMode = 'ready' | 'playing' | 'paused' | 'gameover' | 'won'

export interface Actor {
  x: number
  y: number
  direction: Direction
  nextDirection: Direction
}

export interface Ghost extends Actor {
  name: string
  color: string
  spawnX: number
  spawnY: number
  vulnerable: boolean
  vulnerableFlash: boolean
  moveCooldown: number
  personality: 'direct' | 'ambusher' | 'patroller' | 'shy'
}

export interface GameState {
  maze: string[][]
  player: Actor
  ghosts: Ghost[]
  mode: GameMode
  score: number
  lives: number
  level: number
  remainingPellets: number
  powerTicks: number
  tick: number
  ghostEatChain: number
}

export const MAZE_LAYOUT = [
  '##################',
  '#o....#....#....o#',
  '#.##..#....#..##.#',
  '#.....#....#.....#',
  '###.#.#.##.#.#.###',
  '#...#......#.....#',
  '#.#...##..##...#.#',
  '#.###.#....#.###.#',
  '#......   ......##',
  '#.###.#....#.###.#',
  '#.#...##..##...#.#',
  '#.....#......#...#',
  '###.#.#.##.#.#.###',
  '#.....#....#.....#',
  '#.##..#....#..##.#',
  '#o....#....#....o#',
  '##################',
  '##################',
]

const VECTORS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}
const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }
const SCATTER_TARGETS: Array<[number, number]> = [[15, 1], [1, 1], [15, 15], [1, 15]]
const GHOSTS = [
  { name: 'Ember', color: '#ff6a53', x: 7, y: 8, personality: 'direct' as const },
  { name: 'Aqua', color: '#4ce0d1', x: 8, y: 8, personality: 'ambusher' as const },
  { name: 'Pink', color: '#e68de8', x: 9, y: 8, personality: 'patroller' as const },
  { name: 'Butter', color: '#ffcf56', x: 8, y: 9, personality: 'shy' as const },
]

function countPellets(maze: string[][]): number {
  return maze.reduce((total, row) => total + row.filter((tile) => tile === '.' || tile === 'o').length, 0)
}

export function createGameState(level = 1, score = 0, lives = 3): GameState {
  const maze = MAZE_LAYOUT.map((row) => [...row])
  return {
    maze,
    player: { x: 1, y: 2, direction: 'down', nextDirection: 'down' },
    ghosts: GHOSTS.map((ghost, index) => ({
      ...ghost,
      spawnX: ghost.x,
      spawnY: ghost.y,
      direction: 'left',
      nextDirection: 'left',
      vulnerable: false,
      vulnerableFlash: false,
      moveCooldown: index % 2,
    })),
    mode: 'ready',
    score,
    lives,
    level,
    remainingPellets: countPellets(maze),
    powerTicks: 0,
    tick: 0,
    ghostEatChain: 0,
  }
}

export function startGame(state: GameState): GameState {
  if (state.mode !== 'ready' && state.mode !== 'paused' && state.mode !== 'gameover' && state.mode !== 'won') return state
  return { ...state, mode: 'playing' }
}

function isOpen(maze: string[][], x: number, y: number): boolean {
  return y >= 0 && y < maze.length && x >= 0 && x < maze[y].length && maze[y][x] !== '#'
}

function move(actor: Actor, maze: string[][], direction: Direction): boolean {
  const [dx, dy] = VECTORS[direction]
  if (!isOpen(maze, actor.x + dx, actor.y + dy)) return false
  actor.x += dx
  actor.y += dy
  actor.direction = direction
  return true
}

function targetForGhost(state: GameState, index: number): [number, number] {
  const ghost = state.ghosts[index]
  const player = state.player
  const scatter = Math.floor(state.tick / 70) % 2 === 0
  if (scatter) return SCATTER_TARGETS[index]
  if (ghost.personality === 'direct') return [player.x, player.y]
  if (ghost.personality === 'ambusher') {
    const [dx, dy] = VECTORS[player.direction]
    return [player.x + dx * 4, player.y + dy * 4]
  }
  if (ghost.personality === 'patroller') {
    const [dx, dy] = VECTORS[player.direction]
    return [player.x + dx * 2 - 2, player.y + dy * 2]
  }
  const distance = Math.abs(ghost.x - player.x) + Math.abs(ghost.y - player.y)
  return distance > 7 ? [player.x, player.y] : SCATTER_TARGETS[index]
}

function moveGhost(state: GameState, ghost: Ghost, index: number): void {
  const options = (['up', 'left', 'down', 'right'] as Direction[])
    .filter((direction) => direction !== OPPOSITE[ghost.direction])
    .filter((direction) => {
      const [dx, dy] = VECTORS[direction]
      return isOpen(state.maze, ghost.x + dx, ghost.y + dy)
    })
  if (options.length === 0) {
    const reverse = OPPOSITE[ghost.direction]
    if (move(ghost, state.maze, reverse)) return
    return
  }
  const [targetX, targetY] = targetForGhost(state, index)
  options.sort((first, second) => {
    const [firstX, firstY] = VECTORS[first]
    const [secondX, secondY] = VECTORS[second]
    const firstDistance = Math.abs(ghost.x + firstX - targetX) + Math.abs(ghost.y + firstY - targetY)
    const secondDistance = Math.abs(ghost.x + secondX - targetX) + Math.abs(ghost.y + secondY - targetY)
    return ghost.vulnerable ? secondDistance - firstDistance : firstDistance - secondDistance
  })
  move(ghost, state.maze, options[0])
}

function resetActors(state: GameState): void {
  state.player.x = 1
  state.player.y = 2
  state.player.direction = 'down'
  state.player.nextDirection = 'down'
  state.ghosts.forEach((ghost) => {
    ghost.x = ghost.spawnX
    ghost.y = ghost.spawnY
    ghost.direction = 'left'
    ghost.nextDirection = 'left'
    ghost.vulnerable = false
    ghost.moveCooldown = 0
  })
}

function resolveCollisions(state: GameState): void {
  for (const ghost of state.ghosts) {
    if (ghost.x !== state.player.x || ghost.y !== state.player.y) continue
    if (state.powerTicks > 0) {
      state.score += 200 * 2 ** Math.min(state.ghostEatChain, 3)
      state.ghostEatChain += 1
      ghost.x = ghost.spawnX
      ghost.y = ghost.spawnY
      ghost.direction = 'left'
      ghost.vulnerable = false
    } else {
      state.lives -= 1
      state.powerTicks = 0
      state.ghostEatChain = 0
      if (state.lives <= 0) state.mode = 'gameover'
      else resetActors(state)
      return
    }
  }
}

export function gameTick(previous: GameState): GameState {
  if (previous.mode !== 'playing') return previous
  const state: GameState = {
    ...previous,
    maze: previous.maze.map((row) => [...row]),
    player: { ...previous.player },
    ghosts: previous.ghosts.map((ghost) => ({ ...ghost })),
    tick: previous.tick + 1,
  }
  if (state.powerTicks > 0) state.powerTicks -= 1
  state.ghosts.forEach((ghost) => {
    ghost.vulnerable = state.powerTicks > 0
    ghost.vulnerableFlash = state.powerTicks < 15 && state.tick % 4 < 2
  })

  if (!move(state.player, state.maze, state.player.nextDirection)) move(state.player, state.maze, state.player.direction)
  const tile = state.maze[state.player.y][state.player.x]
  if (tile === '.' || tile === 'o') {
    state.maze[state.player.y][state.player.x] = ' '
    state.remainingPellets -= 1
    state.score += tile === 'o' ? 50 : 10
    if (tile === 'o') {
      state.powerTicks = 50
      state.ghostEatChain = 0
      state.ghosts.forEach((ghost) => { ghost.vulnerable = true })
    }
  }

  if (state.remainingPellets === 0) {
    const next = createGameState(state.level + 1, state.score, state.lives)
    next.mode = 'playing'
    return next
  }

  state.ghosts.forEach((ghost, index) => {
    ghost.moveCooldown -= 1 + (state.level - 1) * 0.12
    if (ghost.moveCooldown <= 0) {
      moveGhost(state, ghost, index)
      ghost.moveCooldown += 2
    }
  })
  resolveCollisions(state)
  return state
}

export function eatPellet(state: GameState): GameState {
  const next: GameState = { ...state, maze: state.maze.map((row) => [...row]), player: { ...state.player }, ghosts: state.ghosts.map((ghost) => ({ ...ghost })) }
  const tile = next.maze[next.player.y][next.player.x]
  if (tile !== '.' && tile !== 'o') return next
  next.maze[next.player.y][next.player.x] = ' '
  next.remainingPellets -= 1
  next.score += tile === 'o' ? 50 : 10
  if (tile === 'o') {
    next.powerTicks = 50
    next.ghostEatChain = 0
    next.ghosts.forEach((ghost) => { ghost.vulnerable = true })
  }
  return next
}

export function checkCollision(state: GameState): GameState {
  const next: GameState = { ...state, player: { ...state.player }, ghosts: state.ghosts.map((ghost) => ({ ...ghost })) }
  resolveCollisions(next)
  return next
}
