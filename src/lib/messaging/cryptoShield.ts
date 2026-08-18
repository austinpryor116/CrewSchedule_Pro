/**
 * CREWSCHEDULE PRO // E2EE CRYPTO SHIELD
 * Zero-Knowledge Client-Side Cryptography Subsystem
 * Web Crypto API (AES-256-GCM + ECDH P-256)
 */

// Helper: Convert ArrayBuffer / Uint8Array to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

// Helper: Convert Base64 to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, "base64"));
}

// Get standard Web Crypto instance (browser or Node 18+)
function getCrypto(): Crypto {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    return globalThis.crypto;
  }
  throw new Error("Web Crypto API is not supported in this environment");
}

/**
 * Generate an Elliptic Curve Diffie-Hellman (ECDH P-256) key pair for 1-on-1 direct crew trade chat.
 */
export async function generateEcdhKeyPair(): Promise<CryptoKeyPair> {
  const crypto = getCrypto();
  return await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true, // extractable
    ["deriveKey", "deriveBits"]
  );
}

/**
 * Export public key to Base64 JWK or SPKI for transmission to peer crew members.
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const crypto = getCrypto();
  const exported = await crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}

/**
 * Import public key from Base64 SPKI.
 */
export async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
  const crypto = getCrypto();
  const buffer = base64ToUint8Array(spkiBase64);
  return await crypto.subtle.importKey(
    "spki",
    buffer.buffer as ArrayBuffer,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
}

/**
 * Derive AES-256-GCM symmetric session key from local private key and peer's public key.
 */
export async function deriveSharedKey(
  localPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  const crypto = getCrypto();
  return await crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: peerPublicKey,
    },
    localPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Derive a deterministic AES-256-GCM room key for Sequence pairing / Base channels using SHA-256 HKDF/Raw import.
 */
export async function deriveRoomKey(roomId: string, salt: string = "CrewSchedule-E2EE-v1"): Promise<CryptoKey> {
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const rawSecret = encoder.encode(`${salt}::${roomId}::ApexAeroCrypto`);
  
  // Compute SHA-256 digest to get 256-bit entropy
  const digest = await crypto.subtle.digest("SHA-256", rawSecret);

  return await crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable in memory
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt plain text using AES-256-GCM with a unique 96-bit (12 bytes) Initialization Vector (IV).
 */
export async function encryptMessage(
  plainText: string,
  key: CryptoKey
): Promise<{ cipherText: string; iv: string }> {
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(plainText);

  // Generate 96-bit (12 bytes) random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
      tagLength: 128,
    },
    key,
    encodedText
  );

  return {
    cipherText: arrayBufferToBase64(cipherBuffer),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt AES-256-GCM ciphertext using the given key and IV.
 */
export async function decryptMessage(
  cipherTextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const crypto = getCrypto();
  const cipherBytes = base64ToUint8Array(cipherTextBase64);
  const ivBytes = base64ToUint8Array(ivBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBytes as unknown as BufferSource,
      tagLength: 128,
    },
    key,
    cipherBytes as unknown as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}


// In-memory Room Key Cache for high performance
const roomKeyCache = new Map<string, CryptoKey>();

export async function getCachedRoomKey(roomId: string): Promise<CryptoKey> {
  if (roomKeyCache.has(roomId)) {
    return roomKeyCache.get(roomId)!;
  }
  const key = await deriveRoomKey(roomId);
  roomKeyCache.set(roomId, key);
  return key;
}
