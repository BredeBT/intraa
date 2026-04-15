"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

// @ts-ignore — @emoji-mart/react doesn't ship ESM types compatible with strict TS
const Picker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

interface Props {
  onSelect: (emoji: string) => void;
  onClose:  () => void;
}

export function EmojiPicker({ onSelect, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div ref={containerRef} className="absolute bottom-full mb-2 left-0 z-50">
      <Picker
        data={async () => {
          const response = await fetch("https://cdn.jsdelivr.net/npm/@emoji-mart/data");
          return response.json();
        }}
        // @ts-ignore
        onEmojiSelect={(emoji: { native: string }) => {
          onSelect(emoji.native);
          onClose();
        }}
        theme="dark"
        locale="no"
        previewPosition="none"
        skinTonePosition="none"
      />
    </div>
  );
}
