/**
 * 모바일 기기 감지 유틸리티
 */

/**
 * 모바일 기기인지 확인
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * iOS 기기인지 확인
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * Android 기기인지 확인
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false
  
  return /Android/i.test(navigator.userAgent)
}

/**
 * MetaMask Mobile 앱 다운로드 URL
 */
export function getMetaMaskMobileUrl(): string {
  if (isIOS()) {
    return 'https://apps.apple.com/app/metamask/id1438144202'
  } else if (isAndroid()) {
    return 'https://play.google.com/store/apps/details?id=io.metamask'
  }
  return 'https://metamask.io/download/'
}

