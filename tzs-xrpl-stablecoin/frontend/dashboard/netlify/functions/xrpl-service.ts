import { Client, Wallet, xrpToDrops, dropsToXrp, Payment, TxResponse } from 'xrpl'

const XRPL_NETWORK = process.env.XRPL_NETWORK || 'wss://s.altnet.rippletest.net:51233'
const ISSUER_ADDRESS = process.env.XRPL_ISSUER_ADDRESS || 'rph2dj1V9ZoWpSEz8YKgmSm8YpNCQJL8ZM'
const TREASURY_SEED = process.env.XRPL_TREASURY_SEED || 'sEdVgrmgKYtx7NNZNupRJLqyEweRZC9'
const CURRENCY_CODE = process.env.XRPL_CURRENCY_CODE || 'TZS'

export class XRPLService {
  private client: Client
  private treasuryWallet: Wallet

  constructor() {
    this.client = new Client(XRPL_NETWORK)
    this.treasuryWallet = Wallet.fromSeed(TREASURY_SEED)
  }

  async connect() {
    if (!this.client.isConnected()) {
      await this.client.connect()
    }
  }

  async disconnect() {
    if (this.client.isConnected()) {
      await this.client.disconnect()
    }
  }

  // Get account balance for TZS tokens
  async getTokenBalance(walletAddress: string): Promise<number> {
    await this.connect()
    
    try {
      const response = await this.client.request({
        command: 'account_lines',
        account: walletAddress,
        ledger_index: 'validated'
      })

      const tzsLine = response.result.lines.find((line: any) => 
        line.currency === CURRENCY_CODE && line.account === ISSUER_ADDRESS
      )

      return tzsLine ? parseFloat(tzsLine.balance) : 0
    } catch (error) {
      console.error('Error fetching token balance:', error)
      return 0
    }
  }

  // Get XRP balance
  async getXRPBalance(walletAddress: string): Promise<number> {
    await this.connect()
    
    try {
      const response = await this.client.request({
        command: 'account_info',
        account: walletAddress,
        ledger_index: 'validated'
      })

      return parseFloat(dropsToXrp(response.result.account_data.Balance))
    } catch (error) {
      console.error('Error fetching XRP balance:', error)
      return 0
    }
  }

  // Mint TZS tokens (Issue tokens to destination)
  async mintTokens(destinationAddress: string, amount: number, memo?: string): Promise<string> {
    await this.connect()

    const payment: Payment = {
      TransactionType: 'Payment',
      Account: this.treasuryWallet.address,
      Destination: destinationAddress,
      Amount: {
        currency: CURRENCY_CODE,
        value: amount.toString(),
        issuer: ISSUER_ADDRESS
      },
      ...(memo && {
        Memos: [{
          Memo: {
            MemoData: Buffer.from(memo, 'utf8').toString('hex').toUpperCase(),
            MemoType: Buffer.from('TZS_MINT', 'utf8').toString('hex').toUpperCase()
          }
        }]
      })
    } as Payment

    const prepared = await this.client.autofill(payment as any)
    const signed = this.treasuryWallet.sign(prepared)
    const result = await this.client.submitAndWait(signed.tx_blob)

    const meta = result.result.meta as any
    if (meta?.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Transaction failed: ${meta?.TransactionResult}`)
    }

    return result.result.hash
  }

  // Burn TZS tokens (Send tokens back to issuer)
  async burnTokens(sourceAddress: string, amount: number, memo?: string): Promise<string> {
    await this.connect()

    const payment: Payment = {
      TransactionType: 'Payment',
      Account: sourceAddress,
      Destination: ISSUER_ADDRESS,
      Amount: {
        currency: CURRENCY_CODE,
        value: amount.toString(),
        issuer: ISSUER_ADDRESS
      },
      ...(memo && {
        Memos: [{
          Memo: {
            MemoData: Buffer.from(memo, 'utf8').toString('hex').toUpperCase(),
            MemoType: Buffer.from('TZS_BURN', 'utf8').toString('hex').toUpperCase()
          }
        }]
      })
    } as Payment

    const prepared = await this.client.autofill(payment as any)
    const signed = this.treasuryWallet.sign(prepared)
    const result = await this.client.submitAndWait(signed.tx_blob)

    const meta = result.result.meta as any
    if (meta?.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Transaction failed: ${meta?.TransactionResult}`)
    }

    return result.result.hash
  }

  // Get transaction history for an account
  async getTransactionHistory(walletAddress: string, limit: number = 50): Promise<any[]> {
    await this.connect()

    try {
      const response = await this.client.request({
        command: 'account_tx',
        account: walletAddress,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit: limit
      })

      return response.result.transactions.map((tx: any) => ({
        hash: tx.tx.hash,
        type: tx.tx.TransactionType,
        account: tx.tx.Account,
        destination: tx.tx.Destination,
        amount: tx.tx.Amount,
        date: new Date(tx.tx.date * 1000 + 946684800000).toISOString(), // Convert Ripple epoch
        ledger_index: tx.tx.ledger_index,
        meta: tx.meta
      }))
    } catch (error) {
      console.error('Error fetching transaction history:', error)
      return []
    }
  }

  // Get network info and health
  async getNetworkInfo(): Promise<any> {
    await this.connect()

    try {
      const serverInfo = await this.client.request({ command: 'server_info' })
      const ledger = await this.client.request({ command: 'ledger', ledger_index: 'validated' })
      
      return {
        connected: this.client.isConnected(),
        network: XRPL_NETWORK,
        ledger_index: ledger.result.ledger.ledger_index,
        server_state: serverInfo.result.info.server_state,
        validated_ledger: serverInfo.result.info.validated_ledger
      }
    } catch (error) {
      console.error('Error fetching network info:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { connected: false, error: errorMessage }
    }
  }

  // Fund account with XRP (testnet only)
  async fundAccount(walletAddress: string): Promise<string> {
    if (!XRPL_NETWORK.includes('altnet') && !XRPL_NETWORK.includes('testnet')) {
      throw new Error('Account funding only available on testnet')
    }

    await this.connect()

    try {
      const response = await fetch('https://faucet.altnet.rippletest.net/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: walletAddress })
      })

      if (!response.ok) {
        throw new Error('Failed to fund account')
      }

      const result = await response.json()
      return result.hash || 'funded'
    } catch (error) {
      console.error('Error funding account:', error)
      throw error
    }
  }
}

export const xrplService = new XRPLService()
