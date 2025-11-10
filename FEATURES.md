# LPC Tournament Director - Features

## Current Implementation (Alpha v1.0)

### 🎮 Unified Tournament Display (`/display?tournament=demo`)

A single-screen view designed for TV/projector display with three main sections:

#### Left Panel: Player of the Year Rankings
**Smart Display Logic:**
- ✅ Always shows **top 3** current leaders
- ✅ Shows **all active players** in the current tournament who can mathematically reach top 3
- ✅ Visual indicators:
  - 🏆 Trophy icons for 1st, 2nd, 3rd place
  - 🔵 Blue "Active" badge for players still in tournament
  - 🔵 Blue left border highlight for active players
  - Shows "+100 max" potential points for active players outside top 3
- Uses actual rank from overall standings (not sequential display order)

**How it works:**
- Calculates if `current_points + max_tournament_points > 3rd_place_points`
- Only shows players who are still active (not eliminated) AND can catch top 3
- Updates in real-time as players are eliminated

#### Center Panel: Blind Timer
**Full Timer Controls:**
- ⏮️ Previous Level button
- ▶️ Start/Resume button (green)
- ⏸️ Pause button (yellow)
- ⏭️ Next Level button
- 🔄 Reset button
- 🎚️ **Time slider** - drag to adjust time remaining
- Large countdown display with color coding:
  - 🟢 Green: > 3 minutes
  - 🟡 Yellow: 1-3 minutes
  - 🔴 Red: < 1 minute
- Current blind level badge
- "PAUSED" indicator when paused
- Current blinds display (SB/BB/Ante)
- Next level preview

**Keyboard Shortcuts:**
- `F` - Toggle fullscreen
- `C` - Toggle controls visibility
- `Space` - Play/Pause timer

#### Right Panel: Prize Pool & Payouts
**Dual Prize Structure:**
- 💰 **Standard** and **Premium** columns
- Shows different payout amounts for each tier
- Premium typically 1.5x Standard (e.g., $3,000 vs $4,500 for 1st)

**Next Payout Display:**
- Shows "If Standard player:" amount
- Shows "If Premium player:" amount
- Both highlighted in green
- Allows different buy-in levels with appropriate payouts

**Payout Table:**
- Top 8 payout positions displayed
- Three columns: Place, Standard, Premium
- Visual indicators:
  - 🟢 "Next" badge on upcoming payout row
  - ⚫ "Paid" badge on completed positions
  - Green highlight on next elimination payout
  - Both Standard and Premium amounts shown for comparison

### 📱 Admin Panel (`/admin/manage?tournament=demo`)

Mobile-optimized interface for managing tournament:
- List of all active (non-eliminated) players
- "Eliminate" button for each player
- Confirmation dialog before elimination
- Shows placement and ordinal suffix (1st, 2nd, 3rd, etc.)
- Recent eliminations list
- Real-time sync with display screen

### 🎲 Mock Data Support

Works immediately without Supabase setup:
- 12 mock players
- 8 currently "active" (not eliminated)
- 10 blind levels (25/50 up to 800/1600)
- 8 payout positions with dual structure:
  - **Standard**: $3,000 / $1,800 / $1,200 / ... / $200
  - **Premium**: $4,500 / $2,700 / $1,800 / ... / $300
- POY points structure (100 for 1st, 75 for 2nd, 60 for 3rd, etc.)

Access with: `?tournament=demo` or no tournament parameter

## Technical Features

### Real-time Updates
- Supabase real-time subscriptions
- Automatic updates across all connected displays
- Optimistic UI updates

### State Management
- Zustand for timer state
- Local timer logic with auto-advance
- Persistent timer settings

### Responsive Design
- 3-column grid layout for main display
- Mobile-optimized admin interface
- Fullscreen support with F key
- Dark theme throughout

### Type Safety
- Full TypeScript coverage
- Database schema types
- Mock data with proper typing

## Coming Soon

### Database Setup
- Supabase schema provided in `supabase/schema.sql`
- Instructions in `SETUP.md`
- Environment variable configuration

### Features to Add
- Tournament creation interface
- Player management
- Blind structure editor
- Payout calculator
- Tournament history
- Advanced POY calculations
- Sound alerts for timer
- Break timers
- Chip stack tracking

## Development

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Production server
```

**Current URLs:**
- Home: http://localhost:3000
- Display: http://localhost:3000/display?tournament=demo
- Admin: http://localhost:3000/admin/manage?tournament=demo

## POY Points Logic Example

With mock data:
- **John Smith** (150 pts, 1st) - Always shown
- **Sarah Johnson** (120 pts, 2nd) - Always shown
- **Mike Williams** (100 pts, 3rd) - Always shown
- **Emily Brown** (90 pts, 4th, Active) - Shown (90 + 100 = 190 > 100) ✓
- **David Davis** (80 pts, 5th, Active) - Shown (80 + 100 = 180 > 100) ✓
- **Lisa Wilson** (75 pts, 6th, Active) - Shown (75 + 100 = 175 > 100) ✓
- **James Taylor** (70 pts, 7th, Inactive) - Hidden (eliminated)
- ... others with lower points or inactive

This ensures the POY board shows:
1. Who's currently leading
2. Who's in the tournament right now
3. Who has a mathematical chance to reach top 3
