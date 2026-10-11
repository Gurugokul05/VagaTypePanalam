import type { Metadata } from "next";
import RacePage from "@/components/pages/RacePage";

export const metadata: Metadata = {
  title: "Ghost Racing Mode — Compete & Improve Typing Speed",
  description:
    "Race against AI-powered bots to build competitive typing speed. Compete offline against simulated opponents with fixed WPM targets.",
  alternates: {
    canonical: "https://vangatypepanalam.qzz.io/race",
  },
  openGraph: {
    type: "website",
    siteName: "VangaTypePanalam",
    title: "Ghost Racing Mode — Compete & Improve Typing Speed",
    description:
      "Race against AI-powered bots to build competitive typing speed. Compete offline against simulated opponents.",
    url: "https://vangatypepanalam.qzz.io/race",
  },
};

export default function Page() {
  return <RacePage />;
}
