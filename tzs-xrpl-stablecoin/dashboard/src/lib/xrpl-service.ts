import { Client, AccountInfoRequest, AccountTxRequest } from 'xrpl'

class XRPLService {
  private client: Client
  private isConnected = false

  constructor() {
    this.client = new Client(process.env.NEXT_PUBLIC_XRPL_NETWORK || 'wss://s.altnet.rippletest.net:51233')
  }

  async connect() {
    if (!this.isConnected) {
      await this.client.connect()
      this.isConnected = true
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.client.disconnect()
      this.isConnected = false
    }
  }

  async getAccountInfo(address: string) {
    await this.connect()
    const request: AccountInfoRequest = {
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    }
    return await this.client.request(request)
  }

  async getAccountTransactions(address: string, limit = 20) {
    await this.connect()
    const request: AccountTxRequest = {
      command: 'account_tx',
      account: address,
      limit,
      ledger_index_min: -1,
      ledger_index_max: -1
    }
    return await this.client.request(request)
  }

  async getTokenBalance(address: string, currency: string, issuer: string) {
    try {
      const accountInfo = await this.getAccountInfo(address)
      // For token balances, we need to check trust lines
      const accountData = accountInfo.result.account_data as any
      const lines = accountData.Lines || []
      
      const tokenLine = lines.find((line: any) => 
        line.currency === currency && line.account === issuer
      )
      
      return tokenLine ? parseFloat(tokenLine.balance) : 0
    } catch (error) {
      console.error('Error fetching token balance:', error)
      return 0
    }
  }

  async getXRPBalance(address: string) {
    try {
      const accountInfo = await this.getAccountInfo(address)
      return parseFloat(accountInfo.result.account_data.Balance) / 1000000 // Convert drops to XRP
    } catch (error: any) {
      if (error.message?.includes('Account not found')) {
        // Account doesn't exist yet (not funded)
        return 0
      }
      console.error('Error fetching XRP balance:', error)
      return 0
    }
  }

  // Subscribe to real-time transaction stream
  subscribeToTransactions(addresses: string[], callback: (transaction: any) => void) {
    this.connect().then(() => {
      this.client.request({
        command: 'subscribe',
        accounts: addresses
      })

      this.client.on('transaction', callback)
    })
  }

  unsubscribeFromTransactions() {
    this.client.removeAllListeners('transaction')
  }
}

export const xrplService = new XRPLService()
