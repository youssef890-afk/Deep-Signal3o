const fs = require('fs');
const path = 'src/context/AuthContext.tsx';
let c = fs.readFileSync(path, 'utf-8');

// Check if already fixed
if (c.indexOf('ensureProfileExists') !== -1) {
  console.log('ALREADY-FIXED');
  process.exit(0);
}

// Add ensureProfileExists function before refreshProfile
const marker = 'const refreshProfile = useCallback';
const newFunc = `const ensureProfileExists = useCallback(async (userData) => {
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userData.id)
        .maybeSingle();

      if (existing) return;

      const email = userData.email || '';
      const meta = userData.user_metadata || {};
      const baseUsername = (meta.username || email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';

      let finalUsername = baseUsername;
      let counter = 0;
      while (true) {
        const { data: exists } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', finalUsername)
          .maybeSingle();
        if (!exists) break;
        counter++;
        finalUsername = (baseUsername.slice(0, 15) + '_' + counter);
        if (counter > 50) break;
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
  }, []);

  const refreshProfile = useCallback`;

if (c.indexOf(marker) === -1) {
  console.log('NOTFOUND-MARKER');
  process.exit(1);
}

c = c.replace(marker, newFunc);

// Call it in initializeAuth before loadProfile
c = c.replace(
  'await loadProfile(currentSession.user.id);',
  'await ensureProfileExists(currentSession.user); await loadProfile(currentSession.user.id);'
);

// Also in onAuthStateChange
c = c.replace(
  'await loadProfile(newSession.user.id);',
  'await ensureProfileExists(newSession.user); await loadProfile(newSession.user.id);'
);

fs.writeFileSync(path, c, 'utf-8');
console.log('DONE');
