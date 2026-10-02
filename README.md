# Deep-Signal3

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-xuokmvte)

## Advanced features setup

### Supabase migrations

Link the Supabase CLI to the project, then apply the SQL migrations. These add profile views, audio posts/covers, weekly game scores, and private voice-note storage:

```powershell
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### AI assistant and generated profile images

The browser calls the `ai-assistant` Edge Function. Keep the provider key in Supabase secrets, never in `VITE_*` variables:

```powershell
npx supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY
npx supabase functions deploy ai-assistant
```

AI proof-reading, tone changes, hashtags, caption summaries, and avatar/cover images require a deployed function and a valid provider key. Video summaries use the video's caption; the function does not inspect or transcribe video bytes.

### Offline behavior

The service worker caches the app shell and public media, while the feed snapshot is stored per authenticated user in local storage. Auth endpoints, database APIs, private voice notes, and messages are never cached by the service worker. A feed needs to have loaded once while online before it can be browsed offline.

### Games and live rooms

Game scores are stored in `game_scores` and the weekly board includes followed accounts. Online tic-tac-toe uses Supabase Realtime Broadcast. Live rooms use browser WebRTC peer-to-peer audio with a public STUN server; some NAT/firewall combinations require a TURN service for reliable production connectivity. Microphone access requires HTTPS or localhost and the user's permission.
