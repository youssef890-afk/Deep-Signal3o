const fs = require('fs');
const path = 'src/context/AuthContext.tsx';
let c = fs.readFileSync(path, 'utf-8');

if (c.indexOf('ensureProfileExists') !== -1) {
  console.log('ALREADY-FIXED');
  process.exit(0);
}

// 1. Add ensureProfileExists function BEFORE loadProfile
const marker = '  const loadProfile = async (userId: string) => {';
if (c.indexOf(marker) === -1) {
  console.log('NOTFOUND-1');
  process.exit(1);
}

const newFunc = `  const ensureProfileExists = async (userData: any) => {
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userData.id)
        .maybeSingle();

      if (existing) return;

      const email = userData.email || '';
      const meta = userData.user_metadata || {};
      const raw = (meta.username || email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';

      let finalUsername = raw;
      let counter = 0;
      while (counter < 50) {
        const { data: exists } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', finalUsername)
          .maybeSingle();
        if (!exists) break;
        counter++;
        finalUsername = raw.slice(0, 15) + '_' + counter;
      }

      await supabase.from('profiles').insert({
        id: userData.id,
        username: finalUsername,
        full_name: meta.full_name || meta.name || '',
        avatar_url: meta.avatar_url || meta.picture || null,
      });

      console.log('AUTO-CREATED PROFILE:', finalUsername);
    } catch (e) {
      console.error('ensureProfileExists error:', e);
    }
  };

  const loadProfile = async (userId: string) => {`;

c = c.replace(marker, newFunc);

// 2. Replace in initializeAuth
const call1 = `        if (session?.user) {
          await loadProfile(session.user.id);
        }`;
const call1new = `        if (session?.user) {
          await ensureProfileExists(session.user);
          await loadProfile(session.user.id);
        }`;
c = c.replace(call1, call1new);

// 3. Replace in onAuthStateChange
const call2 = `      if (session?.user) {
        await loadProfile(session.user.id);
      } else {`;
const call2new = `      if (session?.user) {
        await ensureProfileExists(session.user);
        await loadProfile(session.user.id);
      } else {`;
c = c.replace(call2, call2new);

fs.writeFileSync(path, c, 'utf-8');
console.log('DONE');
