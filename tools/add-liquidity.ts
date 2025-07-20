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
import { AddLiquiditySchema } from "../schema/index.js";

const logger = new McpLogger("pendle-mcp", LOG_LEVELS.INFO);

export function registerAddLiquidityTools(
  server: McpServer,
  pendleMCP: PendleMCP
): void {
  logger.info("📝 Registering add liquidity tools...");

  server.tool(
    "add_liquidity",
    "Add liquidity to Pendle markets",
    AddLiquiditySchema,
    async ({ receiver, slippage, market, tokenIn, amountIn, zpi, chainId }) => {
      try {
        logger.toolCalled("add_liquidity", {
          receiver,
          slippage,
          market,
          tokenIn,
          amountIn,
          zpi,
          chainId,
        });

        const result = await pendleMCP.addLiquidity({
          receiver,
          slippage,
          market,
          tokenIn,
          amountIn,
          zpi,
          chainId,
        });

        logger.toolCompleted("add_liquidity");
        return createSuccessResponse(
          `✅ Add liquidity successfully for ${receiver}`,
          result
        );
      } catch (error) {
        return handleToolError("add_liquidity", error);
      }
    }
  );

  logger.info("✅ All add liquidity tools registered successfully");
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
