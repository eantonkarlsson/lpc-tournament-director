'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import jsPDF from 'jspdf'
import type { Player } from '@/lib/types/database'

interface Tournament {
  id: string
  title: string
  date: string
}

export default function BettingCodesPage() {
  const supabase = createClient()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Load tournaments
  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('id, title, date')
          .order('date', { ascending: false })

        if (error) throw error
        const tournamentData = (data as Tournament[]) || []
        setTournaments(tournamentData)

        // Auto-select the first tournament
        if (tournamentData.length > 0 && !selectedTournamentId) {
          setSelectedTournamentId(tournamentData[0].id)
        }
      } catch (err) {
        console.error('Failed to load tournaments:', err)
      }
    }

    loadTournaments()
  }, [supabase, selectedTournamentId])

  // Load players for selected tournament
  useEffect(() => {
    const loadPlayers = async () => {
      if (!selectedTournamentId) {
        setPlayers([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Get registrations for the tournament
        const { data: registrations, error: regError } = await supabase
          .from('registrations')
          .select('player_id')
          .eq('tournament_id', selectedTournamentId)

        if (regError) throw regError

        const playerIds = (registrations || []).map(r => r.player_id)

        if (playerIds.length === 0) {
          setPlayers([])
          setLoading(false)
          return
        }

        // Get player details
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .in('id', playerIds)
          .order('name', { ascending: true })

        if (error) throw error
        setPlayers((data as Player[]) || [])
      } catch (err) {
        console.error('Failed to load players:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
  }, [supabase, selectedTournamentId])

  const generatePDF = () => {
    setGenerating(true)
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const lineHeight = 10
      const cardsPerRow = 2
      const cardWidth = (pageWidth - margin * 2 - 10) / cardsPerRow
      const cardHeight = 40
      let currentX = margin
      let currentY = margin

      // Get tournament title
      const selectedTournament = tournaments.find(t => t.id === selectedTournamentId)
      const tournamentName = selectedTournament?.title || 'LPC Tournament'

      // Title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(`${tournamentName} - Betting Codes`, pageWidth / 2, currentY, { align: 'center' })
      currentY += 15

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      players.forEach((player, index) => {
        // Check if we need a new row
        if (index > 0 && index % cardsPerRow === 0) {
          currentX = margin
          currentY += cardHeight + 5
        }

        // Check if we need a new page
        if (currentY + cardHeight > pageHeight - margin) {
          doc.addPage()
          currentY = margin
          currentX = margin
        }

        // Draw card border
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.5)
        doc.rect(currentX, currentY, cardWidth, cardHeight)

        // Draw dotted cut line
        doc.setLineDash([2, 2])
        doc.setDrawColor(150, 150, 150)
        doc.line(currentX, currentY, currentX + cardWidth, currentY)
        doc.setLineDash([]) // Reset to solid line

        // Player name
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text(player.name, currentX + cardWidth / 2, currentY + 12, { align: 'center' })

        // Betting code label
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text('Betting Code:', currentX + cardWidth / 2, currentY + 22, { align: 'center' })

        // Betting code value
        doc.setFontSize(16)
        doc.setFont('courier', 'bold')
        doc.text(player.betting_code || 'N/A', currentX + cardWidth / 2, currentY + 30, { align: 'center' })

        // Move to next column
        currentX += cardWidth + 5
      })

      // Save the PDF
      doc.save('lpc-betting-codes.pdf')
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-white text-2xl">Loading players...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Betting Codes</h1>
          <p className="text-slate-400">Generate a PDF with all player betting codes for printing</p>
        </div>

        {/* Tournament Filter */}
        <Card className="bg-slate-900/90 border-slate-700 p-6 mb-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-300">Select Tournament</Label>
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-slate-500"
            >
              <option value="">All Players</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.title} - {new Date(tournament.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="bg-slate-900/90 border-slate-700 p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Players with Betting Codes</h2>
              <p className="text-slate-400">
                {selectedTournamentId
                  ? `Registered for ${tournaments.find(t => t.id === selectedTournamentId)?.title}: ${players.length} players`
                  : `Total: ${players.length} players`
                }
              </p>
            </div>
            <Button
              onClick={generatePDF}
              disabled={generating || players.length === 0}
              className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
            >
              {generating ? 'Generating PDF...' : 'Generate PDF'}
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex justify-between items-center p-4 bg-slate-800 border border-slate-700 rounded-lg"
              >
                <div>
                  <p className="text-white font-semibold">{player.name}</p>
                </div>
                <div>
                  <code className="text-yellow-500 font-mono text-lg">{player.betting_code || 'N/A'}</code>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="text-slate-500 text-sm">
          <p className="mb-2">The PDF will contain printable cards with:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Player name</li>
            <li>Betting code in large, readable font</li>
            <li>Dotted lines for easy cutting</li>
            <li>2 cards per row for efficient printing</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
