'use client'

import { POYTable } from '@/components/Rankings/POYTable'
import { Card } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default function RankingsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="text-center py-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            Player of the Year Rankings
          </h1>
          <p className="text-gray-400 text-lg">
            Live standings updated in real-time
          </p>
        </header>

        <Card className="bg-gray-800 border-gray-700 p-6">
          <POYTable />
        </Card>

        <footer className="text-center text-gray-500 text-sm py-4">
          Rankings update automatically as tournaments conclude
        </footer>
      </div>
    </div>
  )
}
