import { getManifest } from './registryBridge'

const SYSTEM_PROMPT = `You are a UI composition agent. Given a component manifest and a user request, output a JSON composition plan.

RULES:
- Only use components that exist in the manifest
- Props must be plain JSON values (strings, numbers, booleans, arrays, objects) — NO JSX, NO functions, NO undefined
- Generate realistic, domain-specific content (not generic placeholders)
- Maximum 10 sections
- Output ONLY valid JSON — no markdown, no explanation, no code fences

OUTPUT FORMAT:
{
  "title": "Page title",
  "sections": [
    { "component": "ComponentName", "props": { "prop": "value" } }
  ]
}`

async function callClaude(userMessage, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
  const data = await res.json()
  return data.content[0].text
}

async function callOllama(userMessage, ollamaUrl) {
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.3',
      prompt: `${SYSTEM_PROMPT}\n\n${userMessage}`,
      stream: false,
    }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  return data.response
}

function parseJsonResponse(text) {
  // Strip markdown fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned)
}

function buildUserMessage({ prompt, outputType, currentPlan, manifest }) {
  const manifestStr = JSON.stringify(manifest, null, 0)

  if (currentPlan) {
    return `Current composition plan:
${JSON.stringify(currentPlan, null, 2)}

User refinement request: "${prompt}"
Output type: ${outputType}

Update the plan based on the request. Return the full updated JSON plan.`
  }

  return `Component manifest (${manifest.length} components):
${manifestStr}

User request: "${prompt}"
Output type: ${outputType}

Return a JSON composition plan using only components from the manifest.`
}

export async function compose({ prompt, outputType = 'page', currentPlan = null }) {
  const apiKey = localStorage.getItem('composer_claude_key') || import.meta.env.VITE_CLAUDE_API_KEY
  const ollamaUrl = localStorage.getItem('composer_ollama_url') || import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'
  const model = localStorage.getItem('composer_model') || 'haiku'

  if (!apiKey && model !== 'ollama') {
    throw new Error('No API key configured. Open Settings ⚙️ to add your Claude API key.')
  }

  const manifest = getManifest(outputType)
  if (manifest.length === 0) {
    throw new Error(`No components found for output type: ${outputType}`)
  }

  const userMessage = buildUserMessage({ prompt, outputType, currentPlan, manifest })

  // Try up to 2 attempts (for JSON parse failures)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = model === 'ollama'
        ? await callOllama(userMessage, ollamaUrl)
        : await callClaude(userMessage, apiKey)

      const plan = parseJsonResponse(raw)

      // Validate structure
      if (!plan.sections || !Array.isArray(plan.sections)) {
        throw new Error('Invalid plan: missing sections array')
      }

      // Filter out any components not in the manifest
      const validNames = new Set(manifest.map(c => c.name))
      plan.sections = plan.sections.filter(s => {
        const valid = validNames.has(s.component)
        if (!valid) console.warn(`Composer: unknown component "${s.component}" removed from plan`)
        return valid
      })

      return plan
    } catch (err) {
      if (attempt === 0 && err.message.includes('JSON')) {
        // Retry with explicit JSON reminder
        console.warn('Composer: JSON parse failed, retrying...')
        continue
      }
      throw err
    }
  }
}
