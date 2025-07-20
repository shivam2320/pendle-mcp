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
import { TransferLiquiditySchema } from "../schema/index.js";

const logger = new McpLogger("pendle-mcp", LOG_LEVELS.INFO);

export function registerTransferLiquidityTools(
  server: McpServer,
  pendleMCP: PendleMCP
): void {
  logger.info("📝 Registering transfer liquidity tools...");

  server.tool(
    "transfer_liquidity",
    "Transfer liquidity between Pendle markets",
    TransferLiquiditySchema,
    async ({
      receiver,
      slippage,
      srcMarket,
      dstMarket,
      lpAmount,
      ptAmount,
      ytAmount,
      zpi,
      aggregators,
      chainId,
    }) => {
      try {
        logger.toolCalled("transfer_liquidity", {
          receiver,
          slippage,
          srcMarket,
          dstMarket,
          lpAmount,
          ptAmount,
          ytAmount,
          zpi,
          aggregators,
          chainId,
        });

        const result = await pendleMCP.transferLiquidity({
          receiver,
          slippage,
          srcMarket,
          dstMarket,
          lpAmount,
          ptAmount,
          ytAmount,
          zpi,
          aggregators,
          chainId,
        });

        logger.toolCompleted("transfer_liquidity");
        return createSuccessResponse(
          `✅ Transfer liquidity successfully for ${receiver}`,
          result
        );
      } catch (error) {
        return handleToolError("transfer_liquidity", error);
      }
    }
  );

  logger.info("✅ All transfer liquidity tools registered successfully");
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
