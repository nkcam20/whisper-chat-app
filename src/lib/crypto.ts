/**
 * End-to-End Encryption (E2EE) utilities using Web Crypto API.
 * Uses RSA-OAEP for key exchange and AES-GCM for message encryption.
 */

// Helper to convert Uint8Array to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to Uint8Array
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Remove any whitespace or newlines that might have been added
  const cleanedBase64 = base64.replace(/\s/g, '');
  const binaryString = window.atob(cleanedBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate RSA Key Pair
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Export Public Key as Base64
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}

// Import Public Key from Base64
export async function importPublicKey(pem: string): Promise<CryptoKey> {
  try {
    const cleaned = pem
      .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n|\r/g, "")
      .trim();
    const binaryDer = base64ToArrayBuffer(cleaned);
    return await crypto.subtle.importKey(
      "spki",
      binaryDer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
  } catch (err) {
    console.error("Failed to import public key. PEM might be invalid.", err);
    throw err;
  }
}

// Export Private Key as JWK
export async function exportPrivateKey(key: CryptoKey): Promise<JsonWebKey> {
    return await window.crypto.subtle.exportKey("jwk", key);
}

// Import Private Key from JWK
export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["decrypt"]
    );
}

// Encrypt a Message (AES-GCM)
export async function encryptMessage(text: string, publicKeyPem: string): Promise<string> {
    try {
        // 1. Generate a random AES key
        const aesKey = await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        // 2. Encrypt the text with AES-GCM
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encodedText = new TextEncoder().encode(text);
        const encryptedTextBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey,
            encodedText
        );

        // 3. Export the AES key and encrypt it with the recipient's RSA public key
        const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
        const recipientPublicKey = await importPublicKey(publicKeyPem);
        const encryptedAesKeyBuffer = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            recipientPublicKey,
            exportedAesKey
        );

        // 4. Combine: encryptedAesKey (256 bytes) + IV (12 bytes) + encryptedText
        const combined = new Uint8Array(encryptedAesKeyBuffer.byteLength + iv.byteLength + encryptedTextBuffer.byteLength);
        combined.set(new Uint8Array(encryptedAesKeyBuffer), 0);
        combined.set(iv, encryptedAesKeyBuffer.byteLength);
        combined.set(new Uint8Array(encryptedTextBuffer), encryptedAesKeyBuffer.byteLength + iv.byteLength);

        return arrayBufferToBase64(combined.buffer);
    } catch (e) {
        console.error("Encryption failed:", e);
        throw e;
    }
}

// Decrypt a Message (AES-GCM)
export async function decryptMessage(combinedBase64: string, privateKey: CryptoKey): Promise<string> {
    try {
        const combined = new Uint8Array(base64ToArrayBuffer(combinedBase64));
        
        // RSA-OAEP 2048-bit with SHA-256 results in 256 bytes (2048/8)
        const RSA_KEY_SIZE = 256; 
        const IV_SIZE = 12;

        if (combined.length < RSA_KEY_SIZE + IV_SIZE) {
            throw new Error("Invalid encrypted message format");
        }

        const encryptedAesKey = combined.slice(0, RSA_KEY_SIZE);
        const iv = combined.slice(RSA_KEY_SIZE, RSA_KEY_SIZE + IV_SIZE);
        const encryptedText = combined.slice(RSA_KEY_SIZE + IV_SIZE);

        // 1. Decrypt the AES key with RSA private key
        const aesKeyBuffer = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            encryptedAesKey
        );

        // 2. Import the AES key
        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            aesKeyBuffer,
            { name: "AES-GCM" },
            true,
            ["decrypt"]
        );

        // 3. Decrypt the text with AES-GCM
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            aesKey,
            encryptedText
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
        console.error("Decryption failed:", e);
        throw e;
    }
}
