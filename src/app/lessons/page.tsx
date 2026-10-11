import type { Metadata } from "next";
import LessonsPage from "@/components/pages/LessonsPage";

export const metadata: Metadata = {
  title: "Progressive Typing Lessons — Learn Touch Typing Free",
  description:
    "Learn touch typing from scratch with 30 progressive levels. Each lesson builds on the last, from home row to full-speed typing.",
  alternates: {
    canonical: "https://vangatypepanalam.qzz.io/lessons",
  },
  openGraph: {
    type: "website",
    siteName: "VangaTypePanalam",
    title: "Progressive Typing Lessons — Learn Touch Typing Free",
    description:
      "Learn touch typing from scratch with 30 progressive levels. Each lesson builds on the last.",
    url: "https://vangatypepanalam.qzz.io/lessons",
  },
};

export default function Page() {
  return <LessonsPage />;
}
