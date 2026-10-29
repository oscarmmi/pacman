<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  createGameState,
  gameTick,
  startGame,
  type Direction,
  type GameState,
  type Ghost,
} from './game'

const canvas = ref<HTMLCanvasElement | null>(null)
const state = ref<GameState>(createGameState())
const best = ref(Number(localStorage.getItem('muncher-best') ?? 0))
const boardSize = 425
let loopId = 0
let resizeObserver: ResizeObserver | undefined
let lastFrame = 0
let accumulator = 0

const statusLabel = computed(() => {
  if (state.value.mode === 'ready') return 'READY WHEN YOU ARE'
  if (state.value.mode === 'paused') return 'PAUSED'
  if (state.value.mode === 'gameover') return 'RUN OVER'
  if (state.value.mode === 'won') return 'MAZE CLEARED'
  return state.value.powerTicks > 0 ? 'POWER MODE' : 'IN THE MAZE'
})

function directionFromKey(key: string): Direction | null {
  const normalized = key.toLowerCase()
  if (normalized === 'arrowup' || normalized === 'w') return 'up'
  if (normalized === 'arrowdown' || normalized === 's') return 'down'
  if (normalized === 'arrowleft' || normalized === 'a') return 'left'
  if (normalized === 'arrowright' || normalized === 'd') return 'right'
  return null
}

function handleKey(event: KeyboardEvent) {
  const direction = directionFromKey(event.key)
  if (direction) {
    event.preventDefault()
    state.value.player.nextDirection = direction
    if (state.value.mode === 'ready') state.value = startGame(state.value)
    return
  }
  if (event.code === 'Space') {
    event.preventDefault()
    togglePause()
  } else if (event.key.toLowerCase() === 'r') {
    restart()
  }
}

function togglePause() {
  if (state.value.mode === 'playing') state.value.mode = 'paused'
  else if (state.value.mode === 'paused') state.value.mode = 'playing'
}

function restart() {
  state.value = createGameState()
  state.value = startGame(state.value)
}

function start() {
  if (state.value.mode === 'ready' || state.value.mode === 'gameover' || state.value.mode === 'won') {
    restart()
  } else if (state.value.mode === 'paused') {
    togglePause()
  }
}

function setDirection(direction: Direction) {
  state.value.player.nextDirection = direction
  if (state.value.mode === 'ready') state.value = startGame(state.value)
}

function onPadPointer(event: PointerEvent, direction: Direction) {
  event.preventDefault()
  setDirection(direction)
}

function drawGhost(context: CanvasRenderingContext2D, ghost: Ghost, size: number, time: number) {
  const x = (ghost.x + 0.5) * size
  const y = (ghost.y + 0.5) * size
  const radius = size * 0.34
  const color = ghost.vulnerable ? (ghost.vulnerableFlash ? '#f4f2ff' : '#5677ff') : ghost.color
  context.save()
  context.shadowColor = color
  context.shadowBlur = ghost.vulnerable ? 5 : 12
  context.fillStyle = color
  context.beginPath()
  context.arc(x, y - radius * 0.08, radius, Math.PI, 0)
  context.lineTo(x + radius, y + radius * 0.82)
  const wave = Math.sin(time / 90) * size * 0.045
  context.lineTo(x + radius * 0.5, y + radius * 0.6 + wave)
  context.lineTo(x, y + radius * 0.82)
  context.lineTo(x - radius * 0.5, y + radius * 0.6 - wave)
  context.lineTo(x - radius, y + radius * 0.82)
  context.closePath()
  context.fill()
  context.shadowBlur = 0
  context.fillStyle = '#10142b'
  context.beginPath()
  context.ellipse(x - radius * 0.35, y - radius * 0.04, radius * 0.13, radius * 0.18, 0, 0, Math.PI * 2)
  context.ellipse(x + radius * 0.35, y - radius * 0.04, radius * 0.13, radius * 0.18, 0, 0, Math.PI * 2)
  context.fill()
  if (!ghost.vulnerable) {
    context.fillStyle = '#fff'
    context.beginPath()
    context.arc(x - radius * 0.35, y - radius * 0.08, radius * 0.045, 0, Math.PI * 2)
    context.arc(x + radius * 0.35, y - radius * 0.08, radius * 0.045, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()
}

function draw(time: number) {
  const element = canvas.value
  if (!element) return
  const context = element.getContext('2d')
  if (!context) return
  const dpr = window.devicePixelRatio || 1
  const width = element.clientWidth
  if (width === 0) return
  if (element.width !== Math.round(width * dpr) || element.height !== Math.round(width * dpr)) {
    element.width = Math.round(width * dpr)
    element.height = Math.round(width * dpr)
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, width)
  const rows = state.value.maze.length
  const columns = state.value.maze[0].length
  const size = width / columns

  context.fillStyle = '#090d20'
  context.fillRect(0, 0, width, width)
  context.fillStyle = '#101a3c'
  context.strokeStyle = '#2856d8'
  context.lineWidth = Math.max(1, size * 0.075)
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (state.value.maze[y][x] !== '#') continue
      const inset = size * 0.07
      context.beginPath()
      context.roundRect(x * size + inset, y * size + inset, size - inset * 2, size - inset * 2, size * 0.19)
      context.fill()
      context.stroke()
    }
  }

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const tile = state.value.maze[y][x]
      if (tile !== '.' && tile !== 'o') continue
      const power = tile === 'o'
      const radius = size * (power ? 0.19 + Math.sin(time / 180) * 0.025 : 0.075)
      context.beginPath()
      context.fillStyle = power ? '#ffc75e' : '#a5c6ff'
      context.shadowColor = power ? '#ffb62e' : '#9dbfff'
      context.shadowBlur = power ? 14 : 6
      context.arc((x + 0.5) * size, (y + 0.5) * size, radius, 0, Math.PI * 2)
      context.fill()
      context.shadowBlur = 0
    }
  }

  state.value.ghosts.forEach((ghost) => drawGhost(context, ghost, size, time))

  const player = state.value.player
  const px = (player.x + 0.5) * size
  const py = (player.y + 0.5) * size
  const radius = size * 0.34
  const angles: Record<Direction, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }
  const mouth = state.value.mode === 'playing' ? 0.14 + Math.abs(Math.sin(time / 95)) * 0.42 : 0.12
  const facing = angles[player.direction]
  context.save()
  context.shadowColor = '#ffd15c'
  context.shadowBlur = 17
  context.fillStyle = '#ffd15c'
  context.beginPath()
  context.moveTo(px, py)
  context.arc(px, py, radius, facing + mouth, facing + Math.PI * 2 - mouth)
  context.closePath()
  context.fill()
  context.restore()
}

function frame(time: number) {
  if (!lastFrame) lastFrame = time
  accumulator += Math.min(time - lastFrame, 120)
  lastFrame = time
  while (accumulator >= 120) {
    if (state.value.mode === 'playing') {
      state.value = gameTick(state.value)
      if (state.value.score > best.value) {
        best.value = state.value.score
        localStorage.setItem('muncher-best', String(best.value))
      }
    }
    accumulator -= 120
  }
  draw(time)
  loopId = requestAnimationFrame(frame)
}

onMounted(() => {
  window.addEventListener('keydown', handleKey)
  if (canvas.value) {
    resizeObserver = new ResizeObserver(() => draw(performance.now()))
    resizeObserver.observe(canvas.value)
  }
  loopId = requestAnimationFrame(frame)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey)
  cancelAnimationFrame(loopId)
  resizeObserver?.disconnect()
})
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <a class="wordmark" href="#top" aria-label="Muncher home"><span class="wordmark-icon">◒</span> AFTERHOURS<span class="wordmark-dot">/</span>ARCADE</a>
      <div class="topbar-note"><span class="live-dot"></span> INSERT COIN · STAY A WHILE</div>
      <a class="about-link" href="https://github.com/oscarmmi/pacman" target="_blank" rel="noreferrer">SOURCE <span>↗</span></a>
    </header>

    <section id="top" class="game-layout" aria-label="Muncher maze game">
      <aside class="intro-panel">
        <div class="eyebrow"><span>01</span> THE NIGHT SHIFT</div>
        <h1>One more<br />little <em>bite.</em></h1>
        <p class="intro-copy">A maze, a handful of glow, and four very committed pursuers. How long can you keep moving?</p>
        <div class="rules-card">
          <div class="rules-heading"><span class="sparkle">✳</span> YOUR MISSION</div>
          <div class="rule-row"><span class="rule-icon dot-icon"></span><span>Clear every spark</span></div>
          <div class="rule-row"><span class="rule-icon power-icon">✦</span><span>Power up. Turn the tables.</span></div>
          <div class="rule-row"><span class="rule-icon heart-icon">♥</span><span>Three chances. Make them count.</span></div>
        </div>
        <div class="controls-card">
          <div class="rules-heading"><span class="key-icon">⌘</span> CONTROLS</div>
          <div class="control-line"><span class="keycap">W</span><span class="keycap">A</span><span class="keycap">S</span><span class="keycap">D</span><span class="or-label">or</span><span class="keycap wide">↑ ↓ ← →</span></div>
          <div class="control-hints"><span><kbd>SPACE</kbd> pause</span><span><kbd>R</kbd> restart</span></div>
        </div>
        <div class="signed-note"><span class="signed-line"></span> MADE FOR THE AFTER-HOURS CROWD <span class="signed-line"></span></div>
      </aside>

      <section class="cabinet" aria-label="Game cabinet">
        <div class="cabinet-topline"><span>AFTERHOURS ARCADE <b>®</b></span><span class="cabinet-status"><i></i> SYSTEM ONLINE</span></div>
        <div class="screen-frame">
          <div class="hud">
            <div class="hud-stat"><span class="hud-label">SCORE</span><strong>{{ String(state.score).padStart(5, '0') }}</strong></div>
            <div class="hud-center"><span class="round-label">ROUND {{ String(state.level).padStart(2, '0') }}</span><span class="status-pill" :class="{ powered: state.powerTicks > 0 }"><i></i>{{ statusLabel }}</span></div>
            <div class="hud-stat hud-best"><span class="hud-label">PERSONAL BEST</span><strong>{{ String(best).padStart(5, '0') }}</strong></div>
          </div>

          <div class="board-wrap">
            <canvas ref="canvas" class="maze-canvas" :width="boardSize" :height="boardSize" role="img" aria-label="Maze with glowing pellets, Muncher, and four pursuing ghosts"></canvas>
            <div v-if="state.mode !== 'playing'" class="game-overlay" :class="`overlay-${state.mode}`">
              <div class="overlay-card">
                <div class="overlay-eyebrow">{{ state.mode === 'ready' ? 'THE MAZE IS WAITING' : state.mode === 'paused' ? 'TAKE A BREATHER' : state.mode === 'won' ? 'NICE WORK, NIGHT OWL' : 'THE NIGHT ISN’T OVER' }}</div>
                <h2>{{ state.mode === 'ready' ? 'Ready, Muncher?' : state.mode === 'paused' ? 'Paused.' : state.mode === 'won' ? 'Maze cleared.' : 'One more run?' }}</h2>
                <p>{{ state.mode === 'ready' ? 'Find a path. Follow the glow.' : state.mode === 'paused' ? 'Your sparks are safe right here.' : state.mode === 'won' ? 'Every last spark, all yours.' : 'The maze will be here when you are.' }}</p>
                <button class="play-button" @click="start">{{ state.mode === 'paused' ? 'BACK TO IT' : state.mode === 'ready' ? 'START GAME' : 'PLAY AGAIN' }} <span>↗</span></button>
                <span class="overlay-foot">{{ state.mode === 'ready' ? 'OR TAP A DIRECTION TO BEGIN' : 'GOOD THINGS COME TO THOSE WHO WANDER' }}</span>
              </div>
            </div>
          </div>
          <div class="board-footer"><span><i class="footer-pip"></i>{{ state.remainingPellets }} SPARKS LEFT</span><span>EST. AFTER DARK <b>·</b> 2025</span></div>
        </div>

        <div class="cabinet-bottom">
          <div class="lives-block"><span class="bottom-label">LIVES</span><div class="life-icons" aria-label="Lives remaining"><span v-for="life in state.lives" :key="life" class="life-icon">●</span><span v-for="life in 3 - state.lives" :key="`empty-${life}`" class="life-icon lost">●</span></div></div>
          <div class="ghost-legend"><span class="bottom-label">THE USUAL SUSPECTS</span><div class="suspects"><span><i class="suspect-dot ember"></i>EMBER</span><span><i class="suspect-dot aqua"></i>AQUA</span><span><i class="suspect-dot pink"></i>PINK</span><span><i class="suspect-dot butter"></i>BUTTER</span></div></div>
          <div class="level-chip"><span class="bottom-label">SPEED</span><strong>{{ state.level === 1 ? 'EASY DOES IT' : state.level === 2 ? 'PICKING UP' : 'FULL TILT' }}</strong></div>
        </div>
      </section>

      <aside class="right-rail">
        <div class="best-card"><span class="rail-label">YOUR BEST</span><strong>{{ String(best).padStart(5, '0') }}</strong><span class="best-caption">A little legend<br />in the making.</span><span class="best-star">✳</span></div>
        <div class="how-card"><span class="rail-label">QUICK TIP</span><p>Power sparks make the crew <em>edible.</em> Just for a little while.</p><span class="tip-arrow">↘</span></div>
        <button class="pause-button" @click="togglePause" :disabled="state.mode !== 'playing' && state.mode !== 'paused'"><span>{{ state.mode === 'paused' ? '▶' : 'Ⅱ' }}</span>{{ state.mode === 'paused' ? 'RESUME' : 'PAUSE' }} <kbd>SPACE</kbd></button>
        <button class="restart-button" @click="restart"><span>↻</span> START FRESH <kbd>R</kbd></button>
      </aside>
    </section>

    <nav class="touch-pad" aria-label="Touch movement controls">
      <button class="pad-button up" aria-label="Move up" @pointerdown="onPadPointer($event, 'up')">↑</button>
      <button class="pad-button left" aria-label="Move left" @pointerdown="onPadPointer($event, 'left')">←</button>
      <button class="pad-button down" aria-label="Move down" @pointerdown="onPadPointer($event, 'down')">↓</button>
      <button class="pad-button right" aria-label="Move right" @pointerdown="onPadPointer($event, 'right')">→</button>
      <span class="pad-caption">STEER THE MUNCHER</span>
    </nav>

    <footer class="page-footer"><span>AN ORIGINAL LITTLE MAZE CHASER</span><span>DESIGNED TO KEEP YOU UP A LITTLE LATER <b>✳</b></span><span>© AFTERHOURS ARCADE</span></footer>
  </main>
</template>
