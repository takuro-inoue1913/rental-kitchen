"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

const SLIDES = [
  { src: "/images/hero.jpeg", alt: "スペース全体" },
  { src: "/images/space-full.jpeg", alt: "スペース俯瞰" },
  { src: "/images/kitchen-counter.jpg", alt: "キッチンカウンター" },
  { src: "/images/dining-projector.jpeg", alt: "ダイニング＆プロジェクター" },
  { src: "/images/space-overview.jpeg", alt: "スペース全景" },
  { src: "/images/theater.jpeg", alt: "シアタースペース" },
  { src: "/images/lounge.jpeg", alt: "ラウンジ" },
  { src: "/images/kitchen-wide.jpeg", alt: "キッチン全景" },
];

const INTERVAL = 5000;

export function HeroSlider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 700);
    },
    [isTransitioning]
  );

  const next = useCallback(() => {
    goTo((current + 1) % SLIDES.length);
  }, [current, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + SLIDES.length) % SLIDES.length);
  }, [current, goTo]);

  // 自動スライド
  useEffect(() => {
    const timer = setInterval(next, INTERVAL);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="relative h-[480px] sm:h-[560px] overflow-hidden">
      {/* スライド画像 */}
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            className="object-cover"
            priority={i === 0}
            sizes="100vw"
          />
        </div>
      ))}

      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/40" />

      {/* テキストコンテンツ */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        {children}
      </div>

      {/* 左右ボタン */}
      <button
        type="button"
        onClick={prev}
        className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
        aria-label="前の画像"
      >
        &#8249;
      </button>
      <button
        type="button"
        onClick={next}
        className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
        aria-label="次の画像"
      >
        &#8250;
      </button>

      {/* ドットインジケーター */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all ${
              i === current ? "w-6 bg-white" : "w-2 bg-white/50"
            }`}
            aria-label={`スライド ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
