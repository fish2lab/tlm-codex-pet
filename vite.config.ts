import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  clearScreen: false,
  build: { rollupOptions: { input: resolve('capture.html') } },
  server: { host: '127.0.0.1', port: 1420, strictPort: true },
  plugins: [{
    name: 'native-atlas-capture',
    configureServer(server) {
      server.middlewares.use('/__save-atlas', (request, response) => {
        const chunks: Buffer[] = []
        request.on('data', chunk => chunks.push(Buffer.from(chunk)))
        request.on('end', () => {
          const dataUrl = Buffer.concat(chunks).toString('utf8')
          if (!dataUrl.startsWith('data:image/png;base64,')) {
            response.statusCode = 400
            response.end('Expected a PNG data URL')
            return
          }
          const outputDir = resolve('output')
          const output = resolve(outputDir, 'spritesheet.png')
          mkdirSync(outputDir, { recursive: true })
          writeFileSync(output, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'))
          response.statusCode = 200
          response.end(output)
        })
      })
    },
  }],
})
