import { createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export const AVATAR_MAX_BYTES = 3 * 1024 * 1024; // 3 MB
export const AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type StoredAvatar = {
  /** Public relative URL path, e.g. /uploads/avatars/xyz.jpg */
  url: string;
  /** Storage key used for deletion */
  key: string;
};

function uploadsRoot() {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), "uploads");
}

function avatarsDir() {
  return path.join(uploadsRoot(), "avatars");
}

export function detectImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "image/gif";
  }
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  return null;
}

async function ensureAvatarsDir() {
  await fs.mkdir(avatarsDir(), { recursive: true });
}

function safeKey(userId: string, ext: string) {
  const stamp = Date.now().toString(36);
  const rand = randomBytes(6).toString("hex");
  const hash = createHash("sha1").update(`${userId}:${stamp}:${rand}`).digest("hex").slice(0, 10);
  return `avatars/${userId}-${stamp}-${hash}.${ext}`;
}

/**
 * Local filesystem avatar storage.
 * Swap implementation later for S3/Cloudinary using the same StoredAvatar contract.
 */
export async function storeAvatar(
  userId: string,
  buffer: Buffer,
  claimedMime: string
): Promise<StoredAvatar> {
  if (buffer.length === 0 || buffer.length > AVATAR_MAX_BYTES) {
    throw new Error("INVALID_SIZE");
  }
  const detected = detectImageMime(buffer);
  if (!detected || !AVATAR_MIME_TYPES.has(detected)) {
    throw new Error("INVALID_TYPE");
  }
  if (claimedMime && claimedMime !== detected && !(claimedMime === "image/jpg" && detected === "image/jpeg")) {
    // Prefer magic-byte detection; reject only when client claims a different image family
    if (!AVATAR_MIME_TYPES.has(claimedMime)) {
      throw new Error("INVALID_TYPE");
    }
  }

  const ext = EXT_BY_MIME[detected];
  if (!ext) throw new Error("INVALID_TYPE");

  await ensureAvatarsDir();
  const key = safeKey(userId, ext);
  const absolute = path.join(uploadsRoot(), key);
  await fs.writeFile(absolute, buffer);

  return {
    key,
    url: `/uploads/${key.replace(/\\/g, "/")}`,
  };
}

export async function deleteStoredAvatar(key: string | null | undefined) {
  if (!key) return;
  // Prevent path traversal
  if (key.includes("..") || path.isAbsolute(key) || !key.startsWith("avatars/")) {
    return;
  }
  const absolute = path.join(uploadsRoot(), key);
  try {
    await fs.unlink(absolute);
  } catch {
    // Missing file is fine
  }
}

export function getUploadsRoot() {
  return uploadsRoot();
}
