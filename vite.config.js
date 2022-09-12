import { resolve } from 'path'
import { defineConfig } from 'vite'


const root = resolve(__dirname, 'src')
const outDir= resolve(__dirname, 'dist')

export default defineConfig({
  root,
  base: '/DSteganoM/',
  build: {
    outDir,
    emptyOutDir:true,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        page1: resolve(root, 'oursCMUGatedCover', 'index.html'),
        page2: resolve(root, 'oursCMUGatedSecret', 'index.html'),
        page3: resolve(root, 'oursCMUGatedCorrupted', 'index.html'),
        page4: resolve(root, 'skipCMUGatedCover', 'index.html'),
        page5: resolve(root, 'skipCMUGatedSecret', 'index.html'),
        page6: resolve(root, 'skipCMUGatedCorrupted', 'index.html'),
        page7: resolve(root, 'oursMTMGatedCover', 'index.html'),
        page8: resolve(root, 'oursMTMGatedSecret', 'index.html'),
        page9: resolve(root, 'oursMTMGatedCorrupted', 'index.html'),
        page10: resolve(root, 'skipMTMGatedCover', 'index.html'),
        page11: resolve(root, 'skipMTMGatedSecret', 'index.html'),
        page12: resolve(root, 'skipMTMGatedCorrupted', 'index.html'),
      }
    }
  }
})