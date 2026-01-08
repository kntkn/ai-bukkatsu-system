export interface SiteCredential {
  siteName: string;
  url: string;
  username: string;
  password: string;
  notes?: string;
}

export interface CredentialsData {
  sites: SiteCredential[];
  lastUpdated: Date;
}

export interface CredentialsManagerConfig {
  filePath: string;
  fileType: 'excel' | 'csv' | 'auto';
}