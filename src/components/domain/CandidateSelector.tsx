'use client'

import React from 'react'

interface Candidate {
  id: string
  label: string
}

interface CandidateSelectorProps {
  candidates: Candidate[]
  selectedOption: string | null
  onSelect: (id: string) => void
}

export default function CandidateSelector({
  candidates,
  selectedOption,
  onSelect,
}: CandidateSelectorProps) {
  const optionStyle = (id: string): React.CSSProperties => ({
    padding: '18px',
    borderRadius: '12px',
    border:
      selectedOption === id
        ? '1px solid #00f2fe'
        : '1px solid rgba(255,255,255,0.1)',
    background: selectedOption === id ? 'rgba(0,242,254,0.15)' : 'transparent',
    cursor: 'pointer',
  })

  return (
    <div
      style={{
        marginTop: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {candidates.map((c) => (
        <div
          key={c.id}
          style={optionStyle(c.id)}
          onClick={() => onSelect(c.id)}
        >
          {c.label}
        </div>
      ))}
    </div>
  )
}

