'use client';

// Learn Courses — the tree's standalone LMS entry (the same account is the
// learner: /learn carries the full Learning Center).
import { GraduationCap } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

export default function LearnCoursesPage() {
  return (
    <PortalEmptyState
      icon={GraduationCap}
      title="Learn Courses"
      description="Group classes and private lessons for every age — from puppy socialization to advanced manners."
      cta={{ label: 'Explore Classes', href: '/learn' }}
    />
  );
}
