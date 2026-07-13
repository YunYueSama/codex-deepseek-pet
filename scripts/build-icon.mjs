import fs from 'node:fs/promises';
import pngToIco from 'png-to-ico';

const source = new URL('../build/icon.png', import.meta.url);
const destination = new URL('../build/icon.ico', import.meta.url);
const icon = await pngToIco(source.pathname.replace(/^\/(?:[A-Za-z]:)/, (match) => match.slice(1)));

await fs.writeFile(destination, icon);
console.log('Created build/icon.ico');
