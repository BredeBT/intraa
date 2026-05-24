"use client";

import dynamic from "next/dynamic";

export type { RichTextEditorRef } from "./RichTextEditor";

// TipTap-bundlen (~150-200 kB gzipped) lastes ikke før komponenten faktisk
// mountes. Refs forwardes gjennom dynamic siden underliggende komponent
// bruker forwardRef.
const RichTextEditorLazy = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-2xl"
      style={{
        minHeight: 48,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(240,244,255,0.08)",
      }}
    />
  ),
});

export default RichTextEditorLazy;
