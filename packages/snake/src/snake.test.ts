import { describe, it, expect } from 'vitest'

// Pure collision / scoring logic extracted for unit testing
// Canvas rendering is a side-effect — tested visually via demo

function pointsEqual(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x === b.x && a.y === b.y
}

function wouldCollide(snake: { x: number; y: number }[], next: { x: number; y: number }) {
  return snake.some(s => pointsEqual(s, next))
}

describe('snake collision', () => {
  it('detects self collision', () => {
    const snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }]
    expect(wouldCollide(snake, { x: 4, y: 5 })).toBe(true)
  })

  it('allows safe move', () => {
    const snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }]
    expect(wouldCollide(snake, { x: 6, y: 5 })).toBe(false)
  })
})
