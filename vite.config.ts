import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Cópia automática da Logo oficial AJPSTORE enviada pelo usuário
const logoSource = 'C:/Users/USER/.gemini/antigravity/brain/2062ca2e-76ac-448d-81a6-b5bfa0439549/.user_uploaded/media_1789490067120.png';
const publicDir = path.resolve(__dirname, 'public');
const targetLogoPng = path.join(publicDir, 'ajpstore-logo.png');
const targetLogoAlt = path.join(publicDir, 'logo.png');

try {
  if (fs.existsSync(logoSource)) {
    fs.copyFileSync(logoSource, targetLogoPng);
    fs.copyFileSync(logoSource, targetLogoAlt);
    console.log('[Vite] ✅ Logo AJPSTORE copiada com sucesso para public/ajpstore-logo.png e public/logo.png');
  }
} catch (e) {
  console.warn('[Vite] Aviso ao copiar logo:', e);
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // expõe em localhost e na rede local
    port: 5173,
  },
});

