/**
 * 투표 템플릿
 * 자주 사용하는 투표 형식을 미리 정의
 */

export interface PollTemplate {
  id: string
  name: string
  icon: string
  title: string
  description: string
  candidates: string[]
}

export const POLL_TEMPLATES: PollTemplate[] = [
  {
    id: 'food',
    name: '음식 선호도',
    icon: '🍕',
    title: '좋아하는 음식 투표',
    description: '가장 좋아하는 음식을 선택해주세요',
    candidates: ['치킨', '피자', '햄버거', '파스타', '초밥'],
  },
  {
    id: 'yesno',
    name: '찬반 투표',
    icon: '👍',
    title: '찬반 투표',
    description: '의견을 선택해주세요',
    candidates: ['찬성', '반대', '기권'],
  },
  {
    id: 'leader',
    name: '대표 선거',
    icon: '🎓',
    title: '과대표 선거',
    description: '차기 과대표를 선출합니다',
    candidates: ['후보 A', '후보 B', '후보 C'],
  },
  {
    id: 'schedule',
    name: '일정 투표',
    icon: '📅',
    title: '모임 일정 투표',
    description: '가능한 날짜를 선택해주세요',
    candidates: ['월요일', '화요일', '수요일', '목요일', '금요일'],
  },
  {
    id: 'place',
    name: '장소 투표',
    icon: '📍',
    title: 'MT 장소 투표',
    description: '가고 싶은 장소를 선택해주세요',
    candidates: ['바다', '산', '계곡', '도시'],
  },
  {
    id: 'custom',
    name: '직접 입력',
    icon: '✏️',
    title: '',
    description: '',
    candidates: [],
  },
]

export function getTemplate(id: string): PollTemplate | undefined {
  return POLL_TEMPLATES.find((t) => t.id === id)
}

