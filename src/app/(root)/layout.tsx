
import { Metadata } from "next";
import { UserProvider } from "@/context/UserContext";
import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
   title: "Cognitive Games - Practice Aptitude",
   description: "Play cognitive aptitude games and practice brain challenges.",
   keywords: ["games", "aptitude", "cognitive", "challenges"],
   alternates: {
      canonical: siteConfig.url,
   },
};


export default async function HomeLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <UserProvider user={null} streak={{ currentStreak: 0, longestStreak: 0 }}>
         <Header />
         <main className="">
            {children}
         </main>
         <Footer />
      </UserProvider>
   );
}
