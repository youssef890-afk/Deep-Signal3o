const fs = require('fs');

// ============ ProfilePage ============
let p = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf-8');

// Find the loadProfile useEffect and add timeout
const profileMarker = 'loadProfile();';
const profileReplacement = `const _t = setTimeout(() => { setLoading(false); }, 3000);
    loadProfile().finally(() => clearTimeout(_t));`;

if (p.indexOf('_t_profile') === -1 && p.indexOf(profileMarker) !== -1) {
  p = p.replace(profileMarker, profileReplacement);
  fs.writeFileSync('src/pages/ProfilePage.tsx', p, 'utf-8');
  console.log('PROFILE-DONE');
} else {
  console.log('PROFILE-SKIP');
}

// ============ ChatPage ============
let c = fs.readFileSync('src/pages/ChatPage.tsx', 'utf-8');

const chatMarker = 'loadMessages();';
const chatReplacement = `const _tc = setTimeout(() => { setLoading(false); }, 3000);
    loadMessages().finally(() => clearTimeout(_tc));`;

if (c.indexOf('_tc') === -1 && c.indexOf(chatMarker) !== -1) {
  c = c.replace(chatMarker, chatReplacement);
  fs.writeFileSync('src/pages/ChatPage.tsx', c, 'utf-8');
  console.log('CHAT-DONE');
} else {
  console.log('CHAT-SKIP');
}
