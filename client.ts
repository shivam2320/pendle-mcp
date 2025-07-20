import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHelloTool } from "./tools/hello-world.js";
import { registerHelloPrompt } from "./prompts/hello-world.js";
import { registerHelloResource } from "./resources/hello-world.js";
import {
  createWalletClient,
  http,
  createPublicClient,
  PublicClient,
} from "viem";
import { mainnet } from "viem/chains";
import { createMcpServer, getAuthContext } from "@osiris-ai/sdk";
import { EVMWalletClient } from "@osiris-ai/web3-evm-sdk";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createSuccessResponse, createErrorResponse } from "./utils/types.js";
import { SwapData, SwapParams } from "./schema/index.js";
import { MARKET_ADDRESS } from "./utils/constants.js";
import { callSDK } from "./utils/helper.js";

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

      const { receiver, slippage, tokenIn, tokenOut, amountIn } = params;

      const resp = await callSDK<SwapData>(
        `/v2/sdk/1/markets/${MARKET_ADDRESS}/swap`,
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

      const hash = await walletClient.sendTransaction(resp.data.tx as any);
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

  configureServer(server: McpServer): void {
    registerHelloTool(server);
    registerHelloPrompt(server);
    registerHelloResource(server);
  }
}
