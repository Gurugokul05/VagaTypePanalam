import type { Metadata } from "next";
import LessonDetailPage from "@/components/pages/LessonDetailPage";
import { ENGLISH_LESSONS } from "@/data/lessons/english";
import { TAMIL_LESSONS } from "@/data/lessons/tamil";
import { TANGLISH_LESSONS } from "@/data/lessons/tanglish";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const lesson =
    ENGLISH_LESSONS.find((l) => l.id === id) ||
    TAMIL_LESSONS.find((l) => l.id === id) ||
    TANGLISH_LESSONS.find((l) => l.id === id);

  if (!lesson) {
    return {
      title: "Lesson Not Found — VangaTypePanalam",
      description: "The requested typing lesson could not be found.",
      alternates: {
        canonical: `https://vangatypepanalam.qzz.io/lessons/${id}`,
      },
    };
  }

  return {
    title: `Lesson ${lesson.level}: ${lesson.title}`,
    description: lesson.description,
    alternates: {
      canonical: `https://vangatypepanalam.qzz.io/lessons/${id}`,
    },
    openGraph: {
      type: "website",
      siteName: "VangaTypePanalam",
      title: `Lesson ${lesson.level}: ${lesson.title} — VangaTypePanalam`,
      description: lesson.description,
      url: `https://vangatypepanalam.qzz.io/lessons/${id}`,
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const lesson =
    ENGLISH_LESSONS.find((l) => l.id === id) ||
    TAMIL_LESSONS.find((l) => l.id === id) ||
    TANGLISH_LESSONS.find((l) => l.id === id);

  if (!lesson) {
    return <LessonDetailPage lessonTitle={null} />;
  }

  return <LessonDetailPage lessonTitle={lesson.title} />;
}
