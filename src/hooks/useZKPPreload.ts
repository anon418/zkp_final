/**
 * ZKP 파일 프리로딩 훅
 * 
 * 투표 페이지 진입 시 WASM/ZKEY 파일을 미리 로드하여
 * 증명 생성 시간을 단축합니다.
 */

import { useEffect, useState } from 'react'

export function useZKPPreload() {
  const [isPreloaded, setIsPreloaded] = useState(false)
  const [preloadError, setPreloadError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const preloadZKP = async () => {
      try {
        // 병렬로 파일 로드
        const [wasmResponse, zkeyResponse] = await Promise.all([
          fetch('/zkp/v1.2/vote.wasm'),
          fetch('/zkp/v1.2/vote_final.zkey'),
        ])

        // 응답 확인
        if (!wasmResponse.ok || !zkeyResponse.ok) {
          throw new Error('Failed to preload ZKP files')
        }

        // 파일을 메모리에 로드 (blob으로 변환)
        await Promise.all([
          wasmResponse.blob(),
          zkeyResponse.blob(),
        ])

        if (isMounted) {
          setIsPreloaded(true)
          console.log('[ZKP Preload] Files preloaded successfully')
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          setPreloadError(errorMessage)
          console.warn('[ZKP Preload] Failed to preload:', errorMessage)
        }
      }
    }

    // 페이지 로드 시 프리로드 시작
    preloadZKP()

    return () => {
      isMounted = false
    }
  }, [])

  return { isPreloaded, preloadError }
}

