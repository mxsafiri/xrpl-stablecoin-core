const { Client } = require('xrpl')

async function checkWalletStatus() {
  const client = new Client('wss://s.altnet.rippletest.net:51233')
  const address = 'rph2KgyZXNn3fhFrDAmwmvbS5h8dQjd2ZM'
  
  try {
    console.log('🔍 Checking wallet status...')
    console.log(`Address: ${address}`)
    console.log('Network: XRPL Testnet')
    console.log('=' .repeat(50))
    
    await client.connect()
    console.log('✅ Connected to XRPL testnet')
    
    // Check account info
    try {
      const accountInfo = await client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      })
      
      const balance = parseFloat(accountInfo.result.account_data.Balance) / 1000000
      console.log(`💰 Current Balance: ${balance} XRP`)
      console.log(`📊 Account Sequence: ${accountInfo.result.account_data.Sequence}`)
      console.log(`🏷️  Account Flags: ${accountInfo.result.account_data.Flags}`)
      console.log(`📅 Account exists and is active`)
      
      // Check recent transactions
      console.log('\n📋 Recent Transactions:')
      const transactions = await client.request({
        command: 'account_tx',
        account: address,
        limit: 5,
        ledger_index_min: -1,
        ledger_index_max: -1
      })
      
      if (transactions.result.transactions.length > 0) {
        transactions.result.transactions.forEach((tx, index) => {
          const transaction = tx.tx || tx
          const meta = tx.meta || {}
          console.log(`${index + 1}. Hash: ${transaction.hash}`)
          console.log(`   Type: ${transaction.TransactionType}`)
          console.log(`   Result: ${meta.TransactionResult}`)
          if (transaction.Amount) {
            const amount = typeof transaction.Amount === 'string' 
              ? (parseInt(transaction.Amount) / 1000000) + ' XRP'
              : transaction.Amount.value + ' ' + transaction.Amount.currency
            console.log(`   Amount: ${amount}`)
          }
        })
      } else {
        console.log('   No transactions found')
      }
      
    } catch (accountError) {
      if (accountError.message.includes('Account not found')) {
        console.log('❌ Account not found - wallet has never been funded')
        console.log('💡 The wallet needs to be funded to exist on the ledger')
      } else {
        console.log('❌ Error checking account:', accountError.message)
      }
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error.message)
  } finally {
    await client.disconnect()
    console.log('\n🔌 Disconnected from XRPL')
  }
}

checkWalletStatus().catch(console.error)
