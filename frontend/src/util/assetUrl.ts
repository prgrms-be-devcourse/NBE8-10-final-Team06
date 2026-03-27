import type React from "react";

export const DEFAULT_PROFILE_IMAGE = "/default-profile.png";

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
  if (url.startsWith("/")) {
    return url;
  }
  return `/uploads/${url}`;
};

export const getAlternateAssetUrl = (url?: string | null): string => {
  const resolved = resolveAssetUrl(url);
  if (!resolved) return "";
  if (resolved.startsWith("/uploads/")) return resolved.replace("/uploads/", "/temp/media/");
  if (resolved.startsWith("/temp/media/")) return resolved.replace("/temp/media/", "/uploads/");
  return "";
};

export const resolveProfileImageUrl = (url?: string | null): string => {
  const resolved = resolveAssetUrl(url);
  return resolved || DEFAULT_PROFILE_IMAGE;
};

export const applyImageFallback = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  originalUrl?: string | null
) => {
  const img = e.currentTarget;
  const tried = img.dataset.fallbackTried === "1";

  if (!tried) {
    const alt = getAlternateAssetUrl(originalUrl);
    if (alt) {
      img.dataset.fallbackTried = "1";
      img.src = alt;
      return;
    }
  }

  img.src = DEFAULT_PROFILE_IMAGE;
};
