'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PayoutLadder } from '@/components/Payouts/PayoutLadder'

export const dynamic = 'force-dynamic'

function PayoutsContent() {
  const searchParams = useSearchParams()
  const tournamentId = searchParams.get('tournament') || ''

  if (!tournamentId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white gap-4 p-4">
        <p className="text-2xl text-red-500">No tournament specified</p>
        <p className="text-gray-400 text-center">
          Please provide a tournament ID in the URL: ?tournament=YOUR_ID
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center py-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            Tournament Payouts
          </h1>
          <p className="text-gray-400 text-lg">
            Prize pool distribution and payout ladder
          </p>
        </header>

        <PayoutLadder tournamentId={tournamentId} />

        <footer className="text-center text-gray-500 text-sm py-4">
          Payouts update automatically as players are eliminated
        </footer>
      </div>
    </div>
  )
}

export default function PayoutsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-xl">Loading payouts...</p>
      </div>
    }>
      <PayoutsContent />
    </Suspense>
  )
}
