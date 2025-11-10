'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useRegistrations } from '@/lib/supabase/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Registration } from '@/lib/types'

function AdminManageContent() {
  const searchParams = useSearchParams()
  const tournamentId = searchParams.get('tournament') || ''

  const [loading, setLoading] = useState(true)
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)
  const [eliminating, setEliminating] = useState(false)

  const { registrations } = useRegistrations(tournamentId)
  const supabase = createClient()

  // Get active registrations (not yet eliminated)
  const activeRegistrations = registrations.filter((reg) => !reg.eliminated_at)

  // Get eliminated registrations
  const eliminatedRegistrations = registrations
    .filter((reg) => reg.eliminated_at)
    .sort((a, b) => (b.placement || 0) - (a.placement || 0))

  const handleEliminatePlayer = async () => {
    if (!selectedRegistration || !tournamentId) return

    setEliminating(true)

    try {
      // Calculate placement (number of remaining players)
      const remainingCount = activeRegistrations.length
      const placement = remainingCount

      // Update the registration
      const updateData: { eliminated_at: string; placement: number } = {
        eliminated_at: new Date().toISOString(),
        placement,
      }
      const { error: updateError } = await (supabase as any)
        .from('registrations')
        .update(updateData)
        .eq('id', selectedRegistration.id)

      if (updateError) throw updateError

      // Close dialog
      setSelectedRegistration(null)
    } catch (error) {
      console.error('Error eliminating player:', error)
      alert('Failed to eliminate player. Please try again.')
    } finally {
      setEliminating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-xl">Loading...</p>
      </div>
    )
  }

  if (!tournamentId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white gap-4 p-4">
        <p className="text-xl text-red-500">No tournament specified</p>
        <p className="text-gray-400 text-center">
          Please provide a tournament ID in the URL: ?tournament=YOUR_ID
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center py-6">
          <h1 className="text-3xl font-bold mb-2">Tournament Admin</h1>
          <Badge variant="outline" className="text-lg px-4 py-1">
            {activeRegistrations.length} Players Remaining
          </Badge>
        </header>

        {/* Active Players */}
        <Card className="bg-gray-800 border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4">Active Players</h2>
          <div className="space-y-2">
            {activeRegistrations.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No active players</p>
            ) : (
              activeRegistrations.map((registration) => (
                <div
                  key={registration.id}
                  className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-lg">{registration.full_name}</p>
                    <p className="text-sm text-gray-400">
                      Tier: {registration.selected_buyin_tier === 'A' ? 'Standard' : 'Premium'}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setSelectedRegistration(registration)}
                  >
                    Eliminate
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Eliminated Players */}
        {eliminatedRegistrations.length > 0 && (
          <Card className="bg-gray-800 border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Recently Eliminated</h2>
            <div className="space-y-2">
              {eliminatedRegistrations.slice(0, 5).map((registration) => {
                return (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{registration.full_name}</p>
                      <p className="text-sm text-gray-400">
                        {registration.placement
                          ? `${registration.placement}${getOrdinalSuffix(registration.placement)} place`
                          : 'Eliminated'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Elimination Confirmation Dialog */}
      <Dialog open={!!selectedRegistration} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Eliminate Player</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to eliminate {selectedRegistration?.full_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-lg">
              <span className="text-gray-400">Placement:</span>{' '}
              <span className="font-bold">
                {activeRegistrations.length}
                {getOrdinalSuffix(activeRegistrations.length)}
              </span>
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedPlayer(null)}
              disabled={eliminating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEliminatePlayer}
              disabled={eliminating}
            >
              {eliminating ? 'Eliminating...' : 'Confirm Elimination'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) return 'st'
  if (j === 2 && k !== 12) return 'nd'
  if (j === 3 && k !== 13) return 'rd'
  return 'th'
}

export default function AdminManagePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-xl">Loading...</p>
      </div>
    }>
      <AdminManageContent />
    </Suspense>
  )
}
