const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf-8');

const marker = 'if (!session) {';
const replacement = `// Recovery mode: force reset password page
  if (sessionStorage.getItem('password_recovery') === '1') {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/reset-password" replace />} />
      </Routes>
    );
  }

  if (!session) {`;

if (c.indexOf(marker) === -1) {
  console.log('NOTFOUND');
  process.exit(1);
}

c = c.replace(marker, replacement);
fs.writeFileSync('src/App.tsx', c, 'utf-8');
console.log('DONE');
