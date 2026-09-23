import { notFound } from 'next/navigation';
import { getProgramBySlug, COURSES_PROGRAMS } from '@/lib/courses-data';
import { ProgramDetailView } from '@/components/ProgramDetailView';

export function generateStaticParams() {
  return COURSES_PROGRAMS.map((p) => ({ slug: p.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = getProgramBySlug(slug);
  if (!program) notFound();
  return <ProgramDetailView program={program} />;
}
