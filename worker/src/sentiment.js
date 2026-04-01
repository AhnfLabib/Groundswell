/**
 * Score sentiment of a submission using Llama 3.3 via Workers AI.
 * Returns { score: number (-1 to 1), theme: string (3 words max) }
 */
export async function scoreSentiment(text, topic, ai) {
  const prompt = `You are a sentiment analysis engine. Given an opinion about "${topic}", return ONLY valid JSON with two fields:
- "score": a float from -1.0 (very negative) to 1.0 (very positive)
- "theme": a 2-3 word phrase capturing the core idea

Opinion: "${text}"

Respond with only JSON. Example: {"score": 0.7, "theme": "cautiously optimistic"}`

  try {
    const response = await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
    })

    const raw = response.response.trim()
    const parsed = JSON.parse(raw.match(/\{.*\}/s)?.[0] || raw)

    return {
      score: Math.max(-1, Math.min(1, parseFloat(parsed.score) || 0)),
      theme: (parsed.theme || 'no theme').slice(0, 30),
    }
  } catch {
    // Fallback: neutral score if AI fails
    return { score: 0, theme: 'unknown' }
  }
}
