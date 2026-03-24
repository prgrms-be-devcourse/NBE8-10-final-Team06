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
      // 백엔드의 모든 API는 /api로 시작합니다.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // rewrite 옵션이 필요 없는지 확인하십시오. 
        // 백엔드 컨트롤러가 /api로 시작하므로 필요 없습니다.
      },
    },
  },
})
