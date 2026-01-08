export interface PropertyInfo {
  propertyName: string;
  roomNumber: string;
  address: string;
  managementCompany: string;
  floorPlan?: string;
  rent?: string;
  deposit?: string;
  keyMoney?: string;
  notes?: string;
}

export interface PdfAnalysisResult {
  success: boolean;
  properties: PropertyInfo[];
  totalPages: number;
  processedPages: number;
  errors?: string[];
}

export interface PdfUploadResponse {
  success: boolean;
  fileId: string;
  originalName: string;
  message: string;
}

export interface AnalysisProgress {
  stage: 'uploading' | 'parsing' | 'analyzing' | 'extracting' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  currentPage?: number;
  totalPages?: number;
}