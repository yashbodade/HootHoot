"use client";

import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import { useRef, useEffect } from "react";

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Lazy-load video: set src after mount so it doesn't block initial paint
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const timer = setTimeout(() => {
      video.src = "/bg-video.mp4";
      video.load();
      video.play().catch(e => console.error("Auto-play failed:", e));
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative w-full h-screen overflow-hidden bg-black flex items-center justify-center">
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="none"
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-80"
      />

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full max-w-5xl mx-auto mt-16">
        <h1 className="text-4xl md:text-6xl lg:text-[5rem] font-black tracking-tighter text-white mb-10 leading-[1.1] drop-shadow-2xl uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
          Train your
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 drop-shadow-none"> brain</span>
          <br />
          Improve your logic.<br />
        </h1>

        <Button
          size="lg"
          className="h-14 px-10 text-lg rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          onClick={() => window.location.href = "/games"}
        >
          Start Playing
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </section>
  );
}
