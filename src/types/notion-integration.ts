export interface NotionPropertyResult {
  id: string;
  propertyName: string;
  roomNumber: string;
  address: string;
  managementCompany: string;
  verificationResults: VerificationSiteResult[];
  finalStatus: 'available' | 'occupied' | 'unknown' | 'needs_call';
  lastVerified: Date;
  notes?: string;
}

export interface VerificationSiteResult {
  siteName: string;
  url?: string;
  status: 'available' | 'occupied' | 'unknown' | 'error';
  lastUpdated?: Date;
  notes?: string;
}

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

export interface NotionUploadResult {
  success: boolean;
  pageId?: string;
  url?: string;
  error?: string;
}