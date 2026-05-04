/**
 * twin-bridge.js — Plain JS WebSocket sender for the Inventory Manager PWA
 *
 * Loaded as a regular <script> tag (no ES modules) in scan-location.html.
 * Sends a PRODUCT_ADDED event to the Digital Twin Viewer via the WS relay server.
 *
 * Usage:
 *   sendToTwin({ itemId, itemName, locationCode, rack, shelf, position })
 *
 * Graceful degradation: if the server is not running, the PWA continues normally.
 */

(function () {
  const WS_URL = 'ws://localhost:8080';
  const SEND_TIMEOUT_MS = 2000; // max wait before giving up

  /**
   * Sends a PRODUCT_ADDED message to the twin viewer relay.
   * Returns a Promise that resolves once the message is sent
   * (or after a timeout / error so the PWA is never blocked).
   *
   * @param {{ itemId: string, itemName: string, locationCode: string,
   *           rack: number, shelf: number, position: number }} payload
   * @returns {Promise<void>}
   */
  window.sendToTwin = function sendToTwin(payload) {
    return new Promise(function (resolve) {
      let settled = false;
      function done() {
        if (settled) return;
        settled = true;
        resolve();
      }

      // Safety-net timeout so the PWA never hangs
      const timer = setTimeout(function () {
        console.warn('[TwinBridge] ⏱ Timed out waiting for WS. Continuing…');
        done();
      }, SEND_TIMEOUT_MS);

      let ws;
      try {
        ws = new WebSocket(WS_URL);
      } catch (err) {
        console.warn('[TwinBridge] WebSocket not supported or blocked:', err);
        clearTimeout(timer);
        done();
        return;
      }

      ws.onopen = function () {
        const msg = JSON.stringify({
          type: 'PRODUCT_ADDED',
          payload: {
            itemId:       payload.itemId       || 'unknown',
            itemName:     payload.itemName     || 'Unknown Item',
            locationCode: payload.locationCode || '',
            rack:         Number(payload.rack),
            shelf:        Number(payload.shelf),
            position:     Number(payload.position),
          },
        });

        ws.send(msg);
        console.log('[TwinBridge] ✅ Sent PRODUCT_ADDED →', payload.locationCode);
        ws.close();
        clearTimeout(timer);
        done();
      };

      ws.onerror = function () {
        console.warn('[TwinBridge] ⚠️ Twin server not reachable. Twin visualization skipped.');
        clearTimeout(timer);
        done();
      };

      ws.onclose = function () {
        clearTimeout(timer);
        done();
      };
    });
  };
})();
