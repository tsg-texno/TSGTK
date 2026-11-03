import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';
export default defineConfig({plugins:[react(),VitePWA({registerType:'prompt',injectRegister:'auto',includeAssets:['icon.svg','icon-192.png','icon-512.png','tsg-config.json','local-maps/index.json'],manifest:{name:'TSG Operations Planner',short_name:'TSG Planner',lang:'ru',start_url:'.',display:'standalone',theme_color:'#10191c',background_color:'#10191c',icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png'},{src:'icon-512.png',sizes:'512x512',type:'image/png'},{src:'icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]},workbox:{globPatterns:['**/*.{js,css,html,svg,woff2}'],maximumFileSizeToCacheInBytes:4000000}})]});
