const fs = require('fs');
let c = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf-8');

const oldEnd = `      </div>

    </div>
  );
}`;

const newEnd = `      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

    </div>
  );
}`;

if (c.indexOf(oldEnd) === -1) {
  console.log('NOTFOUND');
  process.exit(1);
}

c = c.replace(oldEnd, newEnd);
fs.writeFileSync('src/pages/ProfilePage.tsx', c, 'utf-8');
console.log('DONE');
