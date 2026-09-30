const fs = require('fs');
const path = 'src/pages/FeedPage.tsx';
let c = fs.readFileSync(path, 'utf-8');

// Find the useEffect calling loadFeed
const marker = `    void loadFeed();
  }, [user]);`;

if (c.indexOf('_safetyFeed') !== -1) {
  console.log('ALREADY-FIXED');
  process.exit(0);
}

if (c.indexOf(marker) === -1) {
  console.log('NOTFOUND');
  process.exit(1);
}

const replacement = `    const _safetyFeed = setTimeout(() => {
      console.log('FEED TIMEOUT - forcing loading=false');
      setLoading(false);
    }, 3000);
    void loadFeed().finally(() => clearTimeout(_safetyFeed)).catch((e) => {
      console.error('loadFeed crashed:', e);
      setLoading(false);
    });
  }, [user]);`;

c = c.replace(marker, replacement);
fs.writeFileSync(path, c, 'utf-8');
console.log('DONE');
