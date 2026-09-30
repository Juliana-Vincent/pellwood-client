import 'dotenv/config';
import fs from 'fs';

const isStaging = process.env.STAGING === '1';

const content = isStaging
  ? `User-agent: *
Disallow: /
`
  : `User-agent: *
Allow: /

Sitemap: https://pellwood.com/sitemap.xml
`;

const path = './public/robots.txt';
fs.writeFileSync(path, content);
console.log(`robots.txt written (${isStaging ? 'staging: Disallow /' : 'production: Allow /'}) --> ${path}`);