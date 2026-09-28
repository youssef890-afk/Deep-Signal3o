const fs = require('fs');
const path = 'src/context/AuthContext.tsx';
let c = fs.readFileSync(path, 'utf-8');

// 1. Add safety timeout in initializeAuth
const oldCall = 'void initializeAuth();';
const newCall = `const _safety = setTimeout(() => { if (mounted) setLoading(false); }, 2000);
    void initializeAuth().finally(() => clearTimeout(_safety));`;

if (c.indexOf('_safety') !== -1) {
  console.log('ALREADY-FIXED');
  process.exit(0);
}

if (c.indexOf(oldCall) === -1) {
  console.log('NOTFOUND-1');
  process.exit(1);
}
c = c.replace(oldCall, newCall);

fs.writeFileSync(path, c, 'utf-8');
console.log('DONE');
