'use client';

import Link from "next/link";
import { gameCards } from "@/data/GamesData";
import { cn } from "@/lib/utils";
import { ArrowRight, Shuffle, Hash, Brain, MoveRight, Eye, Grid2X2 } from "lucide-react";
import { useUser } from "@/context/UserContext";

const GAME_META: Record<number, { icon: React.ReactNode }> = {
  1: { icon: <Shuffle className="w-5 h-5" /> },
  2: { icon: <Brain className="w-5 h-5" /> },
  3: { icon: <Hash className="w-5 h-5" /> },
  4: { icon: <MoveRight className="w-5 h-5" /> },
  5: { icon: <Grid2X2 className="w-5 h-5" /> },
  6: { icon: <Eye className="w-5 h-5" /> },
};

export default function GamesCard() {
  const user = useUser();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 px-4 pt-6 pb-20">
      {gameCards.map((game) => {
        const isAvailable = game.isAvailable !== false;
        const meta = GAME_META[game.id];

        const href = !isAvailable ? "#" : game.rulesLink;

        return (
          <div key={game.id}>
            <Link
              href={href}
              aria-disabled={!isAvailable}
              className={cn(
                "group relative flex flex-col gap-4 p-5 rounded-2xl h-full",
                "bg-card border border-border/50",
                "transition-colors duration-200",
                isAvailable
                  ? "hover:border-border/80"
                  : "pointer-events-none opacity-60"
              )}
            >

              {/* Top row: icon + badge */}
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl border border-border/40 bg-white/5 text-foreground/70">
                  {meta.icon}
                </div>
                <div className="flex items-center gap-1.5">
                  {!isAvailable && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>

              {/* Name + description */}
              <div className="flex-1 flex flex-col gap-1.5">
                <h3 className="text-base font-semibold text-foreground leading-snug">
                  {game.name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {game.description}
                </p>
              </div>

              {/* Footer */}
              {isAvailable && (
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium transition-colors duration-200 mt-auto pt-1",
                  "text-foreground/60 group-hover:text-foreground"
                )}>
                  Play Now
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              )}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
