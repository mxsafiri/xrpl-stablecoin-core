const { Wallet } = require('xrpl')

// Generate valid XRPL testnet wallet addresses
function generateTestnetWallets() {
  console.log('Generating XRPL Testnet Wallets...\n')
  
  // Generate Admin wallet
  const adminWallet = Wallet.generate()
  console.log('Admin Wallet:')
  console.log('Address:', adminWallet.address)
  console.log('Seed:', adminWallet.seed)
  console.log('Public Key:', adminWallet.publicKey)
  console.log('Private Key:', adminWallet.privateKey)
  console.log()
  
  // Generate Treasury wallet
  const treasuryWallet = Wallet.generate()
  console.log('Treasury Wallet:')
  console.log('Address:', treasuryWallet.address)
  console.log('Seed:', treasuryWallet.seed)
  console.log('Public Key:', treasuryWallet.publicKey)
  console.log('Private Key:', treasuryWallet.privateKey)
  console.log()
  
  // Generate environment variables
  console.log('Environment Variables for .env.local:')
  console.log(`NEXT_PUBLIC_ADMIN_ADDRESS=${adminWallet.address}`)
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryWallet.address}`)
  console.log(`NEXT_PUBLIC_CURRENCY_CODE=TZS`)
  console.log()
  
  console.log('Fund these addresses at: https://xrpl.org/resources/dev-tools/xrp-faucets')
  console.log('Testnet Faucet: https://faucet.altnet.rippletest.net/')
}

generateTestnetWallets()
