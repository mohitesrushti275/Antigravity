import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ═══════════════════════════════════════════════════
// S3 CLIENT CONFIGURATION
// Supports both AWS S3 and Cloudflare R2
// ═══════════════════════════════════════════════════

const s3Config: S3ClientConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // Add endpoint for Cloudflare R2 or custom S3-compatible storage
  ...(process.env.AWS_ENDPOINT_URL && {
    endpoint: process.env.AWS_ENDPOINT_URL,
    forcePathStyle: true, // Required for R2
  }),
};

const s3 = new S3Client(s3Config);

const BUCKET = process.env.S3_BUCKET_NAME!;
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || `https://${BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

export const MIME_ALLOWLIST = [
  'text/plain',
  'text/typescript',
  'application/javascript',
  'image/png',
  'image/webp',
  'image/jpeg',
  'video/mp4',
];

export const SIZE_CAPS: Record<string, number> = {
  component: 500 * 1024,        // 500 KB
  demo:      500 * 1024,        // 500 KB
  css:        50 * 1024,        //  50 KB
  config:     50 * 1024,        //  50 KB
  image:    5 * 1024 * 1024,    //   5 MB
  video:   50 * 1024 * 1024,    //  50 MB
};

// ═══════════════════════════════════════════════════
// KEY GENERATION
// ═══════════════════════════════════════════════════

export function generateS3Key(
  userId: string,
  componentId: string,
  fileType: string,
  filename?: string
): string {
  const suffix = filename ? `/${filename}` : '';
  return `components/${userId}/${componentId}/${fileType}${suffix}`;
}

// ═══════════════════════════════════════════════════
// PRESIGNED URLS
// ═══════════════════════════════════════════════════

/**
 * Generate a presigned PUT URL for direct client upload.
 * TTL: 15 minutes. Content type and size are enforced at upload time.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  maxSizeBytes: number
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: maxSizeBytes,
  });

  return getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min
}

/**
 * Generate a presigned GET URL for temporary file access.
 */
export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}

/**
 * Get the public CDN URL for a file (if CloudFront is configured).
 */
export function getCdnUrl(key: string): string {
  return `${CDN_URL}/${key}`;
}

// ═══════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════

/**
 * Check if a file exists in S3 (HEAD request).
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a file from S3.
 */
export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * Delete multiple files from S3.
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  await Promise.all(keys.map(deleteFile));
}

/**
 * Get file content as text from S3.
 */
export async function getFileContent(key: string): Promise<string> {
  const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return response.Body?.transformToString('utf-8') ?? '';
}

// ═══════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════

export function isAllowedMime(contentType: string): boolean {
  return MIME_ALLOWLIST.includes(contentType);
}

export function isWithinSizeCap(fileType: string, sizeBytes: number): boolean {
  const cap = SIZE_CAPS[fileType];
  return cap ? sizeBytes <= cap : false;
}
