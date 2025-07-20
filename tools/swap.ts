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

export function registerSwapTools(
  server: McpServer,
  pendleMCP: PendleMCP
): void {
  logger.info("📝 Registering swap tools...");

  server.tool(
    "swap",
    "Swap tokens",
    SwapSchema,
    async ({ receiver, slippage, tokenIn, tokenOut, amountIn }) => {
      try {
        logger.toolCalled("swap", {
          receiver,
          slippage,
          tokenIn,
          tokenOut,
          amountIn,
        });

        const result = await pendleMCP.swap({
          receiver,
          slippage,
          tokenIn,
          tokenOut,
          amountIn,
        });

        logger.toolCompleted("swap");
        return createSuccessResponse(
          `✅ Swap tokens successfully for ${receiver}`,
          result
        );
      } catch (error) {
        return handleToolError("swap", error);
      }
    }
  );

  logger.info("✅ All swap tools registered successfully");
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
