'use client'

import { usePlayers } from '@/lib/supabase/hooks'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TrophyIcon } from 'lucide-react'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function POYTable() {
  const { players, loading, error } = usePlayers()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-xl text-gray-400">Loading rankings...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-xl text-red-500">Error loading rankings</p>
      </div>
    )
  }

  // Sort by POY points
  const sortedPlayers = [...players].sort((a, b) => b.poy_points - a.poy_points)

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700 hover:bg-gray-800">
            <TableHead className="text-gray-400 w-16">Rank</TableHead>
            <TableHead className="text-gray-400">Player</TableHead>
            <TableHead className="text-gray-400 text-right">POY Points</TableHead>
            <TableHead className="text-gray-400 text-right">Earnings</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPlayers.map((player, index) => {
            const rank = index + 1
            const isTopThree = rank <= 3

            return (
              <TableRow
                key={player.id}
                className={`border-gray-700 hover:bg-gray-800 ${
                  isTopThree ? 'bg-gray-800/50' : ''
                }`}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {rank === 1 && (
                      <TrophyIcon className="h-5 w-5 text-yellow-500" />
                    )}
                    {rank === 2 && (
                      <TrophyIcon className="h-5 w-5 text-gray-400" />
                    )}
                    {rank === 3 && (
                      <TrophyIcon className="h-5 w-5 text-orange-600" />
                    )}
                    <span className={isTopThree ? 'text-xl font-bold' : ''}>
                      {rank}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${isTopThree ? 'font-bold' : ''}`}>
                      {player.name}
                    </span>
                    {rank === 1 && (
                      <Badge variant="default" className="bg-yellow-600">
                        Leader
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`text-lg ${isTopThree ? 'font-bold' : ''}`}>
                    {player.poy_points.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell className="text-right text-gray-400">
                  {formatCurrency(player.total_earnings)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {sortedPlayers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No players found</p>
        </div>
      )}
    </div>
  )
}
