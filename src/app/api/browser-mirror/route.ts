import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import { BrowserMirrorEngine } from '@/lib/browser-mirror-engine';
import { WebSocketMessage } from '@/types/browser-mirror';

// Global WebSocket server instance
let wss: WebSocketServer | null = null;
let browserEngine: BrowserMirrorEngine | null = null;

export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket', { status: 400 });
  }

  // Initialize WebSocket server if not exists
  if (!wss) {
    wss = new WebSocketServer({ port: 8080 });
    browserEngine = new BrowserMirrorEngine();

    wss.on('connection', async (ws) => {
      console.log('🔗 Client connected to browser mirror');

      // Send initial state
      const initialState: WebSocketMessage = {
        type: 'browser_state',
        data: {
          status: 'idle',
          currentSite: '',
          currentAction: 'Waiting for tasks...',
          screenshot: null,
          aiThought: 'Ready to start property verification',
          progress: { current: 0, total: 0, siteName: '' }
        }
      };
      ws.send(JSON.stringify(initialState));

      // Handle incoming messages
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'start_verification' && browserEngine) {
            console.log('🏠 Starting property verification for:', data.properties);
            await browserEngine.startVerification(data.properties, ws);
          }

          if (data.type === 'stop_verification' && browserEngine) {
            console.log('⏹️ Stopping property verification');
            await browserEngine.stop();
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Failed to process message' }
          }));
        }
      });

      ws.on('close', () => {
        console.log('🔌 Client disconnected from browser mirror');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  return new Response('WebSocket server running on port 8080', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  });
}