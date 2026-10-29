import { describe, expect, it } from 'vitest'
import { checkCollision, createGameState, eatPellet, gameTick, startGame } from './game'

describe('maze game logic', () => {
  it('eats a pellet, increments score, and removes it from the maze', () => {
    const state = startGame(createGameState())
    state.player.x = 1
    state.player.y = 2
    state.player.direction = 'down'
    state.player.nextDirection = 'down'
    const remaining = state.remainingPellets

    const next = gameTick(state)

    expect(next.score).toBe(10)
    expect(next.maze[3][1]).toBe(' ')
    expect(next.remainingPellets).toBe(remaining - 1)
  })

  it('costs one life when a ghost catches Muncher outside power mode', () => {
    const state = createGameState()
    state.mode = 'playing'
    state.player.x = 5
    state.player.y = 5
    state.ghosts[0].x = 5
    state.ghosts[0].y = 5

    const next = checkCollision(state)

    expect(next.lives).toBe(2)
    expect(next.player).toMatchObject({ x: 1, y: 2 })
    expect(next.ghosts[0]).toMatchObject({ x: next.ghosts[0].spawnX, y: next.ghosts[0].spawnY })
  })

  it('scores and sends a vulnerable ghost back to its spawn point', () => {
    const state = createGameState()
    state.mode = 'playing'
    state.powerTicks = 20
    state.player.x = 5
    state.player.y = 5
    state.ghosts[0].x = 5
    state.ghosts[0].y = 5
    state.ghosts[0].vulnerable = true

    const next = checkCollision(state)

    expect(next.score).toBe(200)
    expect(next.ghosts[0]).toMatchObject({ x: next.ghosts[0].spawnX, y: next.ghosts[0].spawnY })
    expect(next.ghosts[0].vulnerable).toBe(false)
    expect(next.lives).toBe(3)
  })

  it('does not mutate a state passed to pellet or collision helpers', () => {
    const original = createGameState()
    const playerStart = { ...original.player }
    const consumed = eatPellet(original)
    const collided = checkCollision({ ...original, player: { x: 7, y: 8, direction: 'left', nextDirection: 'left' } })

    expect(original.player).toEqual(playerStart)
    expect(original.maze[2][1]).toBe('.')
    expect(consumed.maze[2][1]).toBe(' ')
    expect(consumed.score).toBe(10)
    expect(collided.lives).toBe(2)
  })
})
