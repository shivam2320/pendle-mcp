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
import { AddLiquidityDualSchema } from "../schema/index.js";

const logger = new McpLogger("pendle-mcp", LOG_LEVELS.INFO);

export function registerAddLiquidityDualTools(
  server: McpServer,
  pendleMCP: PendleMCP
): void {
  logger.info("📝 Registering add liquidity dual tools...");

  server.tool(
    "add_liquidity_dual",
    "Add dual-sided liquidity to Pendle markets by providing both underlying tokens and Principal Tokens (PT) simultaneously. This approach allows for more balanced liquidity provision, reducing price impact and ensuring optimal capital efficiency. Ideal for users who already hold both underlying assets and PT tokens and want to maximize their liquidity provision efficiency.",
    AddLiquidityDualSchema,
    async ({
      receiver,
      slippage,
      market,
      tokenIn,
      amountTokenIn,
      amountPtIn,
      chainId,
    }) => {
      try {
        logger.toolCalled("add_liquidity_dual", {
          receiver,
          slippage,
          market,
          tokenIn,
          amountTokenIn,
          amountPtIn,
          chainId,
        });

        const result = await pendleMCP.addLiquidityDual({
          receiver,
          slippage,
          market,
          tokenIn,
          amountTokenIn,
          amountPtIn,
          chainId,
        });

        logger.toolCompleted("add_liquidity_dual");
        return createSuccessResponse(
          `✅ Add dual liquidity successfully for ${receiver}`,
          result
        );
      } catch (error) {
        return handleToolError("add_liquidity_dual", error);
      }
    }
  );

  logger.info("✅ All add liquidity dual tools registered successfully");
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
