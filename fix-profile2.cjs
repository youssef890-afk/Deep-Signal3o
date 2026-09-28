const fs = require('fs');
const path = 'src/pages/ProfilePage.tsx';
let p = fs.readFileSync(path, 'utf-8');

const marker = 'useEffect(() => {\n    void loadProfileData();\n  }, [loadProfileData]);';

if (p.indexOf('_tProfile') !== -1) {
  console.log('ALREADY-FIXED');
  process.exit(0);
}

if (p.indexOf(marker) === -1) {
  console.log('NOTFOUND');
  process.exit(1);
}

const replacement = `useEffect(() => {
    const _tProfile = setTimeout(() => { setLoading(false); }, 3000);
    void loadProfileData().finally(() => clearTimeout(_tProfile));
  }, [loadProfileData]);`;

p = p.replace(marker, replacement);
fs.writeFileSync(path, p, 'utf-8');
console.log('DONE');
