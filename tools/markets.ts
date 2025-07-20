import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { type AuthContextError } from "@osiris-ai/sdk";
import { McpLogger } from "../utils/logger.js";
import {
  createAuthErrorResponse,
  createErrorResponse,
  createSuccessResponse,
  LOG_LEVELS,
} from "../utils/types.js";
import { PendleMCP } from "../client.js";
import { GetMarketsSchema } from "../schema/index.js";

const logger = new McpLogger("pendle-mcp", LOG_LEVELS.INFO);

export function registerMarketsTools(
  server: McpServer,
  pendleMCP: PendleMCP
): void {
  logger.info("📝 Registering markets tools...");

  server.tool(
    "get_markets",
    "Get list of active Pendle markets",
    GetMarketsSchema,
    async ({ chainId }) => {
      try {
        logger.toolCalled("get_markets", {
          chainId,
        });

        const result = await pendleMCP.getMarkets({
          chainId,
        });

        logger.toolCompleted("get_markets");
        return createSuccessResponse(
          `✅ Retrieved active markets for chain ${chainId}`,
          result
        );
      } catch (error) {
        return handleToolError("get_markets", error);
      }
    }
  );

  logger.info("✅ All markets tools registered successfully");
}

/**
 * Centralized error handling for all tools
 */
function handleToolError(toolName: string, error: unknown): CallToolResult {
  if ((error as AuthContextError).authorizationUrl) {
    const authError = error as AuthContextError;
    logger.error("Authentication required", {
      tool: toolName,
      authUrl: authError.authorizationUrl,
    });

    return createAuthErrorResponse(
      `Google authentication required for ${toolName}. Please visit: ${authError.authorizationUrl}`,
      {
        authorizationUrl: authError.authorizationUrl,
        availableServices: authError.availableServices,
        missingService: authError.missingService,
        deploymentId: authError.deploymentId,
      }
    );
  }

  logger.error("Tool execution failed", {
    tool: toolName,
    error: error instanceof Error ? error.message : String(error),
  });

  return createErrorResponse(error);
}
