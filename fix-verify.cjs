const fs = require('fs');
let c = fs.readFileSync('/data/data/com.termux/files/home/deep-signal-git/src/context/AuthContext.tsx', 'utf-8');

const start = c.indexOf('const verifyRecoveryOtp = async');
if (start === -1) { console.log('NO-START'); process.exit(1); }

const end = c.indexOf('const resendVerificationCode = async', start);
if (end === -1) { console.log('NO-END'); process.exit(1); }

const cleanFunc = `const verifyRecoveryOtp = async (email, token) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanToken = token.trim();

      if (cleanToken.length !== 6) {
        return { error: new Error('رمز التحقق خاصو يكون 6 أرقام') };
      }

      const result = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'recovery',
      });

      if (result.error) {
        return { error: new Error(result.error.message) };
      }

      if (result.data.session === null) {
        return { error: new Error('ما قدرناش نفتح Session') };
      }

      return { error: null };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطأ غير متوقع';
      return { error: new Error(msg) };
    }
  };

  `;

c = c.slice(0, start) + cleanFunc + c.slice(end);
fs.writeFileSync('/data/data/com.termux/files/home/deep-signal-git/src/context/AuthContext.tsx', c, 'utf-8');
console.log('DONE');
