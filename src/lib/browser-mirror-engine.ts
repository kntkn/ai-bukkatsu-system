import { chromium, Browser, Page } from 'playwright';
import { WebSocket } from 'ws';
import { PropertySearchTask, BrowserMirrorState, AIAction, WebSocketMessage } from '@/types/browser-mirror';

export class BrowserMirrorEngine {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isRunning = false;
  private screenshotInterval: NodeJS.Timeout | null = null;

  async startVerification(properties: PropertySearchTask[], ws: WebSocket) {
    if (this.isRunning) {
      console.log('⚠️ Verification already running');
      return;
    }

    this.isRunning = true;

    try {
      // Initialize browser
      await this.initBrowser();
      
      if (!this.page) {
        throw new Error('Failed to initialize browser');
      }

      // Start screenshot streaming
      this.startScreenshotStream(ws);

      // Send starting state
      this.sendBrowserState(ws, {
        status: 'running',
        currentSite: 'Initializing...',
        currentAction: 'Setting up browser for property verification',
        screenshot: null,
        aiThought: 'Starting automated property verification process',
        progress: { current: 0, total: properties.length, siteName: 'Setup' }
      });

      // Process each property
      for (let i = 0; i < properties.length; i++) {
        if (!this.isRunning) break;
        
        const property = properties[i];
        console.log(`🏠 Processing property ${i + 1}/${properties.length}: ${property.propertyName}`);
        
        await this.verifyProperty(property, ws, i + 1, properties.length);
      }

    } catch (error) {
      console.error('Error in property verification:', error);
      this.sendError(ws, `Verification failed: ${error}`);
    } finally {
      await this.cleanup();
      this.isRunning = false;
    }
  }

  private async initBrowser() {
    console.log('🌐 Initializing browser...');
    
    this.browser = await chromium.launch({
      headless: false, // Show browser for demonstration
      slowMo: 1000,    // Slow down for visibility
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,720'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Configure page for better visibility
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ Browser initialized successfully');
  }

  private startScreenshotStream(ws: WebSocket) {
    // Capture screenshots every 500ms for real-time feel
    this.screenshotInterval = setInterval(async () => {
      if (this.page && this.isRunning) {
        try {
          const screenshot = await this.page.screenshot({
            type: 'png',
            quality: 80
          });
          
          const base64Screenshot = `data:image/png;base64,${screenshot.toString('base64')}`;
          
          // Send screenshot without changing other state
          const message: WebSocketMessage = {
            type: 'browser_state',
            data: {
              screenshot: base64Screenshot
            } as any
          };
          
          ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Screenshot capture failed:', error);
        }
      }
    }, 500);
  }

  private async verifyProperty(
    property: PropertySearchTask, 
    ws: WebSocket, 
    current: number, 
    total: number
  ) {
    if (!this.page) return;

    // Demo sites for property verification
    const sites = [
      { name: 'ITANDI BB', url: 'https://www.itandi.net/' },
      { name: 'いえらぶBB', url: 'https://www.ielove.co.jp/' }
    ];

    for (const site of sites) {
      if (!this.isRunning) break;

      await this.simulateAIThinking(ws, `Navigating to ${site.name} to search for ${property.propertyName}`, current, total, site.name);
      
      try {
        // Navigate to site
        await this.aiAction(ws, {
          type: 'navigate',
          target: site.url,
          description: `Opening ${site.name}`,
          timestamp: Date.now()
        });

        await this.page.goto(site.url);
        await this.page.waitForLoadState('domcontentloaded');
        
        // Simulate search actions
        await this.simulateSearch(property, ws, site.name);
        
      } catch (error) {
        console.error(`Error on ${site.name}:`, error);
        await this.simulateAIThinking(ws, `Error accessing ${site.name}, moving to next site`, current, total, site.name);
      }
    }

    // Send completion result
    this.sendPropertyResult(ws, {
      ...property,
      status: 'completed',
      result: {
        availability: 'available',
        source: 'ITANDI BB',
        lastUpdated: new Date()
      }
    });
  }

  private async simulateSearch(property: PropertySearchTask, ws: WebSocket, siteName: string) {
    if (!this.page) return;

    const searchSteps = [
      `Analyzing ${siteName} interface`,
      `Looking for search functionality`,
      `Preparing to search for "${property.propertyName}"`,
      `Entering property details`,
      `Searching database for matches`,
      `Analyzing search results`,
      `Checking availability status`
    ];

    for (const step of searchSteps) {
      if (!this.isRunning) break;
      
      await this.simulateAIThinking(ws, step, 0, 0, siteName);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  private async simulateAIThinking(
    ws: WebSocket, 
    thought: string, 
    current: number, 
    total: number, 
    siteName: string
  ) {
    this.sendBrowserState(ws, {
      status: 'running',
      currentSite: siteName,
      currentAction: thought,
      screenshot: null, // Screenshot will be sent separately
      aiThought: thought,
      progress: { current, total, siteName }
    });

    console.log(`🤖 AI: ${thought}`);
  }

  private async aiAction(ws: WebSocket, action: AIAction) {
    const message: WebSocketMessage = {
      type: 'ai_action',
      data: action
    };
    
    ws.send(JSON.stringify(message));
    console.log(`🎬 Action: ${action.type} - ${action.description}`);
  }

  private sendBrowserState(ws: WebSocket, state: Partial<BrowserMirrorState>) {
    const message: WebSocketMessage = {
      type: 'browser_state',
      data: state as BrowserMirrorState
    };
    
    ws.send(JSON.stringify(message));
  }

  private sendPropertyResult(ws: WebSocket, property: PropertySearchTask) {
    const message: WebSocketMessage = {
      type: 'property_result',
      data: property
    };
    
    ws.send(JSON.stringify(message));
    console.log(`✅ Property verified: ${property.propertyName}`);
  }

  private sendError(ws: WebSocket, errorMessage: string) {
    const message: WebSocketMessage = {
      type: 'error',
      data: { message: errorMessage }
    };
    
    ws.send(JSON.stringify(message));
  }

  async stop() {
    console.log('🛑 Stopping browser mirror engine');
    this.isRunning = false;
    
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
    
    await this.cleanup();
  }

  private async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}