import { createClient } from 'npm:@supabase/supabase-js@2';
import { AccessToken } from 'npm:livekit-server-sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const liveKitApiKey = Deno.env.get('LIVEKIT_API_KEY');
  const liveKitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');

  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey || !liveKitApiKey || !liveKitApiSecret) {
    return jsonResponse({ error: 'Voice service is not configured' }, 503);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return jsonResponse({ error: 'Authentication required' }, 401);

  let requestedRoom: unknown;
  try {
    ({ roomName: requestedRoom } = await request.json());
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  if (typeof requestedRoom !== 'string') return jsonResponse({ error: 'Invalid room name' }, 400);
  const roomMatch = /^([A-Z0-9]{6})-(all|team-(alpha|beta))$/.exec(requestedRoom);
  if (!roomMatch) return jsonResponse({ error: 'Invalid room name' }, 400);

  const [, roomCode, , requestedTeam] = roomMatch;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const [{ data: room, error: roomError }, { data: membership, error: memberError }] = await Promise.all([
    admin.from('voice_card_clash_rooms').select('is_active').eq('room_code', roomCode).maybeSingle(),
    admin.from('voice_card_clash_players').select('seat').eq('room_code', roomCode).eq('user_id', authData.user.id).maybeSingle(),
  ]);

  if (roomError || memberError) return jsonResponse({ error: 'Unable to verify room access' }, 500);
  if (!room?.is_active || !membership) return jsonResponse({ error: 'Room membership required' }, 403);

  const assignedTeam = membership.seat < 4 ? 'alpha' : 'beta';
  if (requestedTeam && requestedTeam !== assignedTeam) return jsonResponse({ error: 'Team voice access denied' }, 403);

  const token = new AccessToken(liveKitApiKey, liveKitApiSecret, {
    identity: authData.user.id,
    name: String(authData.user.user_metadata?.username ?? 'Player').slice(0, 40),
    ttl: '30m',
  });
  token.addGrant({
    roomJoin: true,
    room: requestedRoom,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
  });

  return jsonResponse({ token: await token.toJwt() });
});