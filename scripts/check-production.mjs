import { readdir, readFile } from 'node:fs/promises';
async function scan(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${item.name}`;
    if (item.isDirectory()) await scan(path);
    else if (/\.(js|html)$/.test(path)) {
      const content = await readFile(path, 'utf8');
      if (['__CAT_JUMP_TEST__', '1664525', '1013904223', 'predicted-clearance', 'jumpStartDistance'].some(marker => content.includes(marker))) {
        throw new Error(`Test API or fixed-seed generator leaked into production: ${path}`);
      }
    }
  }
}
await scan('dist');
console.log('Production output contains no test API.');
