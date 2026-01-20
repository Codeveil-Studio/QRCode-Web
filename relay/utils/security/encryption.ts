/**
 * Client-Side Password Encryption Utilities
 *
 * This module provides secure password encryption for transmission
 * using the Web Crypto API with AES-GCM encryption.
 */

// Generate a random encryption key
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// Export key to raw format for transmission
export async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return await crypto.subtle.exportKey("raw", key);
}

// Import key from raw format
export async function importKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt password with AES-GCM
export async function encryptPassword(
  password: string,
  key: CryptoKey
): Promise<{
  encryptedData: ArrayBuffer;
  iv: ArrayBuffer;
}> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // Generate a random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );

  return {
    encryptedData,
    iv: iv.buffer,
  };
}

// Decrypt password with AES-GCM
export async function decryptPassword(
  encryptedData: ArrayBuffer,
  iv: ArrayBuffer,
  key: CryptoKey
): Promise<string> {
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

// Convert ArrayBuffer to Base64 for transmission
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate a secure random salt
export function generateSalt(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return arrayBufferToBase64(array.buffer);
}

// Hash password with PBKDF2 for additional security
export async function hashPassword(
  password: string,
  salt: string,
  iterations: number = 100000
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const saltBuffer = base64ToArrayBuffer(salt);

  const key = await crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: iterations,
      hash: "SHA-256",
    },
    key,
    256
  );

  return arrayBufferToBase64(derivedBits);
}

// Secure password transmission payload
export interface SecurePasswordPayload {
  encryptedPassword: string;
  iv: string;
  keyFingerprint: string;
  timestamp: number;
}

// Create secure password payload for transmission
export async function createSecurePasswordPayload(
  password: string
): Promise<SecurePasswordPayload> {
  // Generate a new key for each transmission
  const key = await generateEncryptionKey();

  // Encrypt the password
  const { encryptedData, iv } = await encryptPassword(password, key);

  // Create key fingerprint for verification
  const keyData = await exportKey(key);
  const keyHash = await crypto.subtle.digest("SHA-256", keyData);
  const keyFingerprint = arrayBufferToBase64(keyHash);

  return {
    encryptedPassword: arrayBufferToBase64(encryptedData),
    iv: arrayBufferToBase64(iv),
    keyFingerprint,
    timestamp: Date.now(),
  };
}

// Validate secure password payload
export function validateSecurePasswordPayload(
  payload: SecurePasswordPayload
): boolean {
  // Check if payload is recent (within 5 minutes)
  const maxAge = 5 * 60 * 1000; // 5 minutes
  const age = Date.now() - payload.timestamp;

  if (age > maxAge) {
    return false;
  }

  // Validate required fields
  return !!(
    payload.encryptedPassword &&
    payload.iv &&
    payload.keyFingerprint &&
    payload.timestamp
  );
}

// Check if Web Crypto API is available
export function isWebCryptoAvailable(): boolean {
  return (
    typeof crypto !== "undefined" &&
    typeof crypto.subtle !== "undefined" &&
    typeof crypto.getRandomValues !== "undefined"
  );
}

// Fallback for environments without Web Crypto API
export function createFallbackPayload(password: string): {
  password: string;
  warning: string;
} {
  console.warn(
    "Web Crypto API not available. Password will be transmitted in plain text over HTTPS."
  );
  return {
    password,
    warning: "Web Crypto API not available - ensure HTTPS is enabled",
  };
}
