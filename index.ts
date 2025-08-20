import { createMcpServer } from "@osiris-ai/sdk";
import { PostgresDatabaseAdapter } from "@osiris-ai/postgres-sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config as dotenv } from "dotenv";
import { PendleMCP } from "./client.js";
dotenv();
async function start(): Promise<void> {
  const hub = process.env.HUB_BASE_URL || "https://api.osirislabs.xyz/v1";
  const clientId = process.env.OAUTH_CLIENT_ID || "";
  const clientSecret = process.env.OAUTH_CLIENT_SECRET || "";
  const port = parseInt(process.env.PORT || "3000", 10);

  const pendle = new PendleMCP(hub);

  await createMcpServer({
    name: "pendle-mcp",
    version: "0.0.1",
    auth: {
      useHub: true,
      hubConfig: { baseUrl: hub, clientId, clientSecret },
      database: new PostgresDatabaseAdapter({
        connectionString: process.env.DATABASE_URL,
      }),
    },
    server: {
      port,
      mcpPath: "/mcp",
      callbackBasePath: "/callback",
      baseUrl:
        process.env.NODE_ENV === "production"
          ? "https://pendle-mcp.osirislabs.xyz"
          : "http://localhost:3000",
      logger: (m: string) => console.log(m),
      corsOptions: {
        origin: "*",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "Accept",
          "Origin",
        ],
      },
    },
    configure: (s: McpServer) => pendle.configureServer(s),
  });

  console.log("🚀 pendle-mcp running on port", port);
}
start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
