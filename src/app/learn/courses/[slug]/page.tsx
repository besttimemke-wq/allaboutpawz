import { notFound } from 'next/navigation';
import { getProgramBySlug, COURSES_PROGRAMS } from '@/lib/courses-data';
import { ProgramDetailView } from '@/components/ProgramDetailView';
import { listAllCourses } from '@/lib/db';
import type { CourseRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return COURSES_PROGRAMS.map((p) => ({ slug: p.slug }));
}

// Marry the COURSES_PROGRAMS presentation chrome to the real lms.courses row.
// The slug resolves to a ProgramDetails (display chrome); we then look up the
// real course by its pathway code (VET, ACA, GRO, …) so the detail view can
// render the live companion + real course id for enrollment.
async function getDbCourseByCode(code: string): Promise<CourseRecord | null> {
  const all = await listAllCourses();
  return all.find((c) => (c.code ?? '').toUpperCase() === code.toUpperCase()) ?? null;
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = getProgramBySlug(slug);
  if (!program) notFound();
  const dbCourse = await getDbCourseByCode(program.code);
  return <ProgramDetailView program={program} dbCourse={dbCourse} />;
}
