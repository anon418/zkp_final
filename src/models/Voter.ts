import mongoose, { Schema, Model, models } from 'mongoose'

export interface IVoter {
  name?: string
  walletAddress: string // 고유 식별자: 지갑(또는 학번으로 바꿀 거면 아래 unique 키도 같이 변경)
  studentId?: string | null // 선택값
  hasVoted?: boolean
  identityNullifier?: string // ZKP nullifier 생성용
  identityTrapdoor?: string // ZKP commitment 생성용
}

const VoterSchema = new Schema<IVoter>(
  {
    name: { type: String },
    walletAddress: { type: String, required: true, unique: true, index: true },
    studentId: { type: String },
    hasVoted: { type: Boolean, default: false },
    identityNullifier: { type: String },
    identityTrapdoor: { type: String },
  },
  { timestamps: true }
)

// 핫리로드 대비: 기존 모델 재사용
export const Voter: Model<IVoter> =
  (models.Voter as Model<IVoter>) ||
  mongoose.model<IVoter>('Voter', VoterSchema)
export default Voter
