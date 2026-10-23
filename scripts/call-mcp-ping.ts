import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const url = process.argv[2]
if (!url) {
  console.log('usage: tsx scripts/call-mcp-ping.ts <mcp-url>')
  process.exit(2)
}

const client = new Client({ name: 'trove-phase0', version: '0.0.0' })
const transport = new StreamableHTTPClientTransport(new URL(url))

async function main() {
  await client.connect(transport)
  const listed = await client.listTools()
  const names = listed.tools.map((tool) => tool.name)
  const called = await client.callTool({ name: 'ping', arguments: { message: 'phase0' } })
  const text = Array.isArray(called.content)
    ? called.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
    : ''
  console.log(JSON.stringify({ url, names, text, isError: called.isError === true }))
  await client.close()
}

main().catch((error: unknown) => {
  console.log('RESULT error', error instanceof Error ? error.message : 'unknown')
  process.exit(1)
})
