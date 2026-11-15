import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { initDatabase } from './server/db.js'
import { handleApiRequest } from './server/router.js'

// Initialisation de la base SQLite
initDatabase()

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'chidra-api-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api')) {
            handleApiRequest(req, res)
          } else {
            next()
          }
        })
      }
    }
  ],
})
