import { Client, Wallet, xrpToDrops } from 'xrpl'

// XRPL Client for wallet operations
const client = new Client('wss://s.altnet.rippletest.net:51233') // Testnet

export interface WalletInfo {
  address: string
  seed: string
  publicKey: string
  privateKey: string
}

export interface SignatureData {
  signature: string
  message: string
  publicKey: string
}

// Create new XRPL wallet for user registration
export const createWallet = async (): Promise<WalletInfo> => {
  try {
    await client.connect()
    
    // Generate new wallet
    const wallet = Wallet.generate()
    
    // Fund wallet on testnet (for development)
    await client.fundWallet(wallet)
    
    await client.disconnect()
    
    return {
      address: wallet.address,
      seed: wallet.seed!,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey
    }
  } catch (error) {
    console.error('Error creating wallet:', error)
    throw new Error('Failed to create wallet')
  }
}

// Sign message with wallet for authentication
export const signMessage = async (seed: string, message: string): Promise<SignatureData> => {
  try {
    const wallet = Wallet.fromSeed(seed)
    
    // Simple message signing for authentication
    const messageHex = Buffer.from(message, 'utf8').toString('hex')
    const signature = `${wallet.address}_${messageHex}_signed`
    
    return {
      signature,
      message,
      publicKey: wallet.publicKey
    }
  } catch (error) {
    console.error('Error signing message:', error)
    throw new Error('Failed to sign message')
  }
}

// Verify signature for authentication (simplified for demo)
export const verifySignature = async (
  address: string, 
  signature: string, 
  message: string, 
  publicKey: string
): Promise<boolean> => {
  try {
    // Simple verification - check if signature contains the address
    const messageHex = Buffer.from(message, 'utf8').toString('hex')
    const expectedSignature = `${address}_${messageHex}_signed`
    
    return signature === expectedSignature
  } catch (error) {
    console.error('Error verifying signature:', error)
    return false
  }
}

// Get wallet balance
export const getWalletBalance = async (address: string): Promise<number> => {
  try {
    await client.connect()
    
    const response = await client.getBalances(address)
    const xrpBalance = response.find(balance => balance.currency === 'XRP')
    
    await client.disconnect()
    
    return xrpBalance ? parseFloat(xrpBalance.value) : 0
  } catch (error) {
    console.error('Error getting wallet balance:', error)
    return 0
  }
}

// Import wallet from seed
export const importWallet = (seed: string): WalletInfo => {
  try {
    const wallet = Wallet.fromSeed(seed)
    
    return {
      address: wallet.address,
      seed: wallet.seed!,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey
    }
  } catch (error) {
    console.error('Error importing wallet:', error)
    throw new Error('Invalid wallet seed')
  }
}
