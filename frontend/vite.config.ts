import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
