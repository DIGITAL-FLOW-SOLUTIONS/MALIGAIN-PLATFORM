/**
 * UserAvatar — shared avatar component used across the app.
 *
 * Shows the default profile image with:
 *  • native lazy loading  (loading="lazy")
 *  • async decoding        (decoding="async")
 *  • browser HTTP cache   (public asset → no JS needed for persistence)
 *  • sessionStorage flag  so the <img> is rendered as already-loaded on
 *    subsequent mounts within the same session, preventing flicker
 *  • initials fallback    shown when the image fails to load
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const AVATAR_SRC = `${import.meta.env.BASE_URL}images/default-avatar.png`;
const CACHE_KEY  = "mg_avatar_loaded";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<Size, { wrapper: string; text: string }> = {
  xs: { wrapper: "w-7  h-7",  text: "text-[10px]" },
  sm: { wrapper: "w-9  h-9",  text: "text-xs"     },
  md: { wrapper: "w-11 h-11", text: "text-sm"     },
  lg: { wrapper: "w-14 h-14", text: "text-base"   },
  xl: { wrapper: "w-[4.5rem] h-[4.5rem]", text: "text-xl" },
};

interface UserAvatarProps {
  initials?: string | null;
  size?: Size;
  className?: string;
  /** Extra ring/border class to apply to the wrapper */
  ringClass?: string;
}

export function UserAvatar({
  initials,
  size = "md",
  className,
  ringClass,
}: UserAvatarProps) {
  // If we already confirmed the image loaded this session, skip the loading state
  const [imgOk, setImgOk] = useState<boolean>(
    () => sessionStorage.getItem(CACHE_KEY) === "1"
  );
  const [imgError, setImgError] = useState(false);

  // Preload once so subsequent mounts are instant
  useEffect(() => {
    if (imgOk) return;
    const img = new Image();
    img.src = AVATAR_SRC;
    img.onload  = () => { sessionStorage.setItem(CACHE_KEY, "1"); setImgOk(true);    };
    img.onerror = () => { setImgError(true); };
  }, [imgOk]);

  const { wrapper, text } = SIZE_MAP[size];
  const showImage = imgOk && !imgError;

  return (
    <div
      className={cn(
        "rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center",
        wrapper,
        showImage ? "bg-white" : "bg-gradient-to-br from-secondary to-primary",
        ringClass,
        className,
      )}
    >
      {showImage ? (
        <img
          src={AVATAR_SRC}
          alt="profile"
          loading="lazy"
          decoding="async"
          draggable={false}
          className="w-full h-full object-cover select-none"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={cn("text-white font-bold select-none", text)}>
          {initials || "U"}
        </span>
      )}
    </div>
  );
}
