import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        watch: {
            ignored: ['**/public/models/**'],
        },
    },
    optimizeDeps: {
        include: ['@tensorflow/tfjs', '@tensorflow/tfjs-tflite'],
    },
    build: {
        target: 'esnext',
    }
})
