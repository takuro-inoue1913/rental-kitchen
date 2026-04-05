"use client";

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";

type GalleryImage = {
  src: string;
  alt: string;
};

type Props = {
  images: GalleryImage[];
};

export function Gallery({ images }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const close = useCallback(() => setSelectedIndex(null), []);

  const next = useCallback(() => {
    setSelectedIndex((prev) =>
      prev !== null ? (prev + 1) % images.length : null
    );
  }, [images.length]);

  const prev = useCallback(() => {
    setSelectedIndex((prev) =>
      prev !== null ? (prev - 1 + images.length) % images.length : null
    );
  }, [images.length]);

  // キーボード操作
  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIndex, close, next, prev]);

  // スクロール抑制
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedIndex]);

  return (
    <>
      {/* グリッド */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {images.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setSelectedIndex(i)}
            className="group relative aspect-[3/2] overflow-hidden rounded-xl cursor-pointer"
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
            <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100">
              {img.alt}
            </span>
          </button>
        ))}
      </div>

      {/* ライトボックス */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={close}
        >
          {/* 閉じるボタン */}
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white text-xl hover:bg-black/60"
            aria-label="閉じる"
          >
            &times;
          </button>

          {/* 前へ */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white text-2xl hover:bg-black/60"
            aria-label="前の画像"
          >
            &#8249;
          </button>

          {/* 画像 */}
          <div
            className="relative max-h-[85vh] max-w-[90vw] aspect-[4/3] w-full sm:max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[selectedIndex].src}
              alt={images[selectedIndex].alt}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>

          {/* 次へ */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white text-2xl hover:bg-black/60"
            aria-label="次の画像"
          >
            &#8250;
          </button>

          {/* キャプション + カウンター */}
          <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-center">
            <p className="text-white text-sm">
              {images[selectedIndex].alt}
            </p>
            <p className="text-white/60 text-xs mt-1">
              {selectedIndex + 1} / {images.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
