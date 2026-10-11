import type { Metadata } from "next";
import TestPage from "@/components/pages/TestPage";

export const metadata: Metadata = {
  title: "Free WPM Typing Speed Test — Timed & Accurate",
  description:
    "Take a timed typing test to measure your WPM speed and accuracy. Choose from 15s, 30s, 60s, or 120s durations.",
  alternates: {
    canonical: "https://vangatypepanalam.qzz.io/test",
  },
  openGraph: {
    type: "website",
    siteName: "VangaTypePanalam",
    title: "Free WPM Typing Speed Test — Timed & Accurate",
    description:
      "Take a timed typing test to measure your WPM speed and accuracy. Choose from 15s, 30s, 60s, or 120s durations.",
    url: "https://vangatypepanalam.qzz.io/test",
  },
};

export default function Page() {
  return <TestPage />;
}
