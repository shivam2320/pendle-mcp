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
import { GetAssetsSchema } from "../schema/index.js";

const logger = new McpLogger("pendle-mcp", LOG_LEVELS.INFO);

export function registerAssetsTools(
  server: McpServer,
  pendleMCP: PendleMCP
): void {
  logger.info("📝 Registering assets tools...");

  server.tool(
    "get_assets",
    "Discover and explore all available Pendle assets including Principal Tokens (PT), Yield Tokens (YT), and Standardized Yield (SY) tokens across supported blockchain networks. This comprehensive tool provides detailed asset information with advanced filtering capabilities by expiry status, zappability, asset type, and search queries. Essential for asset discovery, market research, and finding investment opportunities within the Pendle ecosystem.",
    GetAssetsSchema,
    async ({
      chainId,
      order_by,
      skip,
      limit,
      is_expired,
      zappable,
      type,
      address,
      q,
    }) => {
      try {
        logger.toolCalled("get_assets", {
          chainId,
          order_by,
          skip,
          limit,
          is_expired,
          zappable,
          type,
          address,
          q,
        });

        const result = await pendleMCP.getAssets({
          chainId,
          order_by,
          skip,
          limit,
          is_expired,
          zappable,
          type,
          address,
          q,
        });

        logger.toolCompleted("get_assets");
        return createSuccessResponse(
          `✅ Retrieved assets for chain ${chainId}`,
          result
        );
      } catch (error) {
        return handleToolError("get_assets", error);
      }
    }
  );

  logger.info("✅ All assets tools registered successfully");
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
