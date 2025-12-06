import { create } from 'zustand'
// 2-1 단계에서 만든 error-map.json 파일을 import 합니다.
// '@/'는 'src/' 폴더를 가리키는 경로 별칭입니다.
import errorMap from '@/config/error-map.json'

// 알림 타입 (색상 구분을 위함)
type NotificationType = 'success' | 'error' | 'warning' | 'info'

// error-map.json의 키들을 타입으로 정의
type ErrorCode = keyof typeof errorMap

// 알림 상태
interface NotificationState {
  isOpen: boolean
  message: string
  type: NotificationType
}

// 스토어 인터페이스
interface UiStoreState {
  notification: NotificationState
  // 성공/정보/경고 메시지를 직접 띄우는 함수
  notify: (message: string, type?: NotificationType) => void
  // *핵심* 에러 코드를 받아 error-map에서 메시지를 찾아 띄우는 함수
  notifyError: (errorCode: string) => void
  // 알림을 닫는 함수
  hideNotification: () => void
}

// 헬퍼 함수: 에러 코드로 메시지 찾기
const getErrorMessage = (code: string): string => {
  // 정의된 에러 코드면 해당 메시지를, 아니면 DEFAULT_ERROR 메시지를 반환
  return errorMap[code as ErrorCode] || errorMap.DEFAULT_ERROR
}

// 스토어 생성
export const useUiStore = create<UiStoreState>((set) => ({
  // 1. 초기 상태
  notification: {
    isOpen: false,
    message: '',
    type: 'info',
  },

  // 2. 액션 (함수)

  // 일반 알림 (예: "투표 성공!", "success")
  notify: (message, type = 'info') =>
    set({
      notification: {
        isOpen: true,
        message,
        type,
      },
    }),

  // *핵심* 에러 알림 (예: "B_409_DUPLICATE")
  notifyError: (errorCode) =>
    set({
      notification: {
        isOpen: true,
        message: getErrorMessage(errorCode), // error-map에서 메시지 조회
        type: 'error',
      },
    }),

  // 알림 닫기
  hideNotification: () =>
    set((state) => ({
      notification: {
        ...state.notification,
        isOpen: false,
      },
    })),
}))
