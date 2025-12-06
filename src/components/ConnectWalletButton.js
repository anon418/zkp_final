'use client'
import { useWallet } from '@/contexts/WalletContext'
import { useEffect, useState } from 'react'

export default function ConnectWalletButton() {
  const { account, connectWallet } = useWallet()
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  useEffect(() => {
    // 모바일 감지
    const checkMobile = async () => {
      const { isMobile } = await import('@/lib/mobile')
      setIsMobileDevice(isMobile())
    }
    checkMobile()
  }, [])

  return (
    <div>
      {account ? (
        <p className="text-green-600 font-semibold">
          연결된 지갑: {account.slice(0, 6)}...{account.slice(-4)}
        </p>
      ) : (
        <div>
          <button
            onClick={connectWallet}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition w-full"
          >
            {isMobileDevice ? '📱 MetaMask 연결하기' : '🦊 MetaMask 연결하기'}
          </button>
          {isMobileDevice && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              💡 MetaMask 앱이 설치되어 있어야 합니다
            </p>
          )}
        </div>
      )}
    </div>
  )
}
