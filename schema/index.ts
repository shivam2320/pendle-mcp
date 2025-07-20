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
};

export interface SwapParams {
  receiver: string;
  slippage: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
}

export type SwapData = { amountOut: string; priceImpact: number };
