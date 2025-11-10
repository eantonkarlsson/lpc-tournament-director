import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TimerIcon, UsersIcon, TrophyIcon, DollarSignIcon } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            LPC Tournament Director
          </h1>
          <p className="text-xl text-gray-400">
            Professional poker tournament management with real-time updates
          </p>
        </header>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 max-w-4xl mx-auto">
          <Card className="bg-gray-800 border-gray-700 p-8 hover:border-gray-600 transition-colors">
            <div className="flex items-start gap-4">
              <div className="bg-blue-600 p-3 rounded-lg">
                <TimerIcon className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">Tournament Display</h3>
                <p className="text-gray-400 mb-4">
                  Unified fullscreen display with blind timer, POY rankings, and payout
                  ladder. Perfect for presenting on a TV or projector.
                </p>
                <Link href="/display?tournament=demo">
                  <Button variant="outline" className="w-full">
                    Open Display
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card className="bg-gray-800 border-gray-700 p-8 hover:border-gray-600 transition-colors">
            <div className="flex items-start gap-4">
              <div className="bg-green-600 p-3 rounded-lg">
                <UsersIcon className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">Admin Panel</h3>
                <p className="text-gray-400 mb-4">
                  Mobile-friendly interface to manage player eliminations and tournament
                  status from any device.
                </p>
                <Link href="/admin/manage?tournament=demo">
                  <Button variant="outline" className="w-full">
                    Open Admin
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Setup Instructions */}
        <Card className="bg-gray-800 border-gray-700 p-8">
          <h2 className="text-3xl font-bold mb-6">Getting Started</h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex gap-4">
              <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                1
              </span>
              <div>
                <p className="font-semibold mb-1">Set up Supabase Database</p>
                <p className="text-gray-400">
                  Create a Supabase project and run the SQL schema from{' '}
                  <code className="bg-gray-700 px-2 py-1 rounded">supabase/schema.sql</code>
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                2
              </span>
              <div>
                <p className="font-semibold mb-1">Configure Environment Variables</p>
                <p className="text-gray-400">
                  Add your Supabase credentials to{' '}
                  <code className="bg-gray-700 px-2 py-1 rounded">.env.local</code>
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                3
              </span>
              <div>
                <p className="font-semibold mb-1">Create Your First Tournament</p>
                <p className="text-gray-400">
                  Use the Supabase interface to add tournaments, players, and blind
                  structures
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                4
              </span>
              <div>
                <p className="font-semibold mb-1">Start Your Tournament</p>
                <p className="text-gray-400">
                  Open the timer on your display device and admin panel on your phone
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
