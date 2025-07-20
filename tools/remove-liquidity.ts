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
import { RemoveLiquiditySchema } from "../schema/index.js";

const logger = new McpLogger("pendle-mcp", LOG_LEVELS.INFO);

export function registerRemoveLiquidityTools(
  server: McpServer,
  pendleMCP: PendleMCP
): void {
  logger.info("📝 Registering remove liquidity tools...");

  server.tool(
    "remove_liquidity",
    "Remove liquidity from Pendle markets",
    RemoveLiquiditySchema,
    async ({ receiver, slippage, market, tokenOut, amountIn, chainId }) => {
      try {
        logger.toolCalled("remove_liquidity", {
          receiver,
          slippage,
          market,
          tokenOut,
          amountIn,
          chainId,
        });

        const result = await pendleMCP.removeLiquidity({
          receiver,
          slippage,
          market,
          tokenOut,
          amountIn,
          chainId,
        });

        logger.toolCompleted("remove_liquidity");
        return createSuccessResponse(
          `✅ Remove liquidity successfully for ${receiver}`,
          result
        );
      } catch (error) {
        return handleToolError("remove_liquidity", error);
      }
    }
  );

  logger.info("✅ All remove liquidity tools registered successfully");
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
