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
import { SwapSchema } from "../schema/index.js";
const logger = new McpLogger("pendle-mcp", LOG_LEVELS.INFO);

export function registerSwapYTTools(
  server: McpServer,
  pendleMCP: PendleMCP
): void {
  logger.info("📝 Registering swap tools...");

  server.tool(
    "swapYT",
    "Swap to YT tokens",
    SwapSchema,
    async ({
      receiver,
      slippage,
      market,
      tokenIn,
      tokenOut,
      amountIn,
      chainId,
    }) => {
      try {
        logger.toolCalled("swapYT", {
          receiver,
          slippage,
          market,
          tokenIn,
          tokenOut,
          amountIn,
          chainId,
        });

        const result = await pendleMCP.swapYT({
          receiver,
          slippage,
          market,
          tokenIn,
          tokenOut,
          amountIn,
          chainId,
        });

        logger.toolCompleted("swapYT");
        return createSuccessResponse(
          `✅ Swap tokens successfully for ${receiver}`,
          result
        );
      } catch (error) {
        return handleToolError("swapYT", error);
      }
    }
  );

  logger.info("✅ All swapYT tools registered successfully");
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
