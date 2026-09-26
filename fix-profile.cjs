const fs = require('fs');
let c = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf-8');

const oldPart = 'onClick={() => void handleLogout()}\n            disabled={loggingOut}';
const newPart = 'onClick={() => setSettingsOpen(true)}';

if (c.indexOf(oldPart) === -1) {
  console.log('NOTFOUND-1');
  process.exit(1);
}
c = c.replace(oldPart, newPart);

const oldClass = /className="\s*flex\s*items-center\s*gap-2\s*px-4\s*py-2\s*rounded-xl\s*bg-red-500\/10\s*border\s*border-red-500\/30\s*text-red-400\s*hover:bg-red-500\/20\s*transition-colors\s*disabled:opacity-50\s*"/;
if (!oldClass.test(c)) {
  console.log('NOTFOUND-2');
  process.exit(1);
}
c = c.replace(oldClass, 'className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"');

const oldIcon = '{loggingOut ? (\n              <Loader2\n                className="w-4 h-4 animate-spin"\n              />\n            ) : (\n              <LogOut\n                className="w-4 h-4"\n              />\n            )}';
if (c.indexOf(oldIcon) === -1) {
  console.log('NOTFOUND-3');
  process.exit(1);
}
c = c.replace(oldIcon, '<Settings className="w-4 h-4" />');

const oldText = "{loggingOut\n                ? 'جاري الخروج...'\n                : 'تسجيل الخروج'}";
if (c.indexOf(oldText) === -1) {
  console.log('NOTFOUND-4');
  process.exit(1);
}
c = c.replace(oldText, "الإعدادات");

fs.writeFileSync('src/pages/ProfilePage.tsx', c, 'utf-8');
console.log('DONE');
