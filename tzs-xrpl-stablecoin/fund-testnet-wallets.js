const axios = require('axios')

async function fundWallet(address) {
  try {
    console.log(`Funding wallet: ${address}`)
    const response = await axios.post('https://faucet.altnet.rippletest.net/accounts', {
      destination: address,
      xrpAmount: 1000
    })
    
    if (response.status === 200) {
      console.log(`✅ Successfully funded ${address} with 1000 XRP`)
      return response.data
    }
  } catch (error) {
    console.log(`❌ Failed to fund ${address}:`, error.response?.data || error.message)
    
    // Try alternative faucet
    try {
      console.log(`Trying alternative faucet for ${address}`)
      const altResponse = await axios.post('https://test.bithomp.com/api/v2/faucet', {
        destination: address
      })
      console.log(`✅ Alternative faucet response:`, altResponse.data)
    } catch (altError) {
      console.log(`❌ Alternative faucet also failed:`, altError.response?.data || altError.message)
    }
  }
}

async function fundTestnetWallets() {
  const adminAddress = 'rM6G7xhcv4Tge7j1vKrbe8e2Zn3UX8ueMS'
  const treasuryAddress = 'rNYBneQT2ddpA6SeyvfRSyx8VPLEYRVbzt'
  
  console.log('Funding XRPL Testnet Wallets...\n')
  
  await fundWallet(adminAddress)
  await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
  await fundWallet(treasuryAddress)
  
  console.log('\n📋 Manual Funding Instructions:')
  console.log('If automatic funding failed, visit these faucets manually:')
  console.log('1. https://faucet.altnet.rippletest.net/')
  console.log('2. https://test.bithomp.com/faucet')
  console.log('3. https://xrpl.org/resources/dev-tools/xrp-faucets')
  console.log('\nAddresses to fund:')
  console.log(`Admin: ${adminAddress}`)
  console.log(`Treasury: ${treasuryAddress}`)
}

fundTestnetWallets()
