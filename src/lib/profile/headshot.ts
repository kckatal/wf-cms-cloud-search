/** Max headshot upload size for the agent profile editor. */
export const HEADSHOT_MAX_BYTES = 300 * 1024;

export const HEADSHOT_ACCEPT = "image/jpeg,image/png,image/webp";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export interface HeadshotValidationResult {
  ok: true;
  contentType: string;
  extension: string;
}

export interface HeadshotValidationError {
  ok: false;
  message: string;
}

export function validateHeadshotFile(
  bytes: Uint8Array,
  contentType: string,
): HeadshotValidationResult | HeadshotValidationError {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";

  if (!ALLOWED_TYPES.has(type)) {
    return { ok: false, message: "Photo must be a JPEG, PNG, or WebP image." };
  }

  if (bytes.byteLength > HEADSHOT_MAX_BYTES) {
    const maxKb = Math.round(HEADSHOT_MAX_BYTES / 1024);
    return { ok: false, message: `Photo must be ${maxKb} KB or smaller.` };
  }

  if (bytes.byteLength === 0) {
    return { ok: false, message: "Photo file is empty." };
  }

  return { ok: true, contentType: type, extension: EXT_BY_TYPE[type] ?? ".jpg" };
}

export function formatHeadshotMaxSize(): string {
  return `${Math.round(HEADSHOT_MAX_BYTES / 1024)} KB`;
}
