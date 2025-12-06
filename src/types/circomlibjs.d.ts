/**
 * Type declarations for circomlibjs
 * This module doesn't have official TypeScript types, so we declare it here
 */
declare module 'circomlibjs' {
  export interface Poseidon {
    (inputs: string[]): bigint
    F: {
      toString: (value: bigint) => string
    }
  }

  export function buildPoseidon(): Promise<Poseidon>
  export function buildPoseidonReference(): Promise<Poseidon>
}

