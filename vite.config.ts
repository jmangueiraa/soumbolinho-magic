import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Cópia automática da Logo oficial AJPSTORE enviada pelo usuário
const logoCandidates = [
  'C:/Users/USER/.gemini/antigravity/brain/2062ca2e-76ac-448d-81a6-b5bfa0439549/.user_uploaded/media_1789524857321.png',
  'C:/Users/USER/.gemini/antigravity/brain/2062ca2e-76ac-448d-81a6-b5bfa0439549/.user_uploaded/media_1789505400996.png'
];
const logoSource = logoCandidates.find(p => fs.existsSync(p));
const publicDir = path.resolve(__dirname, 'public');
const targetLogoPng = path.join(publicDir, 'ajpstore-logo.png');
const targetLogoAlt = path.join(publicDir, 'logo.png');
const targetLogoJpg = path.join(publicDir, 'logo.jpg');
const targetDefaultLogo = path.join(publicDir, 'default-logo.png');

try {
  if (logoSource && fs.existsSync(logoSource)) {
    fs.copyFileSync(logoSource, targetLogoPng);
    fs.copyFileSync(logoSource, targetLogoAlt);
    fs.copyFileSync(logoSource, targetLogoJpg);
    fs.copyFileSync(logoSource, targetDefaultLogo);
    const base64Data = fs.readFileSync(logoSource).toString('base64');
    const officialLogoTs = path.resolve(__dirname, 'src/assets/officialLogo.ts');
    fs.writeFileSync(officialLogoTs, `export const AJP_OFFICIAL_LOGO_BASE64 = 'data:image/png;base64,${base64Data}';\n`);
    console.log('[Vite] ✅ Logo oficial AJPSTORE copiada para public e src/assets/officialLogo.ts');
  }
} catch (e) {
  console.warn('[Vite] Aviso ao copiar logo:', e);
}

// Cópia automática da Imagem Padrão dos 4 Produtos ("Seu Produto Aqui")
const productBagSource = 'C:/Users/USER/.gemini/antigravity/brain/2062ca2e-76ac-448d-81a6-b5bfa0439549/default_product_bag_1789525081970.jpg';
const targetProductPng = path.join(publicDir, 'default-product.png');
const targetProductJpg = path.join(publicDir, 'default-product.jpg');

try {
  if (fs.existsSync(productBagSource)) {
    fs.copyFileSync(productBagSource, targetProductPng);
    fs.copyFileSync(productBagSource, targetProductJpg);
    console.log('[Vite] ✅ Imagem padrão do produto copiada com sucesso para public/default-product.png e public/default-product.jpg');
  }
} catch (e) {
  console.warn('[Vite] Aviso ao copiar imagem padrão do produto:', e);
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // expõe em localhost e na rede local
    port: 5173,
  },
});

