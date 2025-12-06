/**
 * 마감 시간까지의 카운트다운을 계산하는 커스텀 훅
 * 
 * 1초마다 업데이트되며, 다음과 같은 형식으로 표시:
 * - 1시간 이상: "N시간 M분 후 마감"
 * - 1시간 미만: "M분 N초 후 마감"
 * - 1분 미만: "N초 후 마감"
 * - 마감됨: "종료됨"
 * 
 * @param endTime - 마감 시간 (ISO 문자열)
 * @returns timeLeft - 남은 시간 문자열
 */
import { useState, useEffect } from 'react'

export function useCountdown(endTime: string | null) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (!endTime) return

    const updateCountdown = () => {
      const now = new Date().getTime()
      const end = new Date(endTime).getTime()
      const diff = end - now

      if (diff <= 0) {
        setTimeLeft('종료됨')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeLeft(`${hours}시간 ${minutes}분 후 마감`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}분 ${seconds}초 후 마감`)
      } else {
        setTimeLeft(`${seconds}초 후 마감`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [endTime])

  return timeLeft
}

