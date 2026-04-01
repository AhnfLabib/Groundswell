import { describe, it, expect, vi } from 'vitest'
import { scoreSentiment } from '../sentiment.js'

function makeAI(responseText) {
  return { run: vi.fn().mockResolvedValue({ response: responseText }) }
}

describe('scoreSentiment', () => {
  it('parses score and theme from valid JSON response', async () => {
    const ai = makeAI('{"score": 0.7, "theme": "cautiously optimistic"}')
    const result = await scoreSentiment('AI is amazing', 'AI', ai)
    expect(result.score).toBe(0.7)
    expect(result.theme).toBe('cautiously optimistic')
  })

  it('clamps score above 1 to 1', async () => {
    const ai = makeAI('{"score": 1.5, "theme": "very positive"}')
    const result = await scoreSentiment('test', 'topic', ai)
    expect(result.score).toBe(1)
  })

  it('clamps score below -1 to -1', async () => {
    const ai = makeAI('{"score": -2.0, "theme": "very negative"}')
    const result = await scoreSentiment('test', 'topic', ai)
    expect(result.score).toBe(-1)
  })

  it('returns fallback score 0 and theme "unknown" on AI error', async () => {
    const ai = { run: vi.fn().mockRejectedValue(new Error('AI down')) }
    const result = await scoreSentiment('test', 'topic', ai)
    expect(result.score).toBe(0)
    expect(result.theme).toBe('unknown')
  })

  it('returns fallback on completely invalid JSON', async () => {
    const ai = makeAI('not valid json at all')
    const result = await scoreSentiment('test', 'topic', ai)
    expect(result.score).toBe(0)
    expect(result.theme).toBe('unknown')
  })

  it('limits theme to 30 characters', async () => {
    const longTheme = 'x'.repeat(50)
    const ai = makeAI(`{"score": 0.5, "theme": "${longTheme}"}`)
    const result = await scoreSentiment('test', 'topic', ai)
    expect(result.theme.length).toBeLessThanOrEqual(30)
  })

  it('extracts JSON embedded in prose response', async () => {
    const ai = makeAI('Sure! Here is my answer: {"score": 0.4, "theme": "mixed views"} Hope that helps.')
    const result = await scoreSentiment('test', 'topic', ai)
    expect(result.score).toBe(0.4)
    expect(result.theme).toBe('mixed views')
  })

  it('calls Workers AI with the correct model', async () => {
    const ai = makeAI('{"score": 0.5, "theme": "test"}')
    await scoreSentiment('test opinion', 'AI', ai)
    expect(ai.run).toHaveBeenCalledWith(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      expect.objectContaining({ messages: expect.any(Array) })
    )
  })

  it('includes the opinion text in the prompt', async () => {
    const ai = makeAI('{"score": 0.5, "theme": "test"}')
    await scoreSentiment('my unique opinion text', 'AI', ai)
    const prompt = ai.run.mock.calls[0][1].messages[0].content
    expect(prompt).toContain('my unique opinion text')
  })
})
