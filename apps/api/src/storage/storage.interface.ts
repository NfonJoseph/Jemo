/**
 * Storage Service Interface
 * Abstraction for object storage (local filesystem or cloud)
 */
export interface PutObjectParams {
  key: string;
  buffer: Buffer;
  contentType: string;
}

export interface StorageService {
  /**
   * Upload an object to storage
   */
  putObject(params: PutObjectParams): Promise<void>;

  /**
   * Delete an object from storage
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Get a signed URL for temporary access to an object
   * @param key - Object key
   * @param expiresInSeconds - URL expiration time (default 15 minutes)
   */
  getSignedGetUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
