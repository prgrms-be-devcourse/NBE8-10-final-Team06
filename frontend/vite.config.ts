import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'node:fs'

/** 디버그 세션 a7f850 — 브라우저가 POST 하면 리포 루트 `debug-a7f850.log`에 NDJSON append (ingest 미기동 시 증거용) */
function debugA7f850FilePlugin(): Plugin {
  const logFile = path.resolve(__dirname, '..', 'debug-a7f850.log')
  return {
    name: 'debug-a7f850-file',
    configureServer(server) {
      server.middlewares.use('/__debug/a7f850', (req, res, next) => {
        if (req.method !== 'POST') return next()
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8').trim()
            if (raw) fs.appendFileSync(logFile, `${raw}\n`, 'utf8')
          } catch {
            /* ignore */
          }
          res.statusCode = 204
          res.end()
        })
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  /** 디버그 미들웨어를 먼저 등록해 다른 플러그인보다 앞에서 `/__debug/*` 를 처리 */
  plugins: [debugA7f850FilePlugin(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'window',
  },
  server: {
    port: 3000,
    proxy: {
      // 1. 일반 API 요청 프록시
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // 1-1. 업로드 정적 파일 프록시
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // 1-2. 스토리지 정적 리소스 프록시 (WebMvcConfig)
      '/temp/media': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // 2. WebSocket/SockJS 프록시 추가
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
