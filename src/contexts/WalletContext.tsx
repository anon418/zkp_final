'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'

interface WalletContextType {
  account: string | null
  address: string | null
  connectWallet: () => Promise<void>
  isConnected: boolean
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)

  useEffect(() => {
    // 페이지 로드 시 이미 연결된 지갑 확인
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((result: unknown) => {
          const accounts = result as string[]
          if (accounts.length > 0) {
            setAccount(accounts[0])
          }
        })
        .catch(console.error)

      // 지갑 계정 변경 감지
      const handleAccountsChanged = (data: unknown) => {
        const accounts = data as string[]
        setAccount(accounts.length > 0 ? accounts[0] : null)
      }
      
      window.ethereum.on('accountsChanged', handleAccountsChanged)
    }
  }, [])

  const connectWallet = async () => {
    if (!window.ethereum) {
      // 모바일 감지
      const { isMobile, isIOS, isAndroid, getMetaMaskMobileUrl } = await import('@/lib/mobile')
      
      if (isMobile()) {
        const platform = isIOS() ? 'iOS' : isAndroid() ? 'Android' : '모바일'
        const downloadUrl = getMetaMaskMobileUrl()
        const message = `MetaMask 앱이 필요합니다!\n\n${platform}에서 MetaMask 앱을 설치하세요:\n${downloadUrl}\n\n설치 후 이 페이지를 새로고침하세요.`
        
        if (confirm(message)) {
          window.open(downloadUrl, '_blank')
        }
      } else {
        alert('MetaMask 브라우저 확장 프로그램이 필요합니다!\n\nChrome/Edge/Firefox에서 MetaMask 확장 프로그램을 설치하세요:\nhttps://metamask.io/download/')
      }
      return
    }

    try {
      const result = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })
      const accounts = result as string[]
      setAccount(accounts[0])
    } catch (error) {
      console.error(error)
      // 사용자가 연결을 거부한 경우
      if ((error as { code?: number })?.code === 4001) {
        alert('지갑 연결이 거부되었습니다.')
      }
    }
  }

  return (
    <WalletContext.Provider
      value={{
        account,
        address: account,
        connectWallet,
        isConnected: !!account,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
