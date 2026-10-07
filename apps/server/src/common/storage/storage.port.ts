export interface StorageUploadRequest {
  userId: string;
  purpose: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface StoragePort {
  createUploadUrl(request: StorageUploadRequest): Promise<string>;
  createDownloadUrl(storageKey: string): Promise<string>;
  deleteObject(storageKey: string): Promise<void>;
}