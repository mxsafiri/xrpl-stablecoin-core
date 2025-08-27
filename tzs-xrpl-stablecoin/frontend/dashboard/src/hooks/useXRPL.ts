'use client'

import { useState, useEffect } from 'react'
import { Client } from 'xrpl'

export function useXRPL() {
  const [client, setClient] = useState<Client | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const xrplClient = new Client(process.env.NEXT_PUBLIC_XRPL_NETWORK || 'wss://s.altnet.rippletest.net:51233')
    
    const connect = async () => {
      try {
        await xrplClient.connect()
        setClient(xrplClient)
        setIsConnected(true)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to XRPL')
        setIsConnected(false)
      }
    }

    connect()

    return () => {
      if (xrplClient.isConnected()) {
        xrplClient.disconnect()
      }
    }
  }, [])

  return { client, isConnected, error }
}
