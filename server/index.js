import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDatabase } from './db.js'
import { handleApiRequest } from './router.js'

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
}

initDatabase()

http.createServer((req, res) => {
  if (req.url.startsWith('/api')) return handleApiRequest(req, res)
  const urlPath = decodeURIComponent(req.url.split('?')[0])
  let file = path.join(dist, urlPath)
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(dist, 'index.html')
  }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
  fs.createReadStream(file).pipe(res)
}).listen(process.env.PORT || 10000, '0.0.0.0')
