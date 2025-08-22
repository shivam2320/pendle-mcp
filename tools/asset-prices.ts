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
import {
  GetAssetPricesSchema,
  GetHistoricalPricesSchema,
} from "../schema/index.js";

const logger = new McpLogger("pendle-mcp", LOG_LEVELS.INFO);

export function registerAssetPricesTools(
  server: McpServer,
  pendleMCP: PendleMCP
): void {
  logger.info("📝 Registering asset prices tools...");

  server.tool(
    "get_asset_prices",
    "Retrieve real-time pricing data for Pendle tokens including PT, YT, SY tokens, and underlying assets across supported blockchain networks. This tool provides current market prices essential for trading decisions, portfolio valuation, and yield calculations. Supports querying specific token addresses or fetching comprehensive price data for all tokens on a given chain.",
    GetAssetPricesSchema,
    async ({ chainId, addresses }) => {
      try {
        logger.toolCalled("get_asset_prices", {
          chainId,
          addresses,
        });

        const result = await pendleMCP.getAssetPrices({
          chainId,
          addresses,
        });

        logger.toolCompleted("get_asset_prices");
        return createSuccessResponse(
          `✅ Retrieved asset prices for chain ${chainId}`,
          result
        );
      } catch (error) {
        return handleToolError("get_asset_prices", error);
      }
    }
  );

  server.tool(
    "get_historical_prices",
    "Retrieve historical price data and charts for Pendle tokens with customizable time ranges and granularity. This tool enables technical analysis, performance tracking, and yield trend analysis by providing historical pricing data at hourly, daily, or weekly intervals. Essential for understanding token price movements, calculating returns, and making informed investment decisions.",
    GetHistoricalPricesSchema,
    async ({ chainId, address, timeFrame, timestampStart, timestampEnd }) => {
      try {
        logger.toolCalled("get_historical_prices", {
          chainId,
          address,
          timeFrame,
          timestampStart,
          timestampEnd,
        });

        const result = await pendleMCP.getHistoricalPrices({
          chainId,
          address,
          timeFrame,
          timestampStart,
          timestampEnd,
        });

        logger.toolCompleted("get_historical_prices");
        return createSuccessResponse(
          `✅ Retrieved historical prices for ${address} on chain ${chainId}`,
          result
        );
      } catch (error) {
        return handleToolError("get_historical_prices", error);
      }
    }
  );

  logger.info("✅ All asset prices tools registered successfully");
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
