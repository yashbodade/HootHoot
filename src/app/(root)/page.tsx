import type { Metadata } from "next";
import Hero from "@/components/Landing/Hero";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Cognitive Games - Practice Aptitude",
  description: "Play cognitive aptitude games and practice brain challenges.",
  keywords: ["games", "aptitude", "cognitive", "challenges"],
  alternates: {
    canonical: `${siteConfig.url}/`,
  },
  openGraph: {
    title: "Cognitive Games",
    description: "Play cognitive aptitude games and practice brain challenges.",
    url: `${siteConfig.url}/`,
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="h-screen overflow-hidden">
      <Hero />
    </div>
  );
}
