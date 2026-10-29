#!/usr/bin/env node
/**
 * @waesy/cli — Official Command-Line Interface for Waesy Local Marketplace & Agent Ecosystem
 * Usage:
 *   node scripts/waesy-cli.mjs status [--url https://waesy.com.br]
 *   node scripts/waesy-cli.mjs search "<query>" [--city "<city>"] [--url https://waesy.com.br]
 *   node scripts/waesy-cli.mjs mcp [tools/list | initialize | ping] [--url https://waesy.com.br]
 *   node scripts/waesy-cli.mjs markdown <path> [--url https://waesy.com.br]
 */

const args = process.argv.slice(2)
const command = args[0] || 'help'

function getFlag(name, fallback) {
  const idx = args.indexOf(name)
  if (idx !== -1 && args[idx + 1]) return args[idx + 1]
  return fallback
}

const baseUrl = getFlag('--url', process.env.WAESY_BASE_URL || 'https://waesy.com.br').replace(
  /\/+$/,
  '',
)

async function run() {
  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(
      JSON.stringify(
        {
          cli: '@waesy/cli',
          version: '2026.10.29',
          baseUrl,
          commands: {
            status: 'Check Waesy public discovery & API status (GET /api/v1/public/discovery)',
            search: 'Search local offers, stores, and classifieds via MCP',
            mcp: 'Execute MCP Streamable HTTP JSON-RPC 2.0 method (initialize, tools/list, ping)',
            markdown: 'Fetch any public route using Accept: text/markdown content negotiation',
          },
        },
        null,
        2,
      ),
    )
    return
  }

  if (command === 'status') {
    const res = await fetch(`${baseUrl}/api/v1/public/discovery`, {
      headers: { Accept: 'application/json' },
    })
    const body = await res.json()
    console.log(JSON.stringify({ status: res.status, data: body }, null, 2))
    return
  }

  if (command === 'search') {
    const query = args[1] || ''
    const city = getFlag('--city', undefined)
    const res = await fetch(`${baseUrl}/api/mcp/v1/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'waesy_search_offers',
          arguments: { query, city, limit: 10 },
        },
      }),
    })
    const body = await res.json()
    console.log(JSON.stringify(body, null, 2))
    return
  }

  if (command === 'mcp') {
    const method = args[1] || 'tools/list'
    const res = await fetch(`${baseUrl}/api/mcp/v1/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params: {},
      }),
    })
    const body = await res.json()
    console.log(JSON.stringify(body, null, 2))
    return
  }

  if (command === 'markdown') {
    const targetPath = args[1] || '/'
    const normalizedPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`
    const res = await fetch(`${baseUrl}${normalizedPath}`, {
      headers: { Accept: 'text/markdown' },
    })
    const text = await res.text()
    console.log(`HTTP ${res.status} | Content-Type: ${res.headers.get('content-type')} | Vary: ${res.headers.get('vary')}\n`)
    console.log(text)
    return
  }

  console.error(
    JSON.stringify({
      error: {
        code: 'UNKNOWN_CLI_COMMAND',
        message: `Unknown command '${command}'. Run with 'help' for usage.`,
      },
    }),
  )
  process.exitCode = 1
}

run().catch((err) => {
  console.error(
    JSON.stringify({
      error: {
        code: 'CLI_EXECUTION_ERROR',
        message: err instanceof Error ? err.message : String(err),
      },
    }),
  )
  process.exitCode = 1
})
