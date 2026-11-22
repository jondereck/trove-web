const jevUrl =
  process.env.JEV_URL ??
  'https://br-bitter-butterfly-azoh2wfn-jev.compute.c-3.ap-southeast-1.aws.neon.tech/'
const aiUrl =
  process.env.AI_URL ??
  'https://br-bitter-butterfly-azoh2wfn-ai.compute.c-3.ap-southeast-1.aws.neon.tech/'
const webAi = process.env.WEB_AI_URL ?? 'https://web-trove.vercel.app/api/ai'
const webJev = process.env.WEB_JEV_URL ?? 'https://web-trove.vercel.app/api/jev'

const jevBody = {
  model: 'typesafeai-jev-1-14-0',
  state: {
    title: 'Expo Router docs',
    type: 'link',
    url: 'https://docs.expo.dev',
    description: 'File-based routing',
  },
  questions: {
    collection: {
      type: 'choice',
      instructions: 'Pick best folder',
      criteria: {
        unsorted: 'Leave unsorted',
        'col-dev': 'Dev — programming',
      },
    },
    confidence: {
      type: 'score',
      instructions: 'How confident?',
      criteria: ['Guess', 'Plausible', 'Clear match'],
    },
    tag1: {
      type: 'choice',
      instructions: 'First tag',
      criteria: { none: 'No tag', expo: 'Tag: expo' },
    },
  },
  install_id: 'smoke-agent-1',
}

const aiBody = {
  user: 'Reply with exactly: ok',
  system: 'Be terse.',
  install_id: 'smoke-agent-1',
  // gpt-5-mini needs headroom for reasoning tokens
  max_tokens: 256,
}

async function post(label, url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  console.log(`--- ${label} ${res.status} ---`)
  console.log(text.slice(0, 800))
  if (!res.ok) process.exitCode = 1
}

await post('direct jev', jevUrl, jevBody)
await post('direct ai', aiUrl, aiBody)
await post('web /api/ai', webAi, aiBody)
await post('web /api/jev', webJev, jevBody)
