import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig, gamesConfig } from "@/config/site";
import GamesCard from "@/components/games/GamesCard";

export const metadata: Metadata = {
  title: "Cognizant GenC Games — Free Practice 2026 | HootHoot",
  description:
    "Practice all Cognizant GenC game-based aptitude games free online. Switch, Digit, Inductive, Deductive & more — the exact games used in Cognizant placement tests. No download, no signup.",
  keywords: [
    "cognizant genc games",
    "cognizant aptitude games",
    "cognizant game based aptitude free",
    "cognizant placement games 2026",
    "switch challenge cognizant",
    "inductive challenge cognizant",
    "game based aptitude test free",
    "cognitive games for placement",
  ],
  alternates: { canonical: `${siteConfig.url}/cognizant-games` },
  openGraph: {
    title: "Cognizant GenC Games — Free Practice 2026 | HootHoot",
    description:
      "Practice Cognizant GenC cognitive aptitude games free. No signup, unlimited attempts. Match the real test format.",
    url: `${siteConfig.url}/cognizant-games`,
    images: [
      {
        url: `${siteConfig.url}/og-logo.png`,
        width: 1200,
        height: 630,
        alt: "Cognizant GenC Games — HootHoot",
      },
    ],
  },
};

const cognizantGames = gamesConfig.filter((g) => g.category === "cognitive");

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What games are in the Cognizant GenC game-based aptitude test?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cognizant GenC typically includes Switch Challenge, Digit Challenge, Inductive Reasoning, Deductive Logic, and Grid/Motion challenges. These are the same cognitive games used on the Aon/cut-e platform.",
      },
    },
    {
      "@type": "Question",
      name: "Is the Cognizant game round elimination based?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The Cognizant game-based aptitude round is an elimination stage. Candidates who do not meet the cut-off score are screened out before the interview rounds.",
      },
    },
    {
      "@type": "Question",
      name: "Are Cognizant GenC games similar to Capgemini games?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Both Cognizant and Capgemini use the Aon/cut-e game-based aptitude platform. Practicing Switch Challenge, Grid Challenge, and Deductive Logic prepares you for both companies.",
      },
    },
    {
      "@type": "Question",
      name: "Are these games free to practice?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All games on HootHoot are completely free. No payment, no download — sign in and start practicing immediately.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
    { "@type": "ListItem", position: 2, name: "Games", item: `${siteConfig.url}/games` },
    {
      "@type": "ListItem",
      position: 3,
      name: "Cognizant GenC Prep",
      item: `${siteConfig.url}/cognizant-games`,
    },
  ],
};

export default function CognizantGamesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="max-w-6xl mx-auto px-4 py-12 mt-30 overflow-hidden">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-10">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden className="text-border">/</li>
            <li>
              <Link href="/games" className="hover:text-foreground transition-colors">
                Games
              </Link>
            </li>
            <li aria-hidden className="text-border">/</li>
            <li className="text-foreground font-medium">Cognizant GenC Prep</li>
          </ol>
        </nav>

        {/* Hero */}
        <div className="relative mb-16">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-5 leading-[1.1]">
            Cognizant GenC Games
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Practice all{" "}
            <span className="text-foreground font-semibold">{cognizantGames.length} cognitive games</span>{" "}
            used in the{" "}
            <span className="text-foreground font-semibold">Cognizant GenC</span> game-based aptitude
            round. Free online, no download. Every game matches the real Aon/cut-e assessment format.
          </p>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2 mt-6">
            {[
              { label: "Capgemini Prep", href: "/games/cognitive" },
              { label: "All Games", href: "/games" },
              { label: "Arena Practice", href: "/arena" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Game Cards — same component as Capgemini page */}
        <GamesCard />

        {/* FAQ */}
        <section className="border-t border-border/40 pt-12 mt-4">
          <h2 className="text-2xl font-semibold mb-8">Frequently Asked Questions</h2>
          <dl className="space-y-6">
            {faqSchema.mainEntity.map((faq, i) => (
              <div
                key={i}
                className="p-5 rounded-xl border border-border/50 bg-muted/20 hover:border-border/80 transition-colors"
              >
                <dt className="font-semibold text-foreground mb-2">{faq.name}</dt>
                <dd className="text-muted-foreground text-sm leading-relaxed">
                  {faq.acceptedAnswer.text}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </>
  );
}
