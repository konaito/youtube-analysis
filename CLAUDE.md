# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Downloader is a full-stack application built with Next.js 15.5, Supabase, and Bun that allows users to download YouTube videos as MP4 or MP3 files. The application features anonymous authentication, individual video pages, and a comprehensive download history system.

## Architecture

### Frontend (Next.js App Router)
- **Framework**: Next.js 15.5 with App Router and React 19
- **Type System**: Leverages Next.js 15.5 route props type inference (`PageProps<'/path'>`, `RouteContext<'/api/path'>`)
- **Authentication**: Supabase anonymous authentication with automatic login
- **UI Flow**: URL input → video list → individual video pages → download
- **Styling**: Tailwind CSS with dark mode support

### Backend (Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS) 
- **Authentication**: Anonymous sign-ins enabled in config
- **Core Table**: `download_logs` with user isolation and status tracking

### Key Data Flow
1. User inputs YouTube URL → stored as 'pending' in `download_logs`
2. Table view shows all user videos with click navigation
3. Individual `/videos/[id]` pages provide download functionality
4. Download API updates log status and streams video data

## Common Commands

### Frontend Development
```bash
bun install          # Install dependencies
# 注意: bun run dev は勝手に実行禁止！ユーザーが明示的に要求した場合のみ実行する
bun run build        # Production build
bun run lint         # ESLint checking
```

### Database Management
```bash
supabase start              # Start local Supabase stack
supabase db reset           # Reset database (destructive)
supabase db push --local    # Apply migrations locally
supabase db lint            # Validate database schema
supabase migration new <name>  # Create new migration
```

### Environment Setup
1. Copy `frontend/.env.example` to `frontend/.env.local`
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `supabase start`
3. Optional: Add `YOUTUBE_API_KEY` for enhanced video info (currently uses ytdl-core)

## Type Safety Patterns

The codebase uses Next.js 15.5's automatic type inference:

```typescript
// Pages - automatic params typing
export default function VideoPage(props: PageProps<'/videos/[id]'>) {
  const { id } = await props.params; // id: string
}

// API Routes - automatic route context typing  
export async function GET(
  request: NextRequest,
  props: RouteContext<'/api/video/[id]'>
) {
  const { id } = await props.params; // id: string
}
```

## Database Schema

### `download_logs` Table
- User-isolated via RLS policies
- Status flow: `pending` → `in_progress` → `completed`/`failed`
- Indexed on `user_id`, `downloaded_at`, `video_id`
- Automatic `updated_at` timestamps via trigger

## API Endpoints

- `POST /api/video-info` - Fetch YouTube metadata and create pending log
- `GET /api/video/[id]` - Fetch individual video details 
- `POST /api/download` - Stream video/audio download with log updates
- `GET /api/download-history` - Fetch user's download history

## Component Architecture

- `AuthProvider` - Automatic anonymous authentication wrapper
- `DownloadHistory` - Table-based video list with navigation
- `/videos/[id]` pages - Individual video detail and download interface

## Development Notes

- Uses `@distube/ytdl-core` for YouTube video processing (no external CLI tools)
- Supabase config enables anonymous authentication (`enable_anonymous_sign_ins = true`)
- All async params must be awaited due to Next.js 15 requirements
- Border styling uses gray tones instead of black for better aesthetics
- Bun is the primary package manager and runtime