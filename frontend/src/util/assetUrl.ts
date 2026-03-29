import type React from "react";

export const DEFAULT_PROFILE_IMAGE = "/default-profile.png";
const DEFAULT_PROFILE_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><rect width='80' height='80' fill='%23efefef'/><circle cx='40' cy='30' r='14' fill='%23c7c7c7'/><rect x='20' y='50' width='40' height='22' rx='11' fill='%23c7c7c7'/></svg>";
const missingAssetUrls = new Set<string>();

export const resolveAssetUrl = (url?: string | null): string => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  if (url.startsWith("/uploads/") || url.startsWith("/temp/media/")) {
    return url;
  }
  if (url === DEFAULT_PROFILE_IMAGE) {
    return url;
  }
  if (url.startsWith("/")) {
    const normalized = url.slice(1);
    if (!normalized || normalized.includes("/")) return url;
    return `/temp/media/${normalized}`;
  }
  return `/temp/media/${url}`;
};

export const getAlternateAssetUrl = (url?: string | null): string => {
  const resolved = resolveAssetUrl(url);
  if (!resolved) return "";
  if (resolved.startsWith("/uploads/")) return resolved.replace("/uploads/", "/temp/media/");
  if (resolved.startsWith("/temp/media/")) return resolved.replace("/temp/media/", "/uploads/");
  return "";
};

export const markAssetMissing = (url?: string | null) => {
  const resolved = resolveAssetUrl(url);
  if (!resolved) return;
  missingAssetUrls.add(resolved);
  const alternate = getAlternateAssetUrl(resolved);
  if (alternate) {
    missingAssetUrls.add(alternate);
  }
};

export const isAssetMarkedMissing = (url?: string | null): boolean => {
  const resolved = resolveAssetUrl(url);
  return !!resolved && missingAssetUrls.has(resolved);
};

export const resolveProfileImageUrl = (url?: string | null): string => {
  const normalized = typeof url === 'string' ? url.trim() : url;
  const resolved = resolveAssetUrl(normalized || null);
  return resolved || DEFAULT_PROFILE_IMAGE;
};

export const applyImageFallback = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  originalUrl?: string | null
) => {
  const img = e.currentTarget;
  const finalApplied = img.dataset.finalFallbackApplied === "1";
  if (finalApplied) return;

  const tried = img.dataset.fallbackTried === "1";

  if (!tried) {
    const alt = getAlternateAssetUrl(originalUrl);
    if (alt) {
      img.dataset.fallbackTried = "1";
      img.src = alt;
      return;
    }
  }

  // Prevent endless onError loops when the default asset is broken.
  img.dataset.finalFallbackApplied = "1";
  img.onerror = null;

  const currentSrc = img.getAttribute("src") || "";
  if (currentSrc.includes(DEFAULT_PROFILE_IMAGE)) {
    img.src = DEFAULT_PROFILE_PLACEHOLDER;
    return;
  }
  img.src = DEFAULT_PROFILE_IMAGE;
};
