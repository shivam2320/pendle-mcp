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
import { MintSchema } from "../schema/index.js";

const logger = new McpLogger("pendle-mcp", LOG_LEVELS.INFO);

export function registerMintTools(
  server: McpServer,
  pendleMCP: PendleMCP
): void {
  logger.info("📝 Registering mint tools...");

  server.tool(
    "mint",
    "Mint tokens using Pendle protocol",
    MintSchema,
    async ({ receiver, mint_token, slippage, tokenIn, amountIn, chainId }) => {
      try {
        logger.toolCalled("mint", {
          receiver,
          mint_token,
          slippage,
          tokenIn,
          amountIn,
          chainId,
        });

        const result = await pendleMCP.mint({
          receiver,
          mint_token,
          slippage,
          tokenIn,
          amountIn,
          chainId,
        });

        logger.toolCompleted("mint");
        return createSuccessResponse(
          `✅ Mint tokens successfully for ${receiver}`,
          result
        );
      } catch (error) {
        return handleToolError("mint", error);
      }
    }
  );

  logger.info("✅ All mint tools registered successfully");
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
