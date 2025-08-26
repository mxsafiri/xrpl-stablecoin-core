import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import config from '../config';
import { TokenConfig, TransactionResult, XrplWallet } from '../types';
import logger from '../utils/logger';

class XrplService {
  private client: Client;
  private adminWallet: Wallet | null = null;
  private treasuryWallet: Wallet | null = null;
  private tokenConfig: TokenConfig;

  constructor() {
    // Initialize XRPL client based on network configuration
    let serverUrl: string;
    switch (config.xrplNetwork) {
      case 'testnet':
        serverUrl = 'wss://s.altnet.rippletest.net:51233';
        break;
      case 'devnet':
        serverUrl = 'wss://s.devnet.rippletest.net:51233';
        break;
      case 'mainnet':
        serverUrl = 'wss://xrplcluster.com';
        break;
      default:
        serverUrl = 'wss://s.altnet.rippletest.net:51233';
    }

    this.client = new Client(serverUrl);
    this.tokenConfig = {
      issuerAddress: config.issuerAddress,
      currencyCode: config.currencyCode,
    };
  }

  /**
   * Connect to the XRPL network and initialize wallets
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info(`Connected to XRPL ${config.xrplNetwork}`);

      // Initialize admin wallet if seed is provided
      if (config.adminSeed) {
        this.adminWallet = Wallet.fromSeed(config.adminSeed);
        logger.info(`Admin wallet initialized: ${this.adminWallet.address}`);
      }

      // Initialize treasury wallet if seed is provided
      if (config.treasurySeed) {
        this.treasuryWallet = Wallet.fromSeed(config.treasurySeed);
        logger.info(`Treasury wallet initialized: ${this.treasuryWallet.address}`);
      }
    } catch (error) {
      logger.error('Failed to connect to XRPL', error);
      throw new Error('Failed to connect to XRPL');
    }
  }

  /**
   * Disconnect from the XRPL network
   */
  async disconnect(): Promise<void> {
    await this.client.disconnect();
    logger.info('Disconnected from XRPL');
  }

  /**
   * Create a new wallet on the XRPL
   */
  async createWallet(): Promise<XrplWallet> {
    try {
      const wallet = Wallet.generate();
      
      // Fund the wallet on testnet/devnet
      if (config.xrplNetwork !== 'mainnet') {
        const result = await this.client.fundWallet(wallet);
        logger.info(`Funded new wallet: ${wallet.address}`);
      }

      return {
        address: wallet.address,
        seed: wallet.seed || '',
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
      };
    } catch (error) {
      logger.error('Failed to create wallet', error);
      throw new Error('Failed to create wallet');
    }
  }

  /**
   * Get account information including balances
   * @param address XRPL account address
   */
  async getAccountInfo(address: string): Promise<any> {
    try {
      const response = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated',
      });
      return response.result;
    } catch (error) {
      logger.error(`Failed to get account info for ${address}`, error);
      throw new Error(`Failed to get account info for ${address}`);
    }
  }

  /**
   * Get account balances including issued tokens
   * @param address XRPL account address
   */
  async getAccountBalances(address: string): Promise<any[]> {
    try {
      const response = await this.client.request({
        command: 'account_lines',
        account: address,
        ledger_index: 'validated',
      });
      return response.result.lines || [];
    } catch (error) {
      logger.error(`Failed to get account balances for ${address}`, error);
      throw new Error(`Failed to get account balances for ${address}`);
    }
  }

  /**
   * Get TZS token balance for a specific account
   * @param address XRPL account address
   */
  async getTzsBalance(address: string): Promise<number> {
    try {
      const balances = await this.getAccountBalances(address);
      const tzsBalance = balances.find(
        (line) => 
          line.currency === this.tokenConfig.currencyCode && 
          line.account === this.tokenConfig.issuerAddress
      );
      return tzsBalance ? parseFloat(tzsBalance.balance) : 0;
    } catch (error) {
      logger.error(`Failed to get TZS balance for ${address}`, error);
      throw new Error(`Failed to get TZS balance for ${address}`);
    }
  }

  /**
   * Set up a trust line for the TZS token
   * @param wallet Wallet to set up trust line for
   * @param limit Maximum amount to trust (optional)
   */
  async setupTrustline(wallet: Wallet, limit: string = '1000000000'): Promise<TransactionResult> {
    try {
      const trustSetTx = {
        TransactionType: 'TrustSet',
        Account: wallet.address,
        LimitAmount: {
          currency: this.tokenConfig.currencyCode,
          issuer: this.tokenConfig.issuerAddress,
          value: limit,
        },
      };

      const prepared = await this.client.autofill(trustSetTx);
      const signed = wallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        logger.info(`Trust line established for ${wallet.address}`);
        return {
          success: true,
          hash: result.result.hash,
          result: result.result,
        };
      } else {
        logger.error(`Failed to establish trust line: ${result.result.meta.TransactionResult}`);
        return {
          success: false,
          error: `Failed to establish trust line: ${result.result.meta.TransactionResult}`,
          result: result.result,
        };
      }
    } catch (error) {
      logger.error('Failed to set up trust line', error);
      return {
        success: false,
        error: `Failed to set up trust line: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Mint (issue) TZS tokens to a destination address
   * @param amount Amount of TZS to mint
   * @param destinationAddress Destination wallet address
   */
  async mintTokens(amount: number, destinationAddress: string): Promise<TransactionResult> {
    try {
      if (!this.adminWallet) {
        throw new Error('Admin wallet not initialized');
      }

      // Ensure the destination has a trust line
      const balances = await this.getAccountBalances(destinationAddress);
      const hasTrustline = balances.some(
        (line) => 
          line.currency === this.tokenConfig.currencyCode && 
          line.account === this.tokenConfig.issuerAddress
      );

      if (!hasTrustline) {
        throw new Error(`Destination ${destinationAddress} does not have a trust line for TZS`);
      }

      // Create a payment transaction to issue tokens
      const paymentTx = {
        TransactionType: 'Payment',
        Account: this.tokenConfig.issuerAddress,
        Destination: destinationAddress,
        Amount: {
          currency: this.tokenConfig.currencyCode,
          value: amount.toString(),
          issuer: this.tokenConfig.issuerAddress,
        },
      };

      const prepared = await this.client.autofill(paymentTx);
      const signed = this.adminWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        logger.info(`Minted ${amount} TZS to ${destinationAddress}`);
        return {
          success: true,
          hash: result.result.hash,
          result: result.result,
        };
      } else {
        logger.error(`Failed to mint tokens: ${result.result.meta.TransactionResult}`);
        return {
          success: false,
          error: `Failed to mint tokens: ${result.result.meta.TransactionResult}`,
          result: result.result,
        };
      }
    } catch (error) {
      logger.error('Failed to mint tokens', error);
      return {
        success: false,
        error: `Failed to mint tokens: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Burn (redeem) TZS tokens from a source address
   * @param amount Amount of TZS to burn
   * @param sourceWallet Source wallet with tokens to burn
   */
  async burnTokens(amount: number, sourceWallet: Wallet): Promise<TransactionResult> {
    try {
      // Create a payment transaction to the issuer (burning)
      const paymentTx = {
        TransactionType: 'Payment',
        Account: sourceWallet.address,
        Destination: this.tokenConfig.issuerAddress,
        Amount: {
          currency: this.tokenConfig.currencyCode,
          value: amount.toString(),
          issuer: this.tokenConfig.issuerAddress,
        },
      };

      const prepared = await this.client.autofill(paymentTx);
      const signed = sourceWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        logger.info(`Burned ${amount} TZS from ${sourceWallet.address}`);
        return {
          success: true,
          hash: result.result.hash,
          result: result.result,
        };
      } else {
        logger.error(`Failed to burn tokens: ${result.result.meta.TransactionResult}`);
        return {
          success: false,
          error: `Failed to burn tokens: ${result.result.meta.TransactionResult}`,
          result: result.result,
        };
      }
    } catch (error) {
      logger.error('Failed to burn tokens', error);
      return {
        success: false,
        error: `Failed to burn tokens: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Transfer TZS tokens between wallets
   * @param amount Amount of TZS to transfer
   * @param sourceWallet Source wallet with tokens
   * @param destinationAddress Destination wallet address
   */
  async transferTokens(
    amount: number,
    sourceWallet: Wallet,
    destinationAddress: string
  ): Promise<TransactionResult> {
    try {
      // Ensure the destination has a trust line
      const balances = await this.getAccountBalances(destinationAddress);
      const hasTrustline = balances.some(
        (line) => 
          line.currency === this.tokenConfig.currencyCode && 
          line.account === this.tokenConfig.issuerAddress
      );

      if (!hasTrustline) {
        throw new Error(`Destination ${destinationAddress} does not have a trust line for TZS`);
      }

      // Create a payment transaction
      const paymentTx = {
        TransactionType: 'Payment',
        Account: sourceWallet.address,
        Destination: destinationAddress,
        Amount: {
          currency: this.tokenConfig.currencyCode,
          value: amount.toString(),
          issuer: this.tokenConfig.issuerAddress,
        },
      };

      const prepared = await this.client.autofill(paymentTx);
      const signed = sourceWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        logger.info(`Transferred ${amount} TZS from ${sourceWallet.address} to ${destinationAddress}`);
        return {
          success: true,
          hash: result.result.hash,
          result: result.result,
        };
      } else {
        logger.error(`Failed to transfer tokens: ${result.result.meta.TransactionResult}`);
        return {
          success: false,
          error: `Failed to transfer tokens: ${result.result.meta.TransactionResult}`,
          result: result.result,
        };
      }
    } catch (error) {
      logger.error('Failed to transfer tokens', error);
      return {
        success: false,
        error: `Failed to transfer tokens: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get transaction details
   * @param txHash Transaction hash
   */
  async getTransaction(txHash: string): Promise<any> {
    try {
      const response = await this.client.request({
        command: 'tx',
        transaction: txHash,
      });
      return response.result;
    } catch (error) {
      logger.error(`Failed to get transaction ${txHash}`, error);
      throw new Error(`Failed to get transaction ${txHash}`);
    }
  }

  /**
   * Prepare a transaction by autofilling fields
   * @param transaction Transaction object to prepare
   */
  async prepareTransaction(transaction: any): Promise<any> {
    try {
      return await this.client.autofill(transaction);
    } catch (error) {
      logger.error('Failed to prepare transaction', error);
      throw new Error(`Failed to prepare transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Submit a signed transaction and wait for validation
   * @param txBlob Signed transaction blob
   */
  async submitTransaction(txBlob: string): Promise<any> {
    try {
      return await this.client.submitAndWait(txBlob);
    } catch (error) {
      logger.error('Failed to submit transaction', error);
      throw new Error(`Failed to submit transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default new XrplService();
