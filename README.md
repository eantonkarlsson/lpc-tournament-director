# LPC Tournament Director

A modern poker tournament management system with real-time updates and multi-device support.

## Features

### Alpha Version
- **Fullscreen Blind Timer**: Display tournament blind levels on a laptop/monitor in fullscreen mode
- **Admin Interface**: Report eliminated players from any device (mobile-optimized)
- **Player of the Year Rankings**: Live POY standings that update dynamically as players are eliminated
- **Payout Ladder**: Display remaining payouts and next elimination amount

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL + Real-time)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Utilities**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project ([create one free](https://supabase.com))

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up your environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials from your project settings

3. Set up the database schema (instructions coming soon)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
app/
├── (admin)/          # Admin routes (phone interface)
├── timer/            # Fullscreen blind timer
├── rankings/         # POY standings display
└── payouts/          # Payout ladder display
components/
├── ui/               # shadcn UI components
├── Timer/            # Timer components
├── Rankings/         # POY table
└── Payouts/          # Payout ladder
lib/
├── supabase/         # Supabase client & hooks
└── types/            # TypeScript definitions
```

## Usage

- **Timer Display**: Navigate to `/timer` on your presentation device
- **Admin Panel**: Access `/admin` on your phone to manage eliminations
- **Rankings**: View `/rankings` for real-time POY standings
- **Payouts**: View `/payouts` for payout structure

## Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

MIT
