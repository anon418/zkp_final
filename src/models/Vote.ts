import mongoose, { Schema, Model, models } from 'mongoose'

export interface IVote {
  pollId: string
  voter?: mongoose.Types.ObjectId // 선택사항 (relayer 사용 시 없을 수 있음)
  candidate: string
  timestamp?: Date
  txHash?: string
  nullifierHash?: string
  voterAddress?: string // 지갑 주소 (relayer 사용 시)
  status?: string // 투표 상태 (confirmed 등)
  confirmedAt?: Date // 확인 시각
  merkleRoot?: string // ZKP Public Signal [0] (영수증 표시용)
  voteCommitment?: string // ZKP Public Signal [3] (영수증 표시용)
}

const VoteSchema = new Schema<IVote>(
  {
    pollId: { type: String, required: true },
    voter: { type: Schema.Types.ObjectId, ref: 'Voter' }, // 선택사항
    candidate: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    txHash: { type: String },
    nullifierHash: { type: String },
    voterAddress: { type: String }, // 지갑 주소
    status: { type: String }, // 투표 상태
    confirmedAt: { type: Date }, // 확인 시각
    merkleRoot: { type: String }, // ZKP Public Signal [0] (영수증 표시용)
    voteCommitment: { type: String }, // ZKP Public Signal [3] (영수증 표시용)
  },
  { timestamps: true }
)

// 인덱스
VoteSchema.index({ pollId: 1 })
VoteSchema.index({ nullifierHash: 1 })
VoteSchema.index(
  { pollId: 1, nullifierHash: 1 },
  { unique: true, sparse: true }
)

const Vote: Model<IVote> =
  models.Vote || mongoose.model<IVote>('Vote', VoteSchema)
export default Vote
