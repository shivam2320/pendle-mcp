import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHelloTool } from "./tools/hello-world.js";
import { registerHelloPrompt } from "./prompts/hello-world.js";
import { registerHelloResource } from "./resources/hello-world.js";
import { registerMintTools } from "./tools/mint.js";
import { registerSwapTools } from "./tools/swap.js";
import { registerTransferLiquidityTools } from "./tools/transfer-liquidity.js";
import { registerAddLiquidityTools } from "./tools/add-liquidity.js";
import { registerAddLiquidityDualTools } from "./tools/add-liquidity-dual.js";
import { registerRemoveLiquidityTools } from "./tools/remove-liquidity.js";
import { registerRemoveLiquidityDualTools } from "./tools/remove-liquidity-dual.js";
import { registerRedeemTools } from "./tools/redeem.js";
import { registerAssetPricesTools } from "./tools/asset-prices.js";
import { registerAssetsTools } from "./tools/assets.js";
import { registerMarketsTools } from "./tools/markets.js";
import {
  createWalletClient,
  http,
  createPublicClient,
  PublicClient,
  getContract,
  serializeTransaction,
  Address,
  encodeFunctionData,
  parseUnits,
} from "viem";
import { mainnet } from "viem/chains";
import { createMcpServer, getAuthContext } from "@osiris-ai/sdk";
import { EVMWalletClient } from "@osiris-ai/web3-evm-sdk";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  createSuccessResponse,
  createErrorResponse,
  TokenInfo,
} from "./utils/types.js";
import {
  SwapData,
  SwapParams,
  MintData,
  MintParams,
  TransferLiquidityData,
  TransferLiquidityParams,
  AddLiquidityData,
  AddLiquidityParams,
  AddLiquidityDualData,
  AddLiquidityDualParams,
  RemoveLiquidityData,
  RemoveLiquidityParams,
  RemoveLiquidityDualData,
  RemoveLiquidityDualParams,
  RedeemData,
  RedeemParams,
  GetAssetPricesData,
  GetAssetPricesParams,
  GetHistoricalPricesData,
  GetHistoricalPricesParams,
  GetAssetsData,
  GetAssetsParams,
  GetMarketsData,
  GetMarketsParams,
} from "./schema/index.js";

import { callSDK } from "./utils/helper.js";
import { ROUTER_ABI } from "./utils/ROUTER_ABI.js";
import z from "zod";
import { ERC20_ABI } from "./utils/ERC20_ABI.js";
import { ROUTER_ADDRESS } from "./utils/constants.js";

export class PendleMCP {
  hubBaseUrl: string;
  publicClient: PublicClient;
  walletToSession: Record<string, string> = {};
  chain: string;

  constructor(hubBaseUrl: string) {
    this.hubBaseUrl = hubBaseUrl;
    this.publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });
    this.chain = "evm:eip155:1";
  }

  /**
   * Get user addresses
   */
  async getUserAddresses(): Promise<CallToolResult> {
    try {
      const { token, context } = getAuthContext("osiris");
      if (!token || !context) {
        throw new Error("No token or context found");
      }

      const client = new EVMWalletClient(
        this.hubBaseUrl,
        token.access_token,
        context.deploymentId
      );
      const walletRecords = await client.getWalletRecords();
      if (walletRecords.length === 0) {
        throw new Error("No wallet record found");
      }

      const addresses = walletRecords.map((walletRecord) =>
        walletRecord.accounts.addresses.map((address) => ({
          chains: address.chains,
          address: address.address,
        }))
      );
      return createSuccessResponse("Successfully got user addresses", {
        addresses,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to get user addresses";
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * Choose wallet for current session
   */
  async chooseWallet(address: string): Promise<CallToolResult> {
    try {
      const { token, context } = getAuthContext("osiris");
      if (!token || !context) {
        throw new Error("No token or context found");
      }
      const client = new EVMWalletClient(
        this.hubBaseUrl,
        token.access_token,
        context.deploymentId
      );
      const walletRecords = await client.getWalletRecords();
      if (walletRecords.length === 0) {
        throw new Error("No wallet record found");
      }
      const walletRecord = walletRecords.find((walletRecord) =>
        walletRecord.accounts.addresses.some(
          (_address) => _address.address.toLowerCase() === address.toLowerCase()
        )
      );
      if (!walletRecord) {
        throw new Error("Wallet record not found");
      }
      this.walletToSession[context.sessionId] = address;

      return createSuccessResponse("Successfully chose wallet", {
        walletRecordId: walletRecord.id,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to choose wallet";
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * Get detailed token information
   */
  async getTokenInfo(tokenAddress: Address): Promise<TokenInfo> {
    try {
      const tokenContract = getContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        client: this.publicClient,
      });

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.read.name(),
        tokenContract.read.symbol(),
        tokenContract.read.decimals(),
        tokenContract.read.totalSupply(),
      ]);

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals,
        totalSupply,
      };
    } catch (error) {
      throw new Error(`Failed to get token info: ${error}`);
    }
  }

  async approveToken(
    tokenAddress: Address,
    amount: bigint
  ): Promise<CallToolResult> {
    const { token, context } = getAuthContext("osiris");
    if (!token || !context) {
      throw new Error("No token or context found");
    }

    const wallet = this.walletToSession[context.sessionId];
    if (!wallet) {
      const error = new Error(
        "No wallet found, you need to choose a wallet first with chooseWallet"
      );
      error.name = "NoWalletFoundError";
      return createErrorResponse(error);
    }
    const client = new EVMWalletClient(
      this.hubBaseUrl,
      token.access_token,
      context.deploymentId
    );

    const account = await client.getViemAccount(wallet, this.chain);

    if (!account) {
      const error = new Error(
        "No account found, you need to choose a wallet first with chooseWallet"
      );
      error.name = "NoAccountFoundError";
      return createErrorResponse(error);
    }

    try {
      const walletClient = createWalletClient({
        account: account,
        chain: mainnet,
        transport: http(),
      });

      const tokenInInfo = await this.getTokenInfo(tokenAddress);
      const amountInWei = parseUnits(amount.toString(), tokenInInfo.decimals);

      const preparedTx = await this.publicClient.prepareTransactionRequest({
        chain: mainnet,
        account: account,
        to: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ROUTER_ADDRESS, amountInWei],
        gas: 800000n,
      });
      console.log(
        JSON.stringify(
          {
            chain: mainnet,
            account: account,
            to: tokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [ROUTER_ADDRESS, amountInWei],
            gas: 8000000n,
          },
          (_, v) => (typeof v === "bigint" ? v.toString() : v),
          2
        )
      );
      console.log(
        JSON.stringify(
          preparedTx,
          (_, v) => (typeof v === "bigint" ? v.toString() : v),
          2
        )
      );
      const serializedTx = serializeTransaction({
        ...preparedTx,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ROUTER_ADDRESS, amountInWei],
        }),
      } as any);

      const signedTx = await client.signTransaction(
        ERC20_ABI,
        serializedTx,
        this.chain,
        account.address
      );

      const hash = await walletClient.sendRawTransaction({
        serializedTransaction: signedTx as `0x${string}`,
      });
      return createSuccessResponse("Successfully approved token", {
        hash: hash,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      const errorMessage = error.message || "Failed to approve token";
      return createErrorResponse(errorMessage);
    }
  }

  async swap(params: SwapParams): Promise<CallToolResult> {
    try {
      const { token, context } = getAuthContext("osiris");
      if (!token || !context) {
        throw new Error("No token or context found");
      }
      console.log(
        JSON.stringify(
          {
            hubBaseUrl: this.hubBaseUrl,
            accessToken: token.access_token,
            deploymentId: context.deploymentId,
          },
          null,
          2
        )
      );

      const wallet = this.walletToSession[context.sessionId];
      if (!wallet) {
        const error = new Error(
          "No wallet found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoWalletFoundError";
        return createErrorResponse(error);
      }

      const client = new EVMWalletClient(
        this.hubBaseUrl,
        token.access_token,
        context.deploymentId
      );

      const account = await client.getViemAccount(wallet, this.chain);
      if (!account) {
        const error = new Error(
          "No account found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoAccountFoundError";
        return createErrorResponse(error);
      }

      const {
        receiver,
        slippage,
        market,
        tokenIn,
        tokenOut,
        amountIn,
        chainId,
      } = params;

      const resp = await callSDK<SwapData>(
        `/v2/sdk/${chainId}/markets/${market}/swap`,
        {
          receiver,
          slippage,
          tokenIn,
          tokenOut,
          amountIn,
        }
      );

      const walletClient = createWalletClient({
        account: account,
        chain: mainnet,
        transport: http(),
      });

      const preparedTx = await walletClient.prepareTransactionRequest({
        to: resp.data.tx.to as `0x${string}`,
        abi: ROUTER_ABI,
        data: resp.data.tx.data as `0x${string}`,
        gas: 800000n,
      });

      const serializedTx = serializeTransaction(preparedTx as any);
      const signedTx = await client.signTransaction(
        ROUTER_ABI,
        serializedTx,
        this.chain,
        account.address
      );
      const hash = await walletClient.sendRawTransaction({
        serializedTransaction: signedTx as `0x${string}`,
      });
      return createSuccessResponse("Successfully swapped tokens", {
        hash: hash,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      throw new Error(`Swap failed: ${error}`);
    }
  }

  async mint(params: MintParams): Promise<CallToolResult> {
    try {
      const { token, context } = getAuthContext("osiris");
      if (!token || !context) {
        throw new Error("No token or context found");
      }
      console.log(
        JSON.stringify(
          {
            hubBaseUrl: this.hubBaseUrl,
            accessToken: token.access_token,
            deploymentId: context.deploymentId,
          },
          null,
          2
        )
      );

      const wallet = this.walletToSession[context.sessionId];
      if (!wallet) {
        const error = new Error(
          "No wallet found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoWalletFoundError";
        return createErrorResponse(error);
      }

      const client = new EVMWalletClient(
        this.hubBaseUrl,
        token.access_token,
        context.deploymentId
      );

      const account = await client.getViemAccount(wallet, this.chain);
      if (!account) {
        const error = new Error(
          "No account found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoAccountFoundError";
        return createErrorResponse(error);
      }

      const { receiver, mint_token, slippage, tokenIn, amountIn, chainId } =
        params;

      const resp = await callSDK<MintData>(`/v2/sdk/${chainId}/mint`, {
        receiver,
        mint_token,
        slippage,
        tokenIn,
        amountIn,
      });

      const walletClient = createWalletClient({
        account: account,
        chain: mainnet,
        transport: http(),
      });

      const preparedTx = await walletClient.prepareTransactionRequest({
        to: resp.data.tx.to as `0x${string}`,
        abi: ROUTER_ABI,
        data: resp.data.tx.data as `0x${string}`,
        gas: 800000n,
      });

      const serializedTx = serializeTransaction(preparedTx as any);
      const signedTx = await client.signTransaction(
        ROUTER_ABI,
        serializedTx,
        this.chain,
        account.address
      );
      const hash = await walletClient.sendRawTransaction({
        serializedTransaction: signedTx as `0x${string}`,
      });
      return createSuccessResponse("Successfully minted tokens", {
        hash: hash,
        amountOut: resp.data.data.amountOut,
        priceImpact: resp.data.data.priceImpact,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      throw new Error(`Mint failed: ${error}`);
    }
  }

  async transferLiquidity(
    params: TransferLiquidityParams
  ): Promise<CallToolResult> {
    try {
      const { token, context } = getAuthContext("osiris");
      if (!token || !context) {
        throw new Error("No token or context found");
      }
      console.log(
        JSON.stringify(
          {
            hubBaseUrl: this.hubBaseUrl,
            accessToken: token.access_token,
            deploymentId: context.deploymentId,
          },
          null,
          2
        )
      );

      const wallet = this.walletToSession[context.sessionId];
      if (!wallet) {
        const error = new Error(
          "No wallet found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoWalletFoundError";
        return createErrorResponse(error);
      }

      const client = new EVMWalletClient(
        this.hubBaseUrl,
        token.access_token,
        context.deploymentId
      );

      const account = await client.getViemAccount(wallet, this.chain);
      if (!account) {
        const error = new Error(
          "No account found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoAccountFoundError";
        return createErrorResponse(error);
      }

      const {
        receiver,
        slippage,
        srcMarket,
        dstMarket,
        lpAmount,
        ptAmount,
        ytAmount,
        zpi = false,
        aggregators,
        chainId,
      } = params;

      const requestParams: any = {
        receiver,
        slippage,
        dstMarket,
        lpAmount,
        ptAmount,
        ytAmount,
      };

      if (zpi) {
        requestParams.zpi = zpi;
      }

      if (aggregators) {
        requestParams.aggregators = aggregators;
      }

      const resp = await callSDK<TransferLiquidityData>(
        `/v2/sdk/${chainId}/markets/${srcMarket}/transfer-liquidity`,
        requestParams
      );

      const walletClient = createWalletClient({
        account: account,
        chain: mainnet,
        transport: http(),
      });

      const preparedTx = await walletClient.prepareTransactionRequest({
        to: resp.data.tx.to as `0x${string}`,
        abi: ROUTER_ABI,
        data: resp.data.tx.data as `0x${string}`,
        gas: 800000n,
      });

      const serializedTx = serializeTransaction(preparedTx as any);
      const signedTx = await client.signTransaction(
        ROUTER_ABI,
        serializedTx,
        this.chain,
        account.address
      );
      const hash = await walletClient.sendRawTransaction({
        serializedTransaction: signedTx as `0x${string}`,
      });
      return createSuccessResponse("Successfully transferred liquidity", {
        hash: hash,
        amountLpOut: resp.data.data.amountLpOut,
        amountYtOut: resp.data.data.amountYtOut,
        priceImpact: resp.data.data.priceImpact,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      throw new Error(`Transfer liquidity failed: ${error}`);
    }
  }

  async addLiquidity(params: AddLiquidityParams): Promise<CallToolResult> {
    try {
      const { token, context } = getAuthContext("osiris");
      if (!token || !context) {
        throw new Error("No token or context found");
      }
      console.log(
        JSON.stringify(
          {
            hubBaseUrl: this.hubBaseUrl,
            accessToken: token.access_token,
            deploymentId: context.deploymentId,
          },
          null,
          2
        )
      );

      const wallet = this.walletToSession[context.sessionId];
      if (!wallet) {
        const error = new Error(
          "No wallet found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoWalletFoundError";
        return createErrorResponse(error);
      }

      const client = new EVMWalletClient(
        this.hubBaseUrl,
        token.access_token,
        context.deploymentId
      );

      const account = await client.getViemAccount(wallet, this.chain);
      if (!account) {
        const error = new Error(
          "No account found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoAccountFoundError";
        return createErrorResponse(error);
      }

      const {
        receiver,
        slippage,
        market,
        tokenIn,
        amountIn,
        zpi = false,
        chainId,
      } = params;

      const requestParams: any = {
        receiver,
        slippage,
        tokenIn,
        amountIn,
      };

      if (zpi) {
        requestParams.zpi = zpi;
      }

      const resp = await callSDK<AddLiquidityData>(
        `/v2/sdk/${chainId}/markets/${market}/add-liquidity`,
        requestParams
      );

      const walletClient = createWalletClient({
        account: account,
        chain: mainnet,
        transport: http(),
      });

      const preparedTx = await walletClient.prepareTransactionRequest({
        to: resp.data.tx.to as `0x${string}`,
        abi: ROUTER_ABI,
        data: resp.data.tx.data as `0x${string}`,
        gas: 800000n,
      });

      const serializedTx = serializeTransaction(preparedTx as any);
      const signedTx = await client.signTransaction(
        ROUTER_ABI,
        serializedTx,
        this.chain,
        account.address
      );
      const hash = await walletClient.sendRawTransaction({
        serializedTransaction: signedTx as `0x${string}`,
      });
      return createSuccessResponse("Successfully added liquidity", {
        hash: hash,
        amountLpOut: resp.data.data.amountLpOut,
        amountYtOut: resp.data.data.amountYtOut,
        priceImpact: resp.data.data.priceImpact,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      throw new Error(`Add liquidity failed: ${error}`);
    }
  }

  async addLiquidityDual(
    params: AddLiquidityDualParams
  ): Promise<CallToolResult> {
    try {
      const { token, context } = getAuthContext("osiris");
      if (!token || !context) {
        throw new Error("No token or context found");
      }
      console.log(
        JSON.stringify(
          {
            hubBaseUrl: this.hubBaseUrl,
            accessToken: token.access_token,
            deploymentId: context.deploymentId,
          },
          null,
          2
        )
      );

      const wallet = this.walletToSession[context.sessionId];
      if (!wallet) {
        const error = new Error(
          "No wallet found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoWalletFoundError";
        return createErrorResponse(error);
      }

      const client = new EVMWalletClient(
        this.hubBaseUrl,
        token.access_token,
        context.deploymentId
      );

      const account = await client.getViemAccount(wallet, this.chain);
      if (!account) {
        const error = new Error(
          "No account found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoAccountFoundError";
        return createErrorResponse(error);
      }

      const {
        receiver,
        slippage,
        market,
        tokenIn,
        amountTokenIn,
        amountPtIn,
        chainId,
      } = params;

      const resp = await callSDK<AddLiquidityDualData>(
        `/v1/sdk/${chainId}/markets/${market}/add-liquidity-dual`,
        {
          receiver,
          slippage,
          tokenIn,
          amountTokenIn,
          amountPtIn,
        }
      );

      const walletClient = createWalletClient({
        account: account,
        chain: mainnet,
        transport: http(),
      });

      const preparedTx = await walletClient.prepareTransactionRequest({
        to: resp.data.tx.to as `0x${string}`,
        abi: ROUTER_ABI,
        data: resp.data.tx.data as `0x${string}`,
        gas: 800000n,
      });

      const serializedTx = serializeTransaction(preparedTx as any);
      const signedTx = await client.signTransaction(
        ROUTER_ABI,
        serializedTx,
        this.chain,
        account.address
      );
      const hash = await walletClient.sendRawTransaction({
        serializedTransaction: signedTx as `0x${string}`,
      });
      return createSuccessResponse("Successfully added dual liquidity", {
        hash: hash,
        amountOut: resp.data.data.amountOut,
        priceImpact: resp.data.data.priceImpact,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      throw new Error(`Add dual liquidity failed: ${error}`);
    }
  }

  async removeLiquidity(
    params: RemoveLiquidityParams
  ): Promise<CallToolResult> {
    try {
      const { token, context } = getAuthContext("osiris");
      if (!token || !context) {
        throw new Error("No token or context found");
      }
      console.log(
        JSON.stringify(
          {
            hubBaseUrl: this.hubBaseUrl,
            accessToken: token.access_token,
            deploymentId: context.deploymentId,
          },
          null,
          2
        )
      );

      const wallet = this.walletToSession[context.sessionId];
      if (!wallet) {
        const error = new Error(
          "No wallet found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoWalletFoundError";
        return createErrorResponse(error);
      }

      const client = new EVMWalletClient(
        this.hubBaseUrl,
        token.access_token,
        context.deploymentId
      );

      const account = await client.getViemAccount(wallet, this.chain);
      if (!account) {
        const error = new Error(
          "No account found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoAccountFoundError";
        return createErrorResponse(error);
      }

      const { receiver, slippage, market, tokenOut, amountIn, chainId } =
        params;

      const resp = await callSDK<RemoveLiquidityData>(
        `/v2/sdk/${chainId}/markets/${market}/remove-liquidity`,
        {
          receiver,
          slippage,
          tokenOut,
          amountIn,
        }
      );

      const walletClient = createWalletClient({
        account: account,
        chain: mainnet,
        transport: http(),
      });

      const preparedTx = await walletClient.prepareTransactionRequest({
        to: resp.data.tx.to as `0x${string}`,
        abi: ROUTER_ABI,
        data: resp.data.tx.data as `0x${string}`,
        gas: 800000n,
      });

      const serializedTx = serializeTransaction(preparedTx as any);
      const signedTx = await client.signTransaction(
        ROUTER_ABI,
        serializedTx,
        this.chain,
        account.address
      );
      const hash = await walletClient.sendRawTransaction({
        serializedTransaction: signedTx as `0x${string}`,
      });
      return createSuccessResponse("Successfully removed liquidity", {
        hash: hash,
        amountOut: resp.data.data.amountOut,
        priceImpact: resp.data.data.priceImpact,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      throw new Error(`Remove liquidity failed: ${error}`);
    }
  }

  async removeLiquidityDual(
    params: RemoveLiquidityDualParams
  ): Promise<CallToolResult> {
    try {
      const { token, context } = getAuthContext("osiris");
      if (!token || !context) {
        throw new Error("No token or context found");
      }
      console.log(
        JSON.stringify(
          {
            hubBaseUrl: this.hubBaseUrl,
            accessToken: token.access_token,
            deploymentId: context.deploymentId,
          },
          null,
          2
        )
      );

      const wallet = this.walletToSession[context.sessionId];
      if (!wallet) {
        const error = new Error(
          "No wallet found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoWalletFoundError";
        return createErrorResponse(error);
      }

      const client = new EVMWalletClient(
        this.hubBaseUrl,
        token.access_token,
        context.deploymentId
      );

      const account = await client.getViemAccount(wallet, this.chain);
      if (!account) {
        const error = new Error(
          "No account found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoAccountFoundError";
        return createErrorResponse(error);
      }

      const { receiver, slippage, market, tokenOut, amountIn, chainId } =
        params;

      const resp = await callSDK<RemoveLiquidityDualData>(
        `/v1/sdk/${chainId}/markets/${market}/remove-liquidity-dual`,
        {
          receiver,
          slippage,
          tokenOut,
          amountIn,
        }
      );

      const walletClient = createWalletClient({
        account: account,
        chain: mainnet,
        transport: http(),
      });

      const preparedTx = await walletClient.prepareTransactionRequest({
        to: resp.data.tx.to as `0x${string}`,
        abi: ROUTER_ABI,
        data: resp.data.tx.data as `0x${string}`,
        gas: 800000n,
      });

      const serializedTx = serializeTransaction(preparedTx as any);
      const signedTx = await client.signTransaction(
        ROUTER_ABI,
        serializedTx,
        this.chain,
        account.address
      );
      const hash = await walletClient.sendRawTransaction({
        serializedTransaction: signedTx as `0x${string}`,
      });
      return createSuccessResponse("Successfully removed dual liquidity", {
        hash: hash,
        amountTokenOut: resp.data.data.amountTokenOut,
        amountPtOut: resp.data.data.amountPtOut,
        priceImpact: resp.data.data.priceImpact,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      throw new Error(`Remove dual liquidity failed: ${error}`);
    }
  }

  async redeem(params: RedeemParams): Promise<CallToolResult> {
    try {
      const { token, context } = getAuthContext("osiris");
      if (!token || !context) {
        throw new Error("No token or context found");
      }
      console.log(
        JSON.stringify(
          {
            hubBaseUrl: this.hubBaseUrl,
            accessToken: token.access_token,
            deploymentId: context.deploymentId,
          },
          null,
          2
        )
      );

      const wallet = this.walletToSession[context.sessionId];
      if (!wallet) {
        const error = new Error(
          "No wallet found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoWalletFoundError";
        return createErrorResponse(error);
      }

      const client = new EVMWalletClient(
        this.hubBaseUrl,
        token.access_token,
        context.deploymentId
      );

      const account = await client.getViemAccount(wallet, this.chain);
      if (!account) {
        const error = new Error(
          "No account found, you need to choose a wallet first with chooseWallet"
        );
        error.name = "NoAccountFoundError";
        return createErrorResponse(error);
      }

      const { receiver, slippage, redeem_token, amountIn, tokenOut, chainId } =
        params;

      const resp = await callSDK<RedeemData>(`/v2/sdk/${chainId}/redeem`, {
        receiver,
        slippage,
        yt: redeem_token,
        amountIn,
        tokenOut,
      });

      const walletClient = createWalletClient({
        account: account,
        chain: mainnet,
        transport: http(),
      });

      const preparedTx = await walletClient.prepareTransactionRequest({
        to: resp.data.tx.to as `0x${string}`,
        abi: ROUTER_ABI,
        data: resp.data.tx.data as `0x${string}`,
        gas: 800000n,
      });

      const serializedTx = serializeTransaction(preparedTx as any);
      const signedTx = await client.signTransaction(
        ROUTER_ABI,
        serializedTx,
        this.chain,
        account.address
      );
      const hash = await walletClient.sendRawTransaction({
        serializedTransaction: signedTx as `0x${string}`,
      });
      return createSuccessResponse("Successfully redeemed tokens", {
        hash: hash,
        amountOut: resp.data.data.amountOut,
        priceImpact: resp.data.data.priceImpact,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      throw new Error(`Redeem failed: ${error}`);
    }
  }

  async getAssetPrices(params: GetAssetPricesParams): Promise<CallToolResult> {
    try {
      const { chainId, addresses } = params;

      const query: any = {};
      if (addresses) {
        query.addresses = addresses;
      }

      const targetPath = `/v1/${chainId}/assets/prices`;

      const resp = await callSDK<GetAssetPricesData>(targetPath, query);

      return createSuccessResponse("Successfully retrieved asset prices", {
        prices: resp.data.data.prices,
        chainId,
        addresses: addresses || "all",
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      throw new Error(`Get asset prices failed: ${error}`);
    }
  }

  async getHistoricalPrices(
    params: GetHistoricalPricesParams
  ): Promise<CallToolResult> {
    try {
      const {
        chainId,
        address,
        timeFrame = "day",
        timestampStart,
        timestampEnd,
      } = params;

      const query: any = {
        timeFrame,
      };

      if (timestampStart) {
        query.timestampStart = timestampStart;
      }

      if (timestampEnd) {
        query.timestampEnd = timestampEnd;
      }

      const targetPath = `/v4/${chainId}/prices/${address}/ohlcv`;

      const resp = await callSDK<GetHistoricalPricesData>(targetPath, query);

      return createSuccessResponse("Successfully retrieved historical prices", {
        total: resp.data.data.total,
        currency: resp.data.data.currency,
        timeFrame: resp.data.data.timeFrame,
        timestamp_start: resp.data.data.timestamp_start,
        timestamp_end: resp.data.data.timestamp_end,
        results: resp.data.data.results,
        address,
        chainId,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      throw new Error(`Get historical prices failed: ${error}`);
    }
  }

  async getAssets(params: GetAssetsParams): Promise<CallToolResult> {
    try {
      const {
        chainId,
        order_by,
        skip,
        limit,
        is_expired,
        zappable,
        type,
        address,
        q,
      } = params;

      const query: any = {};

      if (order_by) query.order_by = order_by;
      if (skip !== undefined) query.skip = skip;
      if (limit !== undefined) query.limit = limit;
      if (is_expired !== undefined) query.is_expired = is_expired;
      if (zappable !== undefined) query.zappable = zappable;
      if (type) query.type = type;
      if (address) query.address = address;
      if (q) query.q = q;

      const targetPath = `/v3/${chainId}/assets/all`;

      const resp = await callSDK<GetAssetsData>(targetPath, query);

      return createSuccessResponse("Successfully retrieved assets", {
        assets: resp.data.assets,
        chainId,
        total: resp.data.assets.length,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      throw new Error(`Get assets failed: ${error}`);
    }
  }

  async getMarkets(params: GetMarketsParams): Promise<CallToolResult> {
    try {
      const { chainId } = params;

      const targetPath = `/v1/${chainId}/markets/active`;

      const data = await callSDK<GetMarketsData>(targetPath);

      return createSuccessResponse("Successfully retrieved active markets", {
        markets: data.data.markets,
        chainId,
        total: data.data.markets.length,
      });
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return createErrorResponse(error.response.data.error);
      }
      throw new Error(`Get markets failed: ${error}`);
    }
  }

  configureServer(server: McpServer): void {
    registerHelloTool(server);
    registerHelloPrompt(server);
    registerHelloResource(server);
    server.tool(
      "getUserAddresses",
      "Get user addresses, you can choose a wallet with chooseWallet",
      {},
      async () => {
        const addresses = await this.getUserAddresses();
        return addresses;
      }
    );
    server.tool(
      "chooseWallet",
      "Choose a wallet, you can get user addresses with getUserAddresses",
      {
        address: z.string(),
      },
      async ({ address }) => {
        const wallet = await this.chooseWallet(address as Address);
        return wallet;
      }
    );
    server.tool(
      "approveToken",
      "Approve token spending",
      {
        tokenAddress: z.string(),
        amount: z.string(),
      },
      async ({ tokenAddress, amount }) => {
        const allowance = await this.approveToken(
          tokenAddress as Address,
          BigInt(amount)
        );
        return allowance;
      }
    );
    registerMintTools(server, this);
    registerSwapTools(server, this);
    registerTransferLiquidityTools(server, this);
    registerAddLiquidityTools(server, this);
    registerAddLiquidityDualTools(server, this);
    registerRemoveLiquidityTools(server, this);
    registerRemoveLiquidityDualTools(server, this);
    registerRedeemTools(server, this);
    registerAssetPricesTools(server, this);
    registerAssetsTools(server, this);
    registerMarketsTools(server, this);
  }
}
