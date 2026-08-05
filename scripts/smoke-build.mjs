import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const html = await readFile(resolve(root, 'dist/index.html'), 'utf8')
if (!html.includes('<div id="root"></div>')) throw new Error('Built homepage is missing the React root.')
const assetUrls = [...html.matchAll(/(?:src|href)="([^"#]+)"/gu)].map((match) => match[1]).filter((url) => url.includes('assets/'))
if (assetUrls.length < 2) throw new Error('Built homepage does not reference the expected script and style assets.')
for (const url of assetUrls) {
  if (url.startsWith('/')) throw new Error(`Asset URL must remain relative for GitHub Pages: ${url}`)
  await access(resolve(root, 'dist', url.replace(/^\.\//u, '')))
}
console.log(`Smoke check passed: homepage root and ${assetUrls.length} relative assets are available.`)
