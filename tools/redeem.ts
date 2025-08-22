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
import { RedeemSchema } from "../schema/index.js";

const logger = new McpLogger("pendle-mcp", LOG_LEVELS.INFO);

export function registerRedeemTools(
  server: McpServer,
  pendleMCP: PendleMCP
): void {
  logger.info("📝 Registering redeem tools...");

  server.tool(
    "redeem",
    "Redeem matured Principal Tokens (PT) or Yield Tokens (YT) back to underlying assets or SY tokens after market expiry. This tool allows you to convert your PT/YT positions back to the original underlying assets once the market has reached maturity, realizing the accumulated principal value and any remaining yield. Only available for markets that have passed their expiry date.",
    RedeemSchema,
    async ({
      receiver,
      slippage,
      redeem_token,
      amountIn,
      tokenOut,
      chainId,
    }) => {
      try {
        logger.toolCalled("redeem", {
          receiver,
          slippage,
          redeem_token,
          amountIn,
          tokenOut,
          chainId,
        });

        const result = await pendleMCP.redeem({
          receiver,
          slippage,
          redeem_token,
          amountIn,
          tokenOut,
          chainId,
        });

        logger.toolCompleted("redeem");
        return createSuccessResponse(
          `✅ Redeem tokens successfully for ${receiver}`,
          result
        );
      } catch (error) {
        return handleToolError("redeem", error);
      }
    }
  );

  logger.info("✅ All redeem tools registered successfully");
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
