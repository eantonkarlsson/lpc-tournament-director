# Setup Guide

Follow these steps to get your LPC Tournament Director up and running.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for your project to be provisioned (takes ~2 minutes)
3. Go to the SQL Editor in your Supabase dashboard
4. Copy the contents of `supabase/schema.sql` and paste it into the SQL Editor
5. Click "Run" to execute the SQL

This will create all necessary tables, indexes, and sample data.

## Step 3: Configure Environment Variables

1. In your Supabase dashboard, go to **Settings → API**
2. Copy your project URL and anon key
3. Open `.env.local` in this project
4. Fill in your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Enable Realtime

In your Supabase dashboard:

1. Go to **Database → Replication**
2. Enable replication for these tables:
   - players
   - tournaments
   - tournament_entries
   - blind_structures
   - payout_structures

This enables real-time updates across all connected clients.

## Step 5: Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Using the App

### Viewing the Timer

Navigate to: `http://localhost:3000/timer?tournament=YOUR_TOURNAMENT_ID`

- Press **F** to toggle fullscreen
- Press **C** to toggle controls
- Use the control buttons to start/pause/navigate levels

### Admin Panel (Mobile)

Navigate to: `http://localhost:3000/admin/manage?tournament=YOUR_TOURNAMENT_ID`

Use this on your phone to eliminate players during the tournament.

### POY Rankings

Navigate to: `http://localhost:3000/rankings`

Displays all player rankings sorted by POY points.

### Payout Ladder

Navigate to: `http://localhost:3000/payouts?tournament=YOUR_TOURNAMENT_ID`

Shows the payout structure and highlights the next payout position.

## Creating Your First Tournament

### Using Supabase Interface

1. Go to your Supabase dashboard → **Table Editor**
2. Open the `tournaments` table
3. Click **Insert → Insert row**
4. Fill in:
   - name: "My First Tournament"
   - date: Today's date
   - status: "active"
   - buy_in: 100
   - prize_pool: 1000

5. Copy the generated tournament ID

### Adding Players

1. Open the `tournament_entries` table
2. For each player, insert a row with:
   - tournament_id: Your tournament ID
   - player_id: Select from existing players or add new ones to the `players` table first

### Setting Up Blind Structure

1. Open the `blind_structures` table
2. Add multiple rows for your tournament:
   - tournament_id: Your tournament ID
   - level: 1, 2, 3, etc.
   - small_blind: 25, 50, 100, etc.
   - big_blind: 50, 100, 200, etc.
   - ante: 0, 0, 25, etc.
   - duration: 900 (15 minutes in seconds)

### Setting Up Payouts

1. Open the `payout_structures` table
2. Add rows for each payout position:
   - tournament_id: Your tournament ID
   - placement: 1, 2, 3, etc.
   - amount: Prize amounts

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" and import your repository
4. Add your environment variables in the Vercel dashboard
5. Deploy!

Vercel automatically optimizes Next.js apps for production.

## Tips

- **Multiple Displays**: Open the timer on a TV/projector and the admin panel on your phone
- **Real-time Updates**: Any changes in the admin panel instantly update on all connected displays
- **Keyboard Shortcuts**: Use F for fullscreen and C to toggle controls on the timer
- **Sample Data**: The schema includes sample data with tournament ID `00000000-0000-0000-0000-000000000001` for testing

## Troubleshooting

### Timer not loading

- Check that you've provided a valid tournament ID in the URL
- Verify the tournament has blind structures in the database

### Real-time updates not working

- Ensure you've enabled replication for all tables in Supabase
- Check that your environment variables are correct

### Admin panel errors

- Verify you're using a valid tournament ID
- Check that tournament entries exist for that tournament

## Next Steps

- Customize the blind structures for your league
- Add more players to the database
- Adjust payout structures based on your prize pools
- Consider adding authentication for admin features

For more help, check the README.md or open an issue on GitHub.
