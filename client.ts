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
import {
  createWalletClient,
  http,
  createPublicClient,
  PublicClient,
  serializeTransaction,
} from "viem";
import { mainnet } from "viem/chains";
import { createMcpServer, getAuthContext } from "@osiris-ai/sdk";
import { EVMWalletClient } from "@osiris-ai/web3-evm-sdk";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createSuccessResponse, createErrorResponse } from "./utils/types.js";
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
} from "./schema/index.js";
import { callSDK } from "./utils/helper.js";
import { ROUTER_ABI } from "./utils/ROUTER_ABI.js";

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
        gas: 15000000n,
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

      const {
        receiver,
        mint_token,
        slippage,
        tokenIn,
        amountIn,
        chainId = "1",
      } = params;

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
        gas: 15000000n,
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
        chainId = "1",
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
        gas: 15000000n,
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
        chainId = "1",
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
        gas: 15000000n,
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
        chainId = "1",
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
        gas: 15000000n,
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

      const {
        receiver,
        slippage,
        market,
        tokenOut,
        amountIn,
        chainId = "1",
      } = params;

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
        gas: 15000000n,
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

      const {
        receiver,
        slippage,
        market,
        tokenOut,
        amountIn,
        chainId = "1",
      } = params;

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
        gas: 15000000n,
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

  configureServer(server: McpServer): void {
    registerHelloTool(server);
    registerHelloPrompt(server);
    registerHelloResource(server);
    registerMintTools(server, this);
    registerSwapTools(server, this);
    registerTransferLiquidityTools(server, this);
    registerAddLiquidityTools(server, this);
    registerAddLiquidityDualTools(server, this);
    registerRemoveLiquidityTools(server, this);
    registerRemoveLiquidityDualTools(server, this);
  }
}
