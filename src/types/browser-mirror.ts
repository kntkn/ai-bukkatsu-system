export interface BrowserMirrorState {
  status: 'idle' | 'connecting' | 'running' | 'error';
  currentSite: string;
  currentAction: string;
  screenshot: string | null;
  aiThought: string;
  progress: {
    current: number;
    total: number;
    siteName: string;
  };
}

export interface AIAction {
  type: 'navigate' | 'click' | 'type' | 'search' | 'analyze' | 'wait';
  target: string;
  value?: string;
  description: string;
  timestamp: number;
}

export interface PropertySearchTask {
  id: string;
  propertyName: string;
  roomNumber: string;
  address: string;
  managementCompany: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  result?: {
    availability: 'available' | 'occupied' | 'unknown';
    source: string;
    lastUpdated: Date;
  };
}

export interface WebSocketMessage {
  type: 'browser_state' | 'ai_action' | 'property_result' | 'error';
  data: BrowserMirrorState | AIAction | PropertySearchTask | { message: string };
}