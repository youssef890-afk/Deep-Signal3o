# Voice Card Clash voice setup

1. Apply the Supabase migrations, including `20261002160000_voice_card_clash_rooms.sql`.
2. Add the LiveKit credentials as Supabase Edge Function secrets. Never add the API secret to a `VITE_` variable.

   ```sh
   supabase secrets set LIVEKIT_API_KEY=your-key LIVEKIT_API_SECRET=your-secret
   ```

3. Deploy the token function:

   ```sh
   supabase functions deploy livekit-token
   ```

4. Set the LiveKit WebSocket URL in the app environment, then restart Vite:

   ```env
   VITE_LIVEKIT_URL=wss://your-livekit-host
   ```

The function uses Supabase's `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` Edge Function environment values. It validates room membership and the assigned team before issuing a short-lived token.