import { z } from "zod";

export const HelloToolSchema = {
  name: z.string().default("World").describe("Name to greet"),
};

export const HelloPromptSchema = {
  topic: z.string(),
};

export const SwapSchema = {
  receiver: z.string(),
  market: z.string(),
  slippage: z.number(),
  tokenIn: z.string(),
  tokenOut: z.string(),
  amountIn: z.string(),
  chainId: z.string().optional().default("1"),
};

export const MintSchema = {
  receiver: z.string(),
  mint_token: z.string(),
  slippage: z.number(),
  tokenIn: z.string(),
  amountIn: z.string(),
  chainId: z.string().optional().default("1"),
};

export const TransferLiquiditySchema = {
  receiver: z.string(),
  slippage: z.number(),
  srcMarket: z.string(),
  dstMarket: z.string(),
  lpAmount: z.string(),
  ptAmount: z.string(),
  ytAmount: z.string(),
  zpi: z.boolean().optional().default(false),
  aggregators: z.string().optional(),
  chainId: z.string().optional().default("1"),
};

export const AddLiquiditySchema = {
  receiver: z.string(),
  slippage: z.number(),
  market: z.string(),
  tokenIn: z.string(),
  amountIn: z.string(),
  zpi: z.boolean().optional().default(false),
  chainId: z.string().optional().default("1"),
};

export const AddLiquidityDualSchema = {
  receiver: z.string(),
  slippage: z.number(),
  market: z.string(),
  tokenIn: z.string(),
  amountTokenIn: z.string(),
  amountPtIn: z.string(),
  chainId: z.string().optional().default("1"),
};

export const RemoveLiquiditySchema = {
  receiver: z.string(),
  slippage: z.number(),
  market: z.string(),
  tokenOut: z.string(),
  amountIn: z.string(),
  chainId: z.string().optional().default("1"),
};

export const RemoveLiquidityDualSchema = {
  receiver: z.string(),
  slippage: z.number(),
  market: z.string(),
  tokenOut: z.string(),
  amountIn: z.string(),
  chainId: z.string().optional().default("1"),
};

export const RedeemSchema = {
  receiver: z.string(),
  slippage: z.number(),
  redeem_token: z.string(),
  amountIn: z.string(),
  tokenOut: z.string(),
  chainId: z.string().optional().default("1"),
};

export const GetAssetPricesSchema = {
  chainId: z.number(),
  addresses: z.string().optional(),
};

export const GetHistoricalPricesSchema = {
  chainId: z.number(),
  address: z.string(),
  timeFrame: z.enum(["hour", "day", "week"]).optional().default("day"),
  timestampStart: z.string().optional(),
  timestampEnd: z.string().optional(),
};

export const GetAssetsSchema = {
  chainId: z.number(),
  order_by: z.string().optional(),
  skip: z.number().optional(),
  limit: z.number().optional(),
  is_expired: z.boolean().optional(),
  zappable: z.boolean().optional(),
  type: z.string().optional(),
  address: z.string().optional(),
  q: z.string().optional(),
};

export const GetMarketsSchema = {
  chainId: z.number(),
};

export interface SwapParams {
  receiver: string;
  market: string;
  slippage: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  chainId?: string;
}

export interface MintParams {
  receiver: string;
  mint_token: string;
  slippage: number;
  tokenIn: string;
  amountIn: string;
  chainId?: string;
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
  chainId?: string;
}

export interface AddLiquidityParams {
  receiver: string;
  slippage: number;
  market: string;
  tokenIn: string;
  amountIn: string;
  zpi?: boolean;
  chainId?: string;
}

export interface AddLiquidityDualParams {
  receiver: string;
  slippage: number;
  market: string;
  tokenIn: string;
  amountTokenIn: string;
  amountPtIn: string;
  chainId?: string;
}

export interface RemoveLiquidityParams {
  receiver: string;
  slippage: number;
  market: string;
  tokenOut: string;
  amountIn: string;
  chainId?: string;
}

export interface RemoveLiquidityDualParams {
  receiver: string;
  slippage: number;
  market: string;
  tokenOut: string;
  amountIn: string;
  chainId?: string;
}

export interface RedeemParams {
  receiver: string;
  slippage: number;
  redeem_token: string;
  amountIn: string;
  tokenOut: string;
  chainId?: string;
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

export type GetAssetsData = { assets: AssetInfo[] };

export type GetMarketsData = { markets: MarketInfo[] };
