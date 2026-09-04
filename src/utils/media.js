const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"]);

/** True if the filename points at an uploadable video container. */
export function isVideoFile(filename) {
  const lower = String(filename || "").toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return false;
  return VIDEO_EXTENSIONS.has(lower.slice(dot));
}

/** Accept attribute for photo+video file inputs (direct + guest upload). */
export const MEDIA_ACCEPT = "image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,.mkv,.mov,.m4v,.avi";

/** Accept attribute for still-image-only inputs (selfies, covers, logos). */
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
