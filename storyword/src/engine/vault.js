// The 18+ Pass vault. The mature content ships encrypted (AES-256-GCM) with a
// random content key, so the game file and the repository contain only
// ciphertext. The content key is "wrapped" (encrypted) with keys derived from
// secrets via PBKDF2-SHA256:
//   - a one-time setup code, stored in the bundle (bundle.setup)
//   - the player's own password, stored only on their device
// Unlocking needs one of those secrets; nothing in the file reveals the
// content without it. Works with WebCrypto in browsers and in Node 20+.

export const ITERATIONS = 250000;
const enc = new TextEncoder();
const dec = new TextDecoder();
const subtle = () => globalThis.crypto.subtle;

function b64(bytes) {
  const u = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

function unb64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

const random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

// Setup codes are typed by hand: ignore case, spaces and dashes.
export function normalizeCode(code) {
  return String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function keyFromSecret(secret, salt, iterations) {
  const base = await subtle().importKey('raw', enc.encode(String(secret).normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function wrapKey(rawKey, secret, iterations = ITERATIONS) {
  const salt = random(16);
  const iv = random(12);
  const kek = await keyFromSecret(secret, salt, iterations);
  const wrapped = await subtle().encrypt({ name: 'AES-GCM', iv }, kek, rawKey);
  return { iter: iterations, salt: b64(salt), iv: b64(iv), wrapped: b64(wrapped) };
}

// Throws if the secret is wrong (AES-GCM authentication fails).
export async function unwrapKey(w, secret) {
  const kek = await keyFromSecret(secret, unb64(w.salt), w.iter);
  return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: unb64(w.iv) }, kek, unb64(w.wrapped)));
}

export async function sealBundle(content, setupCode, iterations = ITERATIONS) {
  const raw = random(32);
  const key = await subtle().importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const iv = random(12);
  const data = await subtle().encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(content)));
  return { v: 1, setup: await wrapKey(raw, normalizeCode(setupCode), iterations), iv: b64(iv), data: b64(data) };
}

export async function openBundle(bundle, rawKey) {
  const key = await subtle().importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const plain = await subtle().decrypt({ name: 'AES-GCM', iv: unb64(bundle.iv) }, key, unb64(bundle.data));
  return JSON.parse(dec.decode(plain));
}

export async function unlockWithSetupCode(bundle, code) {
  return unwrapKey(bundle.setup, normalizeCode(code));
}
