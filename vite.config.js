import { resolve } from 'path'
import { defineConfig } from 'vite'


const root = resolve(__dirname, 'src')
const outDir= resolve(__dirname, 'dist')

export default defineConfig({
  root,
  base: '/Stegano_M_Vis/',
  build: {
    outDir,
    emptyOutDir:true,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        nested: resolve(root, 'page_one', 'index.html')
      }
    }
  }
})