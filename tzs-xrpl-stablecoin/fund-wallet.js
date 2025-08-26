const axios = require('axios')

async function fundWallet(address) {
  console.log(`\n🔄 Funding wallet: ${address}`)
  
  try {
    // Try the main XRPL testnet faucet
    const response = await axios.post('https://faucet.altnet.rippletest.net/accounts', {
      destination: address
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })
    
    console.log(`✅ Successfully funded ${address}`)
    console.log(`Response:`, response.data)
    return true
  } catch (error) {
    console.log(`❌ Main faucet failed for ${address}`)
    
    // Try alternative method with curl
    try {
      const { exec } = require('child_process')
      const util = require('util')
      const execPromise = util.promisify(exec)
      
      console.log(`🔄 Trying curl method...`)
      const curlCommand = `curl -X POST "https://faucet.altnet.rippletest.net/accounts" -H "Content-Type: application/json" -d '{"destination": "${address}"}'`
      
      const { stdout, stderr } = await execPromise(curlCommand)
      console.log(`✅ Curl response:`, stdout)
      return true
    } catch (curlError) {
      console.log(`❌ Curl method also failed`)
    }
  }
  
  return false
}

async function main() {
  const address = 'rph2KgyZXNn3fhFrDAmwmvbS5h8dQjd2ZM'
  
  console.log('🚀 XRPL Testnet Wallet Funding')
  console.log('===============================')
  
  const success = await fundWallet(address)
  
  if (!success) {
    console.log('\n📋 Manual Funding Instructions:')
    console.log('Visit: https://faucet.altnet.rippletest.net/')
    console.log(`Enter address: ${address}`)
    console.log('Click "Fund Account" button')
    console.log('\nAlternative faucets:')
    console.log('- https://test.bithomp.com/faucet')
    console.log('- https://xrpl.org/resources/dev-tools/xrp-faucets')
  }
  
  console.log('\n✨ After funding, your dashboard will show real data!')
}

main().catch(console.error)
