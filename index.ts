import { createMcpServer } from '@osiris-ai/sdk';
import { MemoryDatabaseAdapter } from '@osiris-ai/sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config as dotenv } from 'dotenv';
import { HelloWorldMCP } from './client.js';
dotenv();
async function start(): Promise<void> {
  const hub = process.env.HUB_BASE_URL || 'https://api.osirislabs.xyz/v1';
  const clientId = process.env.OAUTH_CLIENT_ID || "";
  const clientSecret = process.env.OAUTH_CLIENT_SECRET || "";
  const port = parseInt(process.env.PORT || "3000", 10);

  const hello = new HelloWorldMCP(hub);

  await createMcpServer({
    name: 'pendle-mcp',
    version: '0.0.1',
    auth: {
      useHub: true,
      hubConfig: { baseUrl: hub, clientId, clientSecret },
      database: new MemoryDatabaseAdapter(),
    },
    server: {
      port,
      mcpPath: '/mcp',
      callbackBasePath: '/callback',
      baseUrl: 'http://localhost:3000',
      logger: (m: string) => console.log(m),
    },
    configure: (s: McpServer) => hello.configureServer(s),
  });

  console.log('🚀 pendle-mcp running on port', port);
}
start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});