import { z } from "zod";

export const HelloToolSchema = {
  name: z.string().default("World").describe("Name to greet"),
};

export const HelloPromptSchema = {
  topic: z.string(),
};

export const SwapSchema = {
  receiver: z.string(),
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

export interface SwapParams {
  receiver: string;
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

export type SwapData = { amountOut: string; priceImpact: number };

export type MintData = { amountOut: string; priceImpact: number };
