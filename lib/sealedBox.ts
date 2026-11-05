/** A tiny "sealed box" on Web Crypto (ECDH P-256 + AES-GCM): a message sent on
 *  the shared realtime channel that only the devices it was sealed for can
 *  read. Every device publishes its public key; private keys never leave it
 *  (each is kept in localStorage per game so a reload can still open messages).
 *
 *  Web Crypto needs a secure context (https or localhost). Where it's missing,
 *  `loadOrCreateKeyPair` and `seal` return null and callers send plain text,
 *  so the game still works — just without the privacy. */

export interface SealedBox {
  /** The sender's one-off public key (raw P-256 point, base64). */
  epk: string;
  /** One encrypted copy per recipient id. */
  boxes: Record<string, { iv: string; ct: string }>;
}

export interface KeyPairHandle {
  /** Raw P-256 public point, base64 — safe to publish. */
  publicKey: string;
  privateKey: CryptoKey;
}

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
const AES = { name: "AES-GCM", length: 256 } as const;

export function canSeal(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle && typeof TextEncoder !== "undefined";
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function importPublic(raw: string) {
  return crypto.subtle.importKey("raw", fromB64(raw), ECDH, false, []);
}

/** This device's key pair for `storageKey`, created on first use. */
export async function loadOrCreateKeyPair(storageKey: string): Promise<KeyPairHandle | null> {
  if (!canSeal()) return null;
  try {
    let saved: { pub: string; priv: JsonWebKey } | null = null;
    try { saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null"); } catch {}
    if (saved?.pub && saved.priv) {
      try {
        const privateKey = await crypto.subtle.importKey("jwk", saved.priv, ECDH, true, ["deriveKey"]);
        return { publicKey: saved.pub, privateKey };
      } catch {} // unreadable — make a fresh pair below
    }
    const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveKey"]);
    const pub = toB64(await crypto.subtle.exportKey("raw", pair.publicKey));
    const priv = await crypto.subtle.exportKey("jwk", pair.privateKey);
    try { window.localStorage.setItem(storageKey, JSON.stringify({ pub, priv })); } catch {}
    return { publicKey: pub, privateKey: pair.privateKey };
  } catch {
    return null;
  }
}

/** Seals `data` for each recipient (id → public key). Recipients whose key
 *  can't be read are skipped; null if nobody could be sealed for. */
export async function seal(recipients: Record<string, string>, data: unknown): Promise<SealedBox | null> {
  if (!canSeal()) return null;
  try {
    const eph = await crypto.subtle.generateKey(ECDH, true, ["deriveKey"]);
    const plain = new TextEncoder().encode(JSON.stringify(data));
    const boxes: SealedBox["boxes"] = {};
    for (const [id, pub] of Object.entries(recipients)) {
      try {
        const key = await crypto.subtle.deriveKey({ name: "ECDH", public: await importPublic(pub) }, eph.privateKey, AES, false, ["encrypt"]);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        boxes[id] = { iv: toB64(iv), ct: toB64(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain)) };
      } catch {}
    }
    if (Object.keys(boxes).length === 0) return null;
    return { epk: toB64(await crypto.subtle.exportKey("raw", eph.publicKey)), boxes };
  } catch {
    return null;
  }
}

/** Opens the copy sealed for `myId`; null if there isn't one or it doesn't decrypt. */
export async function openSealed<T>(box: SealedBox, myId: string, myPrivateKey: CryptoKey): Promise<T | null> {
  const mine = box?.boxes?.[myId];
  if (!mine || typeof box.epk !== "string" || !canSeal()) return null;
  try {
    const key = await crypto.subtle.deriveKey({ name: "ECDH", public: await importPublic(box.epk) }, myPrivateKey, AES, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(mine.iv) }, key, fromB64(mine.ct));
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}
