import { readdir, readFile } from 'node:fs/promises';
async function scan(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${item.name}`;
    if (item.isDirectory()) await scan(path);
    else if (/\.(js|html)$/.test(path) && (await readFile(path, 'utf8')).includes('__CAT_JUMP_TEST__')) {
      throw new Error(`Test API leaked into production: ${path}`);
    }
  }
}
await scan('dist');
console.log('Production output contains no test API.');
