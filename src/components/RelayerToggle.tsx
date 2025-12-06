/**
 * ⛽ Relayer (가스 대납) ON/OFF 토글
 * 
 * ON: 백엔드 Relayer가 트랜잭션 대신 전송 (사용자 가스비 0원)
 * OFF: MetaMask로 직접 전송 (사용자가 가스비 지불)
 * 
 * 사용:
 * <RelayerToggle enabled={true} onToggle={setEnabled} />
 */

'use client'

interface RelayerToggleProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  disabled?: boolean
}

export default function RelayerToggle({
  enabled,
  onToggle,
  disabled = false,
}: RelayerToggleProps) {
  const handleToggle = () => {
    if (!disabled) {
      onToggle(!enabled)
    }
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">
            ⛽ Relayer (가스 대납)
          </span>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              enabled
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {enabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {enabled
            ? '✅ 서버가 가스비를 대납합니다 (사용자 가스 0원)'
            : '⚠️ 직접 MetaMask로 트랜잭션을 전송합니다 (가스비 필요)'}
        </p>
      </div>

      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`relative w-14 h-8 rounded-full transition-all ${
          disabled
            ? 'bg-gray-300 cursor-not-allowed'
            : enabled
            ? 'bg-green-500'
            : 'bg-gray-400'
        }`}
      >
        <div
          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

