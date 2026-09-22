import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { setupWebSocketServer } from './server/socketHandler';

function phase10SocketPlugin(): Plugin {
  return {
    name: 'phase10-socket-plugin',
    configureServer(server) {
      if (server.httpServer) {
        setupWebSocketServer(server.httpServer);
        console.log('⚡ Phase 10 WebSocket Server attached to Vite at /ws');
      }
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), phase10SocketPlugin()],
  server: {
    host: '0.0.0.0',
    port: 4000,
    strictPort: true
  }
});
