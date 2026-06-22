'use client';

import Link from "next/link";
import Image from "next/image";
import {
  Shuffle, Hash, Brain, MoveRight, Eye, Grid2X2,
  BookOpen, ArrowRight, Zap, Layers, Play,
  Puzzle, Bomb, Snail, Bug, Dice5, Gamepad2,
} from "lucide-react";
import { gamesConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const GAME_META: Record<string, { icon: React.ElementType }> = {
  "switch-challenge": { icon: Shuffle },
  "digit-challenge": { icon: Hash },
  "deductive-challenge": { icon: Brain },
  "motion-challenge": { icon: MoveRight },
  "inductive-challenge": { icon: Eye },
  "grid-challenge": { icon: Grid2X2 },
  "recall-challenge": { icon: BookOpen },
  // Brain Games
  "sudoku": { icon: Grid2X2 },
  "15-puzzle": { icon: Puzzle },
  "minesweeper": { icon: Bomb },
  "tic-tac-toe": { icon: Hash },
  "snake": { icon: Snail },
  "memory-match-pairs": { icon: Layers },
  "ant-smasher": { icon: Bug },
  "dice-roller": { icon: Dice5 },
};

const categories = [
  {
    slug: "cognitive",
    name: "Cognitive Games",
    href: "/games/cognitive",
    description:
      "Switch, Digit, Motion, Grid, Inductive & Deductive challenges — the exact games used in placement tests.",
    count: gamesConfig.filter((g) => g.category === "cognitive").length,
    Icon: Zap,
    badge: "Placement Ready",
    image: "/games/capgemini.png",
  },
  {
    slug: "memory",
    name: "Memory Games",
    href: "/games/memory",
    description:
      "Memory and Recall challenges to improve working memory, recall speed, and short-term retention.",
    count: gamesConfig.filter((g) => g.category === "memory").length,
    Icon: Layers,
    badge: "Brain Training",
    image: "/games/memory.png",
  },
  {
    slug: "brain",
    name: "Brain Games",
    href: "/games/brain",
    description:
      "Classic brain teasers — Sudoku, Minesweeper, 15 Puzzle, Snake & more. Sharpen logic, reflexes, and strategy.",
    count: gamesConfig.filter((g) => g.category === "brain").length,
    Icon: Gamepad2,
    badge: "Fun & Logic",
    image: "/games/braingames.png",
  },
];

export default function GamesHubClient() {
  return (
    <div className="min-h-screen relative selection:bg-white/20">
      {/* Subtle Background Pattern */}
      {/* <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10" /> */}

      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10 mt-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm font-medium text-muted-foreground mb-16 tracking-wide">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="text-muted-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden className="opacity-50">/</li>
            <li className="text-foreground">Games</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <div className="relative mb-24 max-w-3xl text-center mx-auto md:text-left md:mx-0">
          <h1 className="text-4xl md:text-5xl lg:text-[4rem] font-black tracking-tighter mb-6 leading-[1.05] text-white drop-shadow-lg uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
            Choose Your
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 drop-shadow-none">{" "}Challenge.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl font-medium drop-shadow-md">
            Practice free online cognitive games for <strong className="font-bold text-white">Capgemini &amp; Cognizant</strong> aptitude rounds. Train memory, logic, and pattern recognition instantly.
          </p>
        </div>

        {/* Categories Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={cat.href}
              className="relative flex flex-col overflow-hidden rounded-[2.5rem] bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 group"
            >
              {/* Category Image Cover */}
              <div className="relative w-full aspect-[16/10] overflow-hidden">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>

              {/* Content */}
              <div className="p-10 flex flex-col flex-1 justify-between relative z-10 -mt-12">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-tight uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {cat.name}
                  </h2>
                  <p className="text-base text-white/70 leading-relaxed font-medium">
                    {cat.description}
                  </p>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-2 mt-10 text-sm font-bold text-white/60 group-hover:text-purple-400 transition-colors duration-200">
                  <span className="tracking-widest uppercase">Explore Category</span>
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-2" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* All Games Grid */}
        <div className="relative">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12 pb-8 border-b border-white/10">
            <div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3 text-white uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>All Games</h2>
              <p className="text-white/60 font-medium text-lg">
                The complete training collection
              </p>
            </div>
            <div className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-bold text-white shadow-lg shadow-purple-500/10">
              {gamesConfig.length} Modules Available
            </div>
          </div>

          {/* Grid */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {gamesConfig.map((game) => {
              const meta = GAME_META[game.slug] ?? { icon: Zap };
              const Icon = meta.icon;

              return (
                <li key={game.slug}>
                  <Link
                    href={`/games/${game.category}/${game.slug}`}
                    className="relative flex flex-col h-full p-8 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-300 ease-out group"
                  >
                    <div className="relative z-10 flex flex-col h-full">
                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {game.name}
                        </h3>
                        <p className="text-base text-white/60 leading-relaxed font-medium">
                          {game.description}
                        </p>
                      </div>

                      {/* CTA */}
                      <div className="flex items-center gap-2 mt-10 text-sm font-bold text-white/40 group-hover:text-purple-400 transition-colors duration-200">
                        <Play className="w-5 h-5 fill-current" />
                        <span className="tracking-widest uppercase">Play Now</span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}
