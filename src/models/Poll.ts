import mongoose, { Schema, Model, models } from 'mongoose'

interface ICandidate {
  id: string
  label: string
}

export interface IPoll {
  pollId: string
  creatorWallet: string
  title: string
  description?: string
  candidates: ICandidate[]
  startTime: Date
  endTime: Date
  merkleRoot?: string
  chainId?: number
  status?: 'active' | 'pending' | 'ended'
  createdAt: Date
  updatedAt: Date
}

const PollSchema = new Schema<IPoll>(
  {
    pollId: { type: String, required: true, unique: true },
    creatorWallet: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    candidates: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
      },
    ],
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    merkleRoot: { type: String },
    chainId: { type: Number, default: 11155111 },
    status: {
      type: String,
      enum: ['active', 'pending', 'ended'],
      default: 'active',
    },
  },
  { timestamps: true }
)

// 인덱스
PollSchema.index({ creatorWallet: 1, createdAt: -1 })
PollSchema.index({ endTime: 1 })

// 🔒 무결성 보호: 투표 생성 후 수정 불가 (관리자 포함)
PollSchema.pre('save', function (next) {
  // 새 문서인 경우 (생성) 허용
  if (this.isNew) {
    return next()
  }

  // 기존 문서 수정 시도 차단
  // 투표 내용(title, description, candidates, startTime, endTime, merkleRoot)은 불변
  const modifiedFields = this.modifiedPaths()
  const immutableFields = [
    'title',
    'description',
    'candidates',
    'startTime',
    'endTime',
    'merkleRoot',
    'pollId',
    'creatorWallet',
    'chainId',
  ]

  const hasImmutableModification = modifiedFields.some((field) =>
    immutableFields.includes(field)
  )

  if (hasImmutableModification) {
    const error = new Error(
      '투표 내용은 생성 후 수정할 수 없습니다. 무결성을 위해 모든 수정이 차단됩니다.'
    )
    error.name = 'IMMUTABLE_POLL'
    return next(error)
  }

  // status 필드만 업데이트 허용 (ended로 변경 등)
  next()
})

// findOneAndUpdate, updateOne 등도 차단
PollSchema.pre(
  ['findOneAndUpdate', 'updateOne', 'updateMany'],
  function (next) {
    /**
     * Mongoose update 쿼리의 update 객체
     * $set 연산자 또는 직접 필드 업데이트를 포함할 수 있음
     */
    const update = this.getUpdate() as { $set?: Record<string, unknown> } & Record<string, unknown>
    if (!update) return next()

    const immutableFields = [
      'title',
      'description',
      'candidates',
      'startTime',
      'endTime',
      'merkleRoot',
      'pollId',
      'creatorWallet',
      'chainId',
    ]

    // $set이나 직접 필드 업데이트 확인
    const updateFields = update.$set
      ? Object.keys(update.$set)
      : Object.keys(update).filter((k) => !k.startsWith('$'))

    const hasImmutableModification = updateFields.some((field) =>
      immutableFields.includes(field)
    )

    if (hasImmutableModification) {
      const error = new Error(
        '투표 내용은 생성 후 수정할 수 없습니다. 무결성을 위해 모든 수정이 차단됩니다.'
      )
      error.name = 'IMMUTABLE_POLL'
      return next(error)
    }

    next()
  }
)

const Poll: Model<IPoll> =
  models.Poll || mongoose.model<IPoll>('Poll', PollSchema)
export default Poll
