import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'chidra-api-middleware',
      async configureServer(server) {
        const { initDatabase } = await import('./server/db.js')
        const { handleApiRequest } = await import('./server/router.js')
        initDatabase()
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
