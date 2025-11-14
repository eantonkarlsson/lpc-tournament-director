'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useRegistrations } from '@/lib/supabase/hooks'
import { useAuth } from '@/lib/auth/AuthProvider'
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
import { MinusIcon, PlusIcon } from 'lucide-react'
import type { Registration } from '@/lib/types'

function AdminManageContent() {
  const searchParams = useSearchParams()
  const tournamentId = searchParams.get('tournament') || ''
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)
  const [eliminating, setEliminating] = useState(false)
  const [updatingRebuys, setUpdatingRebuys] = useState<string | null>(null)
  const [uneliminating, setUneliminating] = useState<string | null>(null)

  const { registrations, loading } = useRegistrations(tournamentId)
  const supabase = createClient()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Calculate total rebuy amounts
  const totalRebuys = registrations.reduce((sum, reg) => {
    return sum + (reg.number_of_rebuys || 0)
  }, 0)

  const totalRebuyAmount = registrations.reduce((sum, reg) => {
    const rebuys = reg.number_of_rebuys || 0
    const buyInAmount = reg.buy_in_amount || 0
    return sum + (rebuys * buyInAmount)
  }, 0)

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

      // Create or update tournament_results entry for POY calculation
      // Note: Uses current rebuy count (not finalized until tournament ends)
      if (selectedRegistration.player_id) {
        const tournamentResultData = {
          tournament_id: tournamentId,
          player_id: selectedRegistration.player_id,
          placement: placement,
          number_of_rebuys: selectedRegistration.number_of_rebuys || 0,
          number_of_addons: 0, // Set to 0 for now, can be updated later
        }

        const { error: resultError } = await (supabase as any)
          .from('tournament_results')
          .upsert(tournamentResultData, {
            onConflict: 'tournament_id,player_id'
          })

        if (resultError) {
          console.error('Error creating tournament result:', resultError)
          // Don't fail the elimination if tournament_results fails
          // The player is still eliminated in registrations
        }
      }

      // Close dialog
      setSelectedRegistration(null)
    } catch (error) {
      console.error('Error eliminating player:', error)
      alert('Failed to eliminate player. Please try again.')
    } finally {
      setEliminating(false)
    }
  }

  const handleUpdateRebuys = async (registrationId: string, currentRebuys: number, increment: boolean) => {
    setUpdatingRebuys(registrationId)

    try {
      const newRebuys = increment ? currentRebuys + 1 : Math.max(0, currentRebuys - 1)

      const { error } = await (supabase as any)
        .from('registrations')
        .update({ number_of_rebuys: newRebuys })
        .eq('id', registrationId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating rebuys:', error)
      alert('Failed to update rebuys. Please try again.')
    } finally {
      setUpdatingRebuys(null)
    }
  }

  const handleUneliminatePlayer = async (registration: Registration) => {
    if (!registration.id || !tournamentId) return

    setUneliminating(registration.id)

    try {
      // Clear eliminated_at and placement
      const { error: updateError } = await (supabase as any)
        .from('registrations')
        .update({
          eliminated_at: null,
          placement: null
        })
        .eq('id', registration.id)

      if (updateError) throw updateError

      // Delete tournament_results entry if it exists
      if (registration.player_id) {
        const { error: deleteError } = await (supabase as any)
          .from('tournament_results')
          .delete()
          .eq('tournament_id', tournamentId)
          .eq('player_id', registration.player_id)

        if (deleteError) {
          console.error('Error deleting tournament result:', deleteError)
          // Don't fail the un-elimination if tournament_results deletion fails
        }
      }
    } catch (error) {
      console.error('Error un-eliminating player:', error)
      alert('Failed to un-eliminate player. Please try again.')
    } finally {
      setUneliminating(null)
    }
  }

  // Show loading while checking auth
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="text-center">
          <div className="animate-pulse text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Loading...
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null
  }

  if (!tournamentId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white gap-6 p-4">
        <div className="text-center space-y-4">
          <p className="text-3xl font-bold text-red-400">No tournament specified</p>
          <p className="text-slate-400 text-lg">
            Please provide a tournament ID in the URL: <code className="px-2 py-1 bg-slate-800 rounded text-cyan-400">?tournament=YOUR_ID</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="text-center py-8 space-y-4">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Tournament Admin</h1>
          <div className="flex justify-center gap-4">
            <Badge variant="outline" className="text-2xl font-bold px-6 py-3 bg-slate-800/50 border-slate-600 text-slate-200 shadow-lg">
              {activeRegistrations.length} Players Remaining
            </Badge>
          </div>
          <div className="flex justify-center gap-4">
            <Card className="bg-slate-800/50 border-slate-700/50 p-4 inline-block">
              <div className="text-center">
                <div className="text-sm text-slate-400 mb-1">Total Rebuys</div>
                <div className="text-3xl font-bold text-cyan-400">{totalRebuys}</div>
              </div>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700/50 p-4 inline-block">
              <div className="text-center">
                <div className="text-sm text-slate-400 mb-1">Rebuy Amount</div>
                <div className="text-3xl font-bold text-emerald-400">${totalRebuyAmount.toFixed(0)}</div>
              </div>
            </Card>
          </div>
        </header>

        {/* Active Players */}
        <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700/50 shadow-2xl p-8">
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">Active Players</h2>
          <div className="space-y-3">
            {activeRegistrations.length === 0 ? (
              <p className="text-slate-400 text-center py-8 text-lg">No active players</p>
            ) : (
              activeRegistrations.map((registration) => {
                const rebuys = registration.number_of_rebuys || 0
                const buyInAmount = registration.buy_in_amount || 0
                const rebuyAmount = rebuys * buyInAmount
                const isUpdating = updatingRebuys === registration.id

                return (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between p-5 bg-slate-800/60 rounded-lg border border-slate-700/50 hover:bg-slate-800/80 transition-colors shadow-lg"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-xl text-white mb-1">{registration.full_name}</p>
                      <p className="text-base text-slate-400">
                        Tier: <span className="font-semibold text-slate-300">{registration.selected_buyin_tier === 'A' ? 'Standard' : 'Premium'}</span>
                      </p>
                    </div>

                    {/* Rebuy Controls */}
                    <div className="flex items-center gap-4 mr-4">
                      <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">Rebuys</div>
                        <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-700/50">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateRebuys(registration.id, rebuys, false)}
                            disabled={isUpdating || rebuys === 0}
                            className="h-8 w-8 p-0 border-slate-600 hover:bg-slate-700"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </Button>
                          <span className="text-xl font-bold text-white min-w-[2rem] text-center">{rebuys}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateRebuys(registration.id, rebuys, true)}
                            disabled={isUpdating}
                            className="h-8 w-8 p-0 border-slate-600 hover:bg-slate-700"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        {rebuyAmount > 0 && (
                          <div className="text-xs text-emerald-400 mt-1">${rebuyAmount.toFixed(0)}</div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={() => setSelectedRegistration(registration)}
                      className="font-semibold shadow-lg"
                    >
                      Eliminate
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Eliminated Players */}
        {eliminatedRegistrations.length > 0 && (
          <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700/50 shadow-2xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-slate-300">Recently Eliminated</h2>
            <div className="space-y-3">
              {eliminatedRegistrations.slice(0, 5).map((registration) => {
                const isUneliminating = uneliminating === registration.id
                return (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between p-4 bg-slate-800/40 rounded-lg border border-slate-700/30"
                  >
                    <div>
                      <p className="font-semibold text-lg text-slate-200">{registration.full_name}</p>
                      <p className="text-base text-slate-400">
                        {registration.placement
                          ? `${registration.placement}${getOrdinalSuffix(registration.placement)} place`
                          : 'Eliminated'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUneliminatePlayer(registration)}
                      disabled={isUneliminating}
                      className="font-semibold border-emerald-600 hover:bg-emerald-900/30 text-emerald-400"
                    >
                      {isUneliminating ? 'Un-eliminating...' : 'Un-eliminate'}
                    </Button>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Elimination Confirmation Dialog */}
      <Dialog open={!!selectedRegistration} onOpenChange={(open) => !open && setSelectedRegistration(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Eliminate Player</DialogTitle>
            <DialogDescription className="text-slate-400 text-base">
              Are you sure you want to eliminate <span className="font-semibold text-white">{selectedRegistration?.full_name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-xl">
                <span className="text-slate-400">Placement:</span>{' '}
                <span className="font-bold text-2xl text-cyan-400">
                  {activeRegistrations.length}
                  {getOrdinalSuffix(activeRegistrations.length)}
                </span>
              </p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setSelectedRegistration(null)}
              disabled={eliminating}
              className="font-semibold border-slate-600 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={handleEliminatePlayer}
              disabled={eliminating}
              className="font-semibold shadow-lg"
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="text-center">
          <div className="animate-pulse text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Loading admin...
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    }>
      <AdminManageContent />
    </Suspense>
  )
}
