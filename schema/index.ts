import { z } from "zod";

export const HelloToolSchema = {
  name: z.string().default("World").describe("Name to greet"),
};

export const HelloPromptSchema = {
  topic: z
    .string()
    .describe(
      "The topic or subject for the hello prompt. This can be any string that you want to use as a conversation starter or greeting topic."
    ),
};

export const SwapSchema = {
  receiver: z
    .string()
    .describe(
      "The wallet address (0x...) that will receive the output tokens after the swap is completed. The receiver can be different from the transaction sender, allowing for third-party transactions."
    ),
  market: z
    .string()
    .describe(
      "The contract address of the specific Pendle market where the swap will be executed. This market defines the trading pair and contains the liquidity pools for PT (Principal Tokens) and YT (Yield Tokens). Each market has a unique address."
    ),
  slippage: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Maximum acceptable slippage tolerance for the swap, expressed as a decimal between 0 and 1. For example: 0.005 = 0.5%, 0.01 = 1%, 0.05 = 5%. This protects against price movements during transaction execution. Higher values allow more price variance but increase the risk of unfavorable trades."
    ),
  tokenIn: z
    .string()
    .describe(
      "The contract address of the ERC-20 token you want to swap from (input token)."
    ),
  tokenOut: z
    .string()
    .describe(
      "The contract address of the ERC-20 token you want to receive from the swap (output token). This represents your desired token after the swap completes. Can be PT (Principal Tokens), YT (Yield Tokens), or underlying assets depending on the market configuration."
    ),
  amountIn: z
    .string()
    .describe(
      "The exact amount of input tokens to swap, specified in the token's smallest denomination (wei for ETH, or token decimals). For example, to swap 1 USDC (6 decimals), use '1000000'. Always account for the token's decimal places when specifying this value."
    ),
  enableAggregator: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Whether to enable DEX aggregator routing to potentially find better swap rates across multiple decentralized exchanges. When enabled, the system will compare routes through various DEXs (Uniswap, SushiSwap, Curve, etc.) and choose the most optimal path for better pricing and reduced slippage."
    ),
  aggregators: z
    .string()
    .optional()
    .describe(
      "Specific DEX aggregator service to use when enableAggregator is true. Supported options include '1inch' (1inch Network), 'paraswap' (ParaSwap), or 'kyber' (KyberSwap). Each aggregator has different routing algorithms and supported DEXs. Leave empty to use the default aggregator selection."
    ),
  chainId: z
    .string()
    .default("1")
    .describe(
      "The blockchain network identifier where the swap will be executed. Supported values: '1' (Ethereum Mainnet), '137' (Polygon), '42161' (Arbitrum One), '10' (Optimism). Ensure the market address and tokens exist on the specified chain before attempting the swap."
    ),
};

export const MintSchema = {
  receiver: z
    .string()
    .describe(
      "The wallet address (0x...) that will receive the minted PT (Principal Tokens) or YT (Yield Tokens). This address will own the newly created tokens after the minting operation completes."
    ),
  mint_token: z
    .string()
    .describe(
      "The contract address of the specific token type to mint. This should be either a PT (Principal Token) or YT (Yield Token) address from a Pendle market. The mint operation will create new tokens of this type."
    ),
  slippage: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Maximum acceptable slippage tolerance for the minting operation, expressed as a decimal between 0 and 1. For example: 0.005 = 0.5%, 0.01 = 1%, 0.03 = 3%. This protects against unfavorable price movements during the transaction."
    ),
  tokenIn: z
    .string()
    .describe(
      "The contract address of the ERC-20 token you want to use for minting (input token). This is typically the underlying asset or SY (Standardized Yield) token that will be converted into PT/YT tokens."
    ),
  amountIn: z
    .string()
    .describe(
      "The exact amount of input tokens to use for minting, specified in the token's smallest denomination. For example, to mint with 1 USDC (6 decimals), use '1000000'. Always account for the token's decimal places."
    ),
  chainId: z
    .string()
    .default("1")
    .describe(
      "The blockchain network identifier where the minting will be executed. Supported values: '1' (Ethereum), '137' (Polygon), '42161' (Arbitrum), '10' (Optimism). Ensure the tokens and market exist on the specified chain."
    ),
};

export const TransferLiquiditySchema = {
  receiver: z
    .string()
    .describe(
      "The wallet address (0x...) that will receive the liquidity in the destination market. This address will own the transferred LP tokens, PT, and YT after the operation completes."
    ),
  slippage: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Maximum acceptable slippage tolerance for the liquidity transfer, expressed as a decimal between 0 and 1. For example: 0.01 = 1%, 0.03 = 3%. This protects against price impact during the cross-market transfer."
    ),
  srcMarket: z
    .string()
    .describe(
      "The contract address of the source Pendle market from which liquidity will be transferred. This is where your current LP tokens, PT, and YT are located before the transfer."
    ),
  dstMarket: z
    .string()
    .describe(
      "The contract address of the destination Pendle market where liquidity will be transferred to. This is where your tokens will be positioned after the operation, typically with different expiry dates or underlying assets."
    ),
  lpAmount: z
    .string()
    .describe(
      "The amount of LP (Liquidity Provider) tokens to transfer from the source market, specified in the token's smallest denomination. Set to '0' if not transferring LP tokens."
    ),
  ptAmount: z
    .string()
    .describe(
      "The amount of PT (Principal Tokens) to transfer from the source market, specified in the token's smallest denomination. Set to '0' if not transferring PT tokens."
    ),
  ytAmount: z
    .string()
    .describe(
      "The amount of YT (Yield Tokens) to transfer from the source market, specified in the token's smallest denomination. Set to '0' if not transferring YT tokens."
    ),
  zpi: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Whether to use Zero Price Impact (ZPI) mode for the transfer. When enabled, attempts to minimize price impact by using more efficient routing mechanisms, though it may not always be available."
    ),
  aggregators: z
    .string()
    .optional()
    .describe(
      "Specific DEX aggregator to use for optimizing the transfer route. Options include '1inch', 'paraswap', or 'kyber'. Leave empty to use default routing or when ZPI mode is enabled."
    ),
  chainId: z
    .string()
    .default("1")
    .describe(
      "The blockchain network identifier where the transfer will be executed. Both source and destination markets must exist on this chain. Supported values: '1' (Ethereum), '137' (Polygon), '42161' (Arbitrum), '10' (Optimism)."
    ),
};

export const AddLiquiditySchema = {
  receiver: z
    .string()
    .describe(
      "The wallet address (0x...) that will receive the LP (Liquidity Provider) tokens and any remaining YT (Yield Tokens) after adding liquidity to the market."
    ),
  slippage: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Maximum acceptable slippage tolerance for adding liquidity, expressed as a decimal between 0 and 1. For example: 0.01 = 1%, 0.02 = 2%. This protects against unfavorable price movements during the operation."
    ),
  market: z
    .string()
    .describe(
      "The contract address of the Pendle market where liquidity will be added. This market defines the PT/YT pair and contains the liquidity pools you'll be contributing to."
    ),
  tokenIn: z
    .string()
    .describe(
      "The contract address of the ERC-20 token you want to add as liquidity. This is typically the underlying asset, SY token, or PT token that will be deposited into the market."
    ),
  amountIn: z
    .string()
    .describe(
      "The exact amount of input tokens to add as liquidity, specified in the token's smallest denomination. For example, to add 100 USDC (6 decimals), use '100000000'."
    ),
  zpi: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Whether to use Zero Price Impact (ZPI) mode for adding liquidity. When enabled, attempts to add liquidity with minimal price impact by using optimized routing, though it may not always be available."
    ),
  chainId: z
    .string()
    .default("1")
    .describe(
      "The blockchain network identifier where the liquidity addition will be executed. Supported values: '1' (Ethereum), '137' (Polygon), '42161' (Arbitrum), '10' (Optimism)."
    ),
};

export const AddLiquidityDualSchema = {
  receiver: z
    .string()
    .describe(
      "The wallet address (0x...) that will receive the LP (Liquidity Provider) tokens after adding dual-sided liquidity to the market."
    ),
  slippage: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Maximum acceptable slippage tolerance for the dual liquidity addition, expressed as a decimal between 0 and 1. For example: 0.01 = 1%, 0.02 = 2%. This protects against price movements during the dual-sided operation."
    ),
  market: z
    .string()
    .describe(
      "The contract address of the Pendle market where dual-sided liquidity will be added. This operation adds both the underlying token and PT tokens simultaneously for balanced liquidity provision."
    ),
  tokenIn: z
    .string()
    .describe(
      "The contract address of the underlying ERC-20 token (not PT) that will be added as one side of the liquidity pair. This is typically the base asset like USDC, ETH, or the SY token."
    ),
  amountTokenIn: z
    .string()
    .describe(
      "The exact amount of the underlying token to add as liquidity, specified in the token's smallest denomination. This forms one side of the dual liquidity provision."
    ),
  amountPtIn: z
    .string()
    .describe(
      "The exact amount of PT (Principal Tokens) to add as the other side of the liquidity pair, specified in the token's smallest denomination. This should be balanced with the underlying token amount."
    ),
  chainId: z
    .string()
    .default("1")
    .describe(
      "The blockchain network identifier where the dual liquidity addition will be executed. Supported values: '1' (Ethereum), '137' (Polygon), '42161' (Arbitrum), '10' (Optimism)."
    ),
};

export const RemoveLiquiditySchema = {
  receiver: z
    .string()
    .describe(
      "The wallet address (0x...) that will receive the output tokens after removing liquidity from the market. This address will own the underlying assets obtained from burning LP tokens."
    ),
  slippage: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Maximum acceptable slippage tolerance for removing liquidity, expressed as a decimal between 0 and 1. For example: 0.01 = 1%, 0.03 = 3%. This protects against unfavorable rates when converting LP tokens back to underlying assets."
    ),
  market: z
    .string()
    .describe(
      "The contract address of the Pendle market from which liquidity will be removed. This is where your LP tokens are currently staked and will be burned to retrieve underlying assets."
    ),
  tokenOut: z
    .string()
    .describe(
      "The contract address of the ERC-20 token you want to receive after removing liquidity. This is typically the underlying asset (like USDC, WETH) or SY token that you'll get in exchange for your LP tokens."
    ),
  amountIn: z
    .string()
    .describe(
      "The exact amount of LP (Liquidity Provider) tokens to burn/remove, specified in the token's smallest denomination. This determines how much liquidity you're withdrawing from the market."
    ),
  chainId: z
    .string()
    .default("1")
    .describe(
      "The blockchain network identifier where the liquidity removal will be executed. Supported values: '1' (Ethereum), '137' (Polygon), '42161' (Arbitrum), '10' (Optimism)."
    ),
};

export const RemoveLiquidityDualSchema = {
  receiver: z
    .string()
    .describe(
      "The wallet address (0x...) that will receive both the underlying token and PT tokens after removing dual-sided liquidity from the market."
    ),
  slippage: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Maximum acceptable slippage tolerance for the dual liquidity removal, expressed as a decimal between 0 and 1. For example: 0.01 = 1%, 0.03 = 3%. This protects against unfavorable rates during the dual-sided withdrawal."
    ),
  market: z
    .string()
    .describe(
      "The contract address of the Pendle market from which dual-sided liquidity will be removed. The LP tokens will be burned to retrieve both underlying tokens and PT tokens proportionally."
    ),
  tokenOut: z
    .string()
    .describe(
      "The contract address of the underlying ERC-20 token you want to receive as one part of the dual withdrawal. The other part will be PT tokens from the same market."
    ),
  amountIn: z
    .string()
    .describe(
      "The exact amount of LP (Liquidity Provider) tokens to burn for dual-sided removal, specified in the token's smallest denomination. This will be split proportionally into underlying tokens and PT tokens."
    ),
  chainId: z
    .string()
    .default("1")
    .describe(
      "The blockchain network identifier where the dual liquidity removal will be executed. Supported values: '1' (Ethereum), '137' (Polygon), '42161' (Arbitrum), '10' (Optimism)."
    ),
};

export const RedeemSchema = {
  receiver: z
    .string()
    .describe(
      "The wallet address (0x...) that will receive the redeemed underlying tokens. This address will own the assets obtained from redeeming PT or YT tokens after maturity."
    ),
  slippage: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Maximum acceptable slippage tolerance for the redemption, expressed as a decimal between 0 and 1. For example: 0.005 = 0.5%, 0.01 = 1%. This protects against unfavorable rates during the redemption process."
    ),
  redeem_token: z
    .string()
    .describe(
      "The contract address of the PT (Principal Token) or YT (Yield Token) that you want to redeem. This token must be from a matured market (past expiry date) to be eligible for redemption."
    ),
  amountIn: z
    .string()
    .describe(
      "The exact amount of PT or YT tokens to redeem, specified in the token's smallest denomination. For example, to redeem 10 PT tokens (18 decimals), use '10000000000000000000'."
    ),
  tokenOut: z
    .string()
    .describe(
      "The contract address of the underlying ERC-20 token you want to receive after redemption. This is typically the original underlying asset (like USDC, WETH) that the PT/YT tokens represent claims to."
    ),
  chainId: z
    .string()
    .default("1")
    .describe(
      "The blockchain network identifier where the redemption will be executed. The redeemed tokens must be from a matured market on this chain. Supported values: '1' (Ethereum), '137' (Polygon), '42161' (Arbitrum), '10' (Optimism)."
    ),
};

export const GetAssetPricesSchema = {
  chainId: z
    .number()
    .describe(
      "The blockchain network identifier to fetch asset prices from. Use 1 for Ethereum, 137 for Polygon, 42161 for Arbitrum, or 10 for Optimism. Prices are fetched in real-time from the specified network."
    ),
  addresses: z
    .string()
    .optional()
    .describe(
      "Optional comma-separated list of token contract addresses to get prices for. For example: '0xA0b86a33E6441e...,0x2260FAC5E5542...'. If not provided, returns prices for all supported tokens on the specified chain."
    ),
};

export const GetHistoricalPricesSchema = {
  chainId: z
    .number()
    .describe(
      "The blockchain network identifier to fetch historical prices from. Use 1 for Ethereum, 137 for Polygon, 42161 for Arbitrum, or 10 for Optimism."
    ),
  address: z
    .string()
    .describe(
      "The contract address of the specific token to get historical price data for. This should be a valid ERC-20 token address that exists on the specified blockchain network."
    ),
  timeFrame: z
    .enum(["hour", "day", "week"])
    .optional()
    .default("day")
    .describe(
      "The time interval for historical data points. 'hour' provides hourly price data, 'day' provides daily price data (default), and 'week' provides weekly price data. Shorter intervals provide more granular data."
    ),
  timestampStart: z
    .string()
    .optional()
    .describe(
      "Optional start timestamp for the historical data range in Unix timestamp format (seconds since epoch). For example: '1640995200' for Jan 1, 2022. If not provided, returns recent historical data."
    ),
  timestampEnd: z
    .string()
    .optional()
    .describe(
      "Optional end timestamp for the historical data range in Unix timestamp format (seconds since epoch). For example: '1672531200' for Jan 1, 2023. If not provided, uses current timestamp as the end point."
    ),
};

export const GetAssetsSchema = {
  chainId: z
    .number()
    .describe(
      "The blockchain network identifier to fetch assets from. Use 1 for Ethereum, 137 for Polygon, 42161 for Arbitrum, or 10 for Optimism. Returns all available Pendle assets on the specified chain."
    ),
  order_by: z
    .string()
    .optional()
    .describe(
      "Optional field to sort the results by. Common options include 'name', 'symbol', 'expiry', or 'address'. Use '-' prefix for descending order (e.g., '-expiry' for newest expiry first)."
    ),
  skip: z
    .number()
    .optional()
    .describe(
      "Optional number of assets to skip for pagination. For example, use 20 to skip the first 20 results. Useful for implementing pagination in combination with the limit parameter."
    ),
  limit: z
    .number()
    .optional()
    .describe(
      "Optional maximum number of assets to return. For example, use 50 to limit results to 50 assets. Helps control response size and implement pagination. Default varies by API configuration."
    ),
  is_expired: z
    .boolean()
    .optional()
    .describe(
      "Optional filter to include or exclude expired assets. Set to true to only return expired assets (past maturity), false for only active assets, or omit to include both."
    ),
  zappable: z
    .boolean()
    .optional()
    .describe(
      "Optional filter for assets that support zapping functionality. Set to true to only return assets that can be easily swapped/zapped into, false for non-zappable assets, or omit for all assets."
    ),
  type: z
    .string()
    .optional()
    .describe(
      "Optional filter by asset type. Common values include 'PT' for Principal Tokens, 'YT' for Yield Tokens, 'SY' for Standardized Yield tokens, or specific protocol types."
    ),
  address: z
    .string()
    .optional()
    .describe(
      "Optional specific contract address to filter by. Use this to get information about a single asset by providing its exact contract address on the specified chain."
    ),
  q: z
    .string()
    .optional()
    .describe(
      "Optional search query to filter assets by name or symbol. For example, 'USDC' to find all USDC-related assets, or 'stETH' for Lido staking assets. Supports partial matching."
    ),
};

export const GetMarketsSchema = {
  chainId: z
    .number()
    .describe(
      "The blockchain network identifier to fetch Pendle markets from. Use 1 for Ethereum, 137 for Polygon, 42161 for Arbitrum, or 10 for Optimism. Returns all active markets with their PT/YT pairs, liquidity information, and expiry dates on the specified chain."
    ),
};

export interface SwapParams {
  receiver: string;
  market: string;
  slippage: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  enableAggregator?: boolean;
  aggregators?: string;
  chainId: string;
}

export interface MintParams {
  receiver: string;
  mint_token: string;
  slippage: number;
  tokenIn: string;
  amountIn: string;
  chainId: string;
}

export interface TransferLiquidityParams {
  receiver: string;
  slippage: number;
  srcMarket: string;
  dstMarket: string;
  lpAmount: string;
  ptAmount: string;
  ytAmount: string;
  zpi?: boolean;
  aggregators?: string;
  chainId: string;
}

export interface AddLiquidityParams {
  receiver: string;
  slippage: number;
  market: string;
  tokenIn: string;
  amountIn: string;
  zpi?: boolean;
  chainId: string;
}

export interface AddLiquidityDualParams {
  receiver: string;
  slippage: number;
  market: string;
  tokenIn: string;
  amountTokenIn: string;
  amountPtIn: string;
  chainId: string;
}

export interface RemoveLiquidityParams {
  receiver: string;
  slippage: number;
  market: string;
  tokenOut: string;
  amountIn: string;
  chainId: string;
}

export interface RemoveLiquidityDualParams {
  receiver: string;
  slippage: number;
  market: string;
  tokenOut: string;
  amountIn: string;
  chainId: string;
}

export interface RedeemParams {
  receiver: string;
  slippage: number;
  redeem_token: string;
  amountIn: string;
  tokenOut: string;
  chainId: string;
}

export interface GetAssetPricesParams {
  chainId: number;
  addresses?: string;
}

export interface GetHistoricalPricesParams {
  chainId: number;
  address: string;
  timeFrame?: "hour" | "day" | "week";
  timestampStart?: string;
  timestampEnd?: string;
}

export interface GetAssetsParams {
  chainId: number;
  order_by?: string;
  skip?: number;
  limit?: number;
  is_expired?: boolean;
  zappable?: boolean;
  type?: string;
  address?: string;
  q?: string;
}

export interface GetMarketsParams {
  chainId: number;
}

export interface AssetInfo {
  name: string;
  decimals: number;
  address: string;
  symbol: string;
  tags: string[];
  expiry: string;
}

export interface MarketInfo {
  name: string;
  address: string;
  expiry: string;
  pt: string;
  yt: string;
  sy: string;
  underlyingAsset: string;
}

export type SwapData = { amountOut: string; priceImpact: number };

export type MintData = { amountOut: string; priceImpact: number };

export type TransferLiquidityData = {
  amountLpOut: string;
  amountYtOut?: string;
  priceImpact: number;
};

export type AddLiquidityData = {
  amountLpOut: string;
  amountYtOut?: string;
  priceImpact: number;
};

export type AddLiquidityDualData = { amountOut: string; priceImpact: number };

export type RemoveLiquidityData = { amountOut: string; priceImpact: number };

export type RemoveLiquidityDualData = {
  amountTokenOut: string;
  amountPtOut: string;
  priceImpact: number;
};

export type RedeemData = { amountOut: string; priceImpact: number };

export type GetAssetPricesData = { prices: Record<string, number> };

export type GetHistoricalPricesData = {
  total: number;
  currency: string;
  timeFrame: string;
  timestamp_start: number;
  timestamp_end: number;
  results: string;
};

export type GetAssetsData = {
  assets: AssetInfo[];
};

export type GetMarketsData = {
  markets: MarketInfo[];
};
