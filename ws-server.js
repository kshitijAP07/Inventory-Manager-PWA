/**
 * ws-server.js — WebSocket relay server for PWA ↔ Twin Viewer integration
 * Run with: node ws-server.js
 * Listens on ws://localhost:8080
 */

const { WebSocketServer } = require('ws');

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`\n WebSocket server running on ws://localhost:${PORT}\n`);

wss.on('connection', (ws, req) => {
  const clientId = Date.now();
  console.log(`[+] Client connected  (id: ${clientId})`);

  ws.on('message', (raw) => {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn(`[!] Received non-JSON message from ${clientId}:`, raw.toString());
      return;
    }

    console.log(`[→] Message from ${clientId}:`, JSON.stringify(parsed, null, 2));

    // Broadcast to ALL other connected clients
    let broadcast = 0;
    wss.clients.forEach((client) => {
      const { OPEN } = require('ws').WebSocket;
      if (client !== ws && client.readyState === OPEN) {
        client.send(raw.toString());
        broadcast++;
      }
    });

    console.log(`[✓] Broadcast to ${broadcast} other client(s)\n`);
  });

  ws.on('close', () => {
    console.log(`[-] Client disconnected (id: ${clientId})`);
  });

  ws.on('error', (err) => {
    console.error(`[!] Client error (id: ${clientId}):`, err.message);
  });
});

wss.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} already in use. Kill the other process and retry.\n`);
  } else {
    console.error('WebSocket server error:', err);
  }
  process.exit(1);
});
