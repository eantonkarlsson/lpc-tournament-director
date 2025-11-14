'use client'

import { usePayoutStructure, useRegistrations } from '@/lib/supabase/hooks'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DollarSignIcon, TrendingUpIcon } from 'lucide-react'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface PayoutLadderProps {
  tournamentId: string
}

export function PayoutLadder({ tournamentId }: PayoutLadderProps) {
  const { payouts, loading: payoutsLoading, error: payoutsError } = usePayoutStructure(tournamentId)
  const { registrations: entries, loading: entriesLoading } = useRegistrations(tournamentId)

  if (payoutsLoading || entriesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-xl text-gray-400">Loading payouts...</p>
      </div>
    )
  }

  if (payoutsError) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-xl text-red-500">Error loading payouts</p>
      </div>
    )
  }

  // Calculate remaining players
  const remainingPlayers = entries.filter((e) => !e.eliminated_at).length
  const eliminatedCount = entries.filter((e) => e.eliminated_at).length

  // Find next payout position (next player to be eliminated gets this)
  const nextPayoutPosition = remainingPlayers

  // Find bubble position (last position before money)
  const minPayingPosition = Math.min(...payouts.map((p) => p.placement))
  const bubblePosition = minPayingPosition + 1

  // Sort payouts by placement (1st, 2nd, 3rd, etc.)
  const sortedPayouts = [...payouts].sort((a, b) => a.placement - b.placement)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-400 text-sm mb-1">Remaining Players</p>
          <p className="text-4xl font-bold">{remainingPlayers}</p>
        </div>
        <div className="bg-gray-800 border border-green-700 rounded-lg p-6 text-center">
          <p className="text-gray-400 text-sm mb-1">Next Payout</p>
          <p className="text-4xl font-bold text-green-500">
            {sortedPayouts.find((p) => p.placement === nextPayoutPosition)
              ? formatCurrency(sortedPayouts.find((p) => p.placement === nextPayoutPosition)!.amount)
              : '-'}
          </p>
        </div>
        <div className="bg-gray-800 border border-yellow-700 rounded-lg p-6 text-center">
          <p className="text-gray-400 text-sm mb-1">
            {remainingPlayers >= bubblePosition ? 'Bubble Position' : 'In the Money'}
          </p>
          <p className="text-4xl font-bold text-yellow-500">
            {remainingPlayers >= bubblePosition ? `${bubblePosition}th` : '✓'}
          </p>
        </div>
      </div>

      {/* Payout Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-gray-800">
              <TableHead className="text-gray-400">Place</TableHead>
              <TableHead className="text-gray-400 text-right">Payout</TableHead>
              <TableHead className="text-gray-400 text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayouts.map((payout) => {
              const isPaid = payout.placement > remainingPlayers
              const isNext = payout.placement === nextPayoutPosition
              const isBubble = payout.placement === bubblePosition

              return (
                <TableRow
                  key={payout.id}
                  className={`border-gray-700 ${
                    isNext ? 'bg-green-900/30 hover:bg-green-900/40' :
                    isBubble ? 'bg-yellow-900/30 hover:bg-yellow-900/40' :
                    'hover:bg-gray-800'
                  }`}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${isNext || isBubble ? 'font-bold' : ''}`}>
                        {payout.placement === 1 ? '1st' :
                         payout.placement === 2 ? '2nd' :
                         payout.placement === 3 ? '3rd' :
                         `${payout.placement}th`}
                      </span>
                      {payout.placement === 1 && (
                        <TrendingUpIcon className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-lg ${isNext || isBubble ? 'font-bold' : ''}`}>
                      {formatCurrency(payout.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {isPaid ? (
                      <Badge variant="default" className="bg-gray-600">
                        Paid
                      </Badge>
                    ) : isNext ? (
                      <Badge variant="default" className="bg-green-600">
                        <DollarSignIcon className="h-3 w-3 mr-1" />
                        Next Payout
                      </Badge>
                    ) : isBubble && remainingPlayers >= bubblePosition ? (
                      <Badge variant="default" className="bg-yellow-600">
                        Bubble
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-gray-600">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {sortedPayouts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No payout structure defined</p>
        </div>
      )}
    </div>
  )
}
