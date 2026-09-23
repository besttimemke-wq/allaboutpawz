import { SignInView } from '@/components/lms-design-system/SignInView';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | LEASHED Vocational Academy',
  description: 'Sign in to access your active Classroom Canvas, daily lesson agenda, assignments, and AI instructor.',
};

export default function SignInPage() {
  return <SignInView />;
}
