import type { Metadata } from "next";
import { siteConfig, gamesConfig } from "@/config/site";
import GamesHubClient from "@/components/games/GamesHubClient";

export const metadata: Metadata = {
  title: "Hoot-Hoot — Master Cognitive Challenges",
  description:
    "Train your brain. Improve your logic. Master cognitive challenges. Practice memory, deductive reasoning, and pattern recognition.",
  keywords: [
    "Hoot-Hoot",
    "cognitive games",
    "brain training games",
    "memory games",
    "logic puzzles",
  ],
  alternates: { canonical: `${siteConfig.url}/games` },
  openGraph: {
    title: "Free Cognitive Games Online | Blync",
    description:
      "Play free cognitive games for Capgemini & Cognizant placement prep. Memory, deductive, pattern games.",
    url: `${siteConfig.url}/games`,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "Blync — Free Cognitive Games Online",
      },
    ],
  },
};

const itemListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Free Cognitive Games Online",
  description:
    "Free online cognitive games for Capgemini & Cognizant placement aptitude test practice.",
  url: `${siteConfig.url}/games`,
  numberOfItems: gamesConfig.length,
  itemListElement: gamesConfig.map((game, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: game.name,
    url: `${siteConfig.url}/games/${game.category}/${game.slug}`,
  })),
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
    { "@type": "ListItem", position: 2, name: "Games", item: `${siteConfig.url}/games` },
  ],
};

export default function GamesHubPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <GamesHubClient />
    </>
  );
}
