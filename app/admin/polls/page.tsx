'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthProvider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlusIcon, TrashIcon, XIcon } from 'lucide-react'
import type { BettingPoll, BettingOption, Tournament } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

function AdminPollsContent() {
  const searchParams = useSearchParams()
  const tournamentId = searchParams.get('tournament') || ''
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [polls, setPolls] = useState<BettingPoll[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [selectedTournamentId, setSelectedTournamentId] = useState(tournamentId)
  const [pollTitle, setPollTitle] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [error, setError] = useState<string | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load tournaments
  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('*')
          .order('date', { ascending: false })
          .limit(20)

        if (error) throw error
        const tournamentData = (data as Tournament[]) || []
        setTournaments(tournamentData)

        // Set default tournament if not set
        if (!selectedTournamentId && tournamentData.length > 0) {
          setSelectedTournamentId(tournamentData[0].id)
        }
      } catch (err) {
        console.error('Failed to load tournaments:', err)
      }
    }

    loadTournaments()
  }, [supabase, selectedTournamentId])

  // Load polls
  useEffect(() => {
    const loadPolls = async () => {
      if (!selectedTournamentId) return

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('betting_polls')
          .select('*')
          .eq('tournament_id', selectedTournamentId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setPolls(data || [])
      } catch (err) {
        console.error('Failed to load polls:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPolls()
  }, [selectedTournamentId, supabase])

  const addOption = () => {
    setPollOptions([...pollOptions, ''])
  }

  const removeOption = (index: number) => {
    if (pollOptions.length <= 2) return // Keep at least 2 options
    setPollOptions(pollOptions.filter((_, i) => i !== index))
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...pollOptions]
    newOptions[index] = value
    setPollOptions(newOptions)
  }

  const handleCreatePoll = async () => {
    setError(null)

    // Validation
    if (!pollTitle.trim()) {
      setError('Please enter a poll title')
      return
    }

    const validOptions = pollOptions.filter(opt => opt.trim())
    if (validOptions.length < 2) {
      setError('Please add at least 2 options')
      return
    }

    if (!selectedTournamentId) {
      setError('Please select a tournament')
      return
    }

    setCreating(true)

    try {
      // Create poll
      const { data: pollData, error: pollError } = await (supabase
        .from('betting_polls') as any)
        .insert({
          tournament_id: selectedTournamentId,
          title: pollTitle.trim(),
          is_active: true,
        })
        .select()
        .single()

      if (pollError) throw pollError

      // Create options
      const optionsToInsert = validOptions.map((option, index) => ({
        poll_id: pollData.id,
        option_text: option.trim(),
        display_order: index,
      }))

      const { error: optionsError } = await (supabase
        .from('betting_options') as any)
        .insert(optionsToInsert)

      if (optionsError) throw optionsError

      // Refresh polls
      const { data: updatedPolls } = await supabase
        .from('betting_polls')
        .select('*')
        .eq('tournament_id', selectedTournamentId)
        .order('created_at', { ascending: false })

      setPolls(updatedPolls || [])

      // Reset form
      setPollTitle('')
      setPollOptions(['', ''])
      setShowCreateDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create poll')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (poll: BettingPoll) => {
    try {
      const { error } = await (supabase
        .from('betting_polls') as any)
        .update({ is_active: !poll.is_active })
        .eq('id', poll.id)

      if (error) throw error

      // Update local state
      setPolls(polls.map(p =>
        p.id === poll.id ? { ...p, is_active: !p.is_active } : p
      ))
    } catch (err) {
      console.error('Failed to toggle poll:', err)
    }
  }

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll? This will also delete all votes.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('betting_polls')
        .delete()
        .eq('id', pollId)

      if (error) throw error

      setPolls(polls.filter(p => p.id !== pollId))
    } catch (err) {
      console.error('Failed to delete poll:', err)
    }
  }

  if (authLoading || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Betting Polls Manager</h1>
          <p className="text-slate-400">Create and manage betting polls for tournaments</p>
        </div>

        {/* Tournament Selector */}
        <Card className="bg-slate-900/80 border-slate-700 p-6 mb-6">
          <Label className="text-white mb-2 block">Select Tournament</Label>
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
          >
            <option value="">Select a tournament...</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.title} - {new Date(tournament.date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </Card>

        {/* Create Poll Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={!selectedTournamentId}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create New Poll
          </Button>
        </div>

        {/* Polls List */}
        {loading ? (
          <Card className="bg-slate-900/80 border-slate-700 p-8">
            <p className="text-slate-400 text-center">Loading polls...</p>
          </Card>
        ) : polls.length === 0 ? (
          <Card className="bg-slate-900/80 border-slate-700 p-8">
            <p className="text-slate-400 text-center">No polls created yet for this tournament.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {polls.map((poll) => (
              <Card key={poll.id} className="bg-slate-900/80 border-slate-700 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{poll.title}</h3>
                      <Badge
                        variant="outline"
                        className={poll.is_active ? 'bg-green-600 text-white border-green-500' : 'bg-slate-600 text-white border-slate-500'}
                      >
                        {poll.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400">
                      Created {new Date(poll.created_at).toLocaleString()}
                    </p>
                    <div className="mt-3 text-xs text-slate-500 font-mono">
                      Poll ID: {poll.id}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      Voting URL: <code className="text-cyan-400">{typeof window !== 'undefined' ? `${window.location.origin}/vote/${poll.id}` : ''}</code>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(poll)}
                      className="border-slate-600 hover:bg-slate-800"
                    >
                      {poll.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePoll(poll.id)}
                      className="border-red-700 text-red-400 hover:bg-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Poll Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create Betting Poll</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new poll for players to vote on during breaks
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Poll Title */}
            <div className="space-y-2">
              <Label>Poll Title</Label>
              <Input
                value={pollTitle}
                onChange={(e) => setPollTitle(e.target.value)}
                placeholder="e.g., Who will win this tournament?"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label>Options</Label>
              {pollOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  {pollOptions.length > 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="border-slate-700 hover:bg-slate-800"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                className="border-slate-700 hover:bg-slate-800 w-full"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="border-slate-700 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePoll}
              disabled={creating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {creating ? 'Creating...' : 'Create Poll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminPollsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <p className="text-white text-xl">Loading...</p>
      </div>
    }>
      <AdminPollsContent />
    </Suspense>
  )
}
