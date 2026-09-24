'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LeashedLogo } from '@/components/lms-design-system/LeashedLogo';
import {
  GraduationCap,
  TrendingUp,
  Heart,
  PawPrint,
  User,
  Users,
  Compass,
  ArrowRight,
  ArrowLeft,
  Check,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  Phone,
  Scissors,
  Award,
  Briefcase,
  Home,
} from 'lucide-react';

interface OnboardingFlowProps {
  initialStep?: number;
}

export function OnboardingFlow({ initialStep = 1 }: OnboardingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(initialStep);

  // Form State
  const [fullName, setFullName] = useState('Jane Doe');
  const [email, setEmail] = useState('jane@example.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Step 3 Role
  const [selectedRole, setSelectedRole] = useState<string>('learner');

  // Step 4 Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  // Step 5 Details
  const [dateOfBirth, setDateOfBirth] = useState('2000-01-01');
  const [phone, setPhone] = useState('(555) 123-4567');
  const [educationLevel, setEducationLevel] = useState('Some College');
  const [hearAboutUs, setHearAboutUs] = useState('Shelter / Vet Referral');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);

  // Toggle goal helper
  const toggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  // Map the learner's selected goals to a real lms.courses pathway code.
  // The first matching goal wins (priority order matters).
  const pathwayCodeFromGoals = (goals: string[]): string => {
    if (goals.includes('Become a professional pet groomer')) return 'GRO';
    if (goals.includes('Become a professional dog trainer')) return 'PRT';
    if (goals.includes('Become a pet sitter')) return 'ACA';
    if (goals.includes('Learn business and entrepreneurship')) return 'GSP';
    if (goals.includes('Gain animal care knowledge')) return 'ACA';
    return 'ACA'; // default: Animal Care Assistant (the demo enrollment)
  };

  // Create a real enrollment in lms.enrollments before navigating to the
  // classroom. This bridges the onboarding flow to the live LMS data layer.
  const handleGoToClassroom = async () => {
    setIsEnrolling(true);
    setEnrollmentStatus('Activating your enrollment…');
    try {
      const code = pathwayCodeFromGoals(selectedGoals);
      const resp = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (resp.ok) {
        setEnrollmentStatus('Enrollment confirmed! Opening classroom…');
      } else {
        setEnrollmentStatus('Enrollment already active — opening classroom…');
      }
    } catch {
      setEnrollmentStatus('Opening classroom…');
    }
    // Small delay so the learner sees the confirmation message
    setTimeout(() => router.push('/learn/classroom'), 600);
  };

  const nextStep = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Step 7 complete -> Route to /classroom
      router.push('/learn/classroom');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/');
    }
  };

  const goToStep = (stepNumber: number) => {
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Google sign-in handler (mirrors SignInView pattern).
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          email: 'google.student@leashed.edu',
          name: fullName || 'Google Scholar',
        }),
      });
    } catch {
      // Continue regardless — this is a demo onboarding flow.
    } finally {
      setIsGoogleLoading(false);
      nextStep();
    }
  };

  // Step metadata & photographic assets for left column
  const stepConfig: Record<
    number,
    {
      title: string;
      subtitle: string;
      image: string;
      imageAlt: string;
      tag: string;
    }
  > = {
    1: {
      tag: 'GETTING STARTED GATE',
      title: 'The Enroll Process Starts Here.',
      subtitle:
        'Your journey to a rewarding career in animal care, grooming, and business starts here. Complete our guided admissions gate in minutes.',
      image: '/images/pets_caregiver.jpg',
      imageAlt: 'Golden retriever and caregiver',
    },
    2: {
      tag: 'Get Started',
      title: 'Real Skills. Meaningful Careers.',
      subtitle:
        'Join hundreds of students mastering professional grooming, training, and ethical pet care business operations.',
      image: '/images/laptop_learner.jpg',
      imageAlt: 'Student creating learner account',
    },
    3: {
      tag: 'ROLE PERSONALIZATION',
      title: 'Designed for Every Path.',
      subtitle:
        'Whether you are starting from zero or leading classs, our learning pathways adapt to your professional goals.',
      image: '/images/golden_portrait.jpg',
      imageAlt: 'Companion dog portrait',
    },
    4: {
      tag: 'HANDS-ON CURRICULUM',
      title: 'Hands-On Mastery That Counts.',
      subtitle:
        'Choose your path. 160+ hands-on courses with real-world skills and industry credentials.',
      image: '/images/dog_groomer.jpg',
      imageAlt: 'Hands-on grooming practical demonstration',
    },
    5: {
      tag: 'LEARNER PROFILE',
      title: 'A Supportive Community That Cares.',
      subtitle:
        'Tell us about your background so we can connect you with dedicated mentorship and advisors.',
      image: '/images/health_woman_cat.jpg',
      imageAlt: 'Caregiver with feline friend',
    },
    6: {
      tag: 'APPLICATION REVIEW',
      title: 'Almost There! Confirm Your Details.',
      subtitle:
        'Review your enrollment profile before activating your student account and gaining access to the classroom canvas.',
      image: '/images/job_resume_desk.jpg',
      imageAlt: 'Career profile review desk',
    },
    7: {
      tag: 'ENROLLMENT CONFIRMED',
      title: "You're Ready to Begin!",
      subtitle:
        'Your profile is verified. Access your classroom portal, explore course modules, and meet your class.',
      image: '/images/orange_cat.jpg',
      imageAlt: 'Enrolled student mascot cat',
    },
  };

  const currentMeta = stepConfig[currentStep] || stepConfig[1];

  return (
    <div className="min-h-screen w-full bg-cream text-ink flex flex-col lg:grid lg:grid-cols-2">
      {/* =========================================================================
          LEFT COLUMN: Visual Branding, Atmosphere, Core Pillars, Photography
          ========================================================================= */}
      <aside className="relative bg-[#f5f1e8] border-b lg:border-b-0 lg:border-r border-[#e5dcce] flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden order-2 lg:order-1">
        {/* Ambient background blur */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#e7dbca]/60 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Logo */}
          <div>
            <Link href="/" className="inline-block focus:outline-none rounded-lg">
              <LeashedLogo variant="dark" size="md" />
            </Link>
          </div>

          {/* Heading block */}
          <div className="space-y-2 pt-2">
            <span className="inline-block text-[0.7rem] font-bold tracking-widest text-[#55695a] uppercase">
              {currentMeta.tag}
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink leading-tight">
              {currentMeta.title}
            </h1>
            <p className="text-sm sm:text-base text-[#4f6054] leading-relaxed max-w-lg">
              {currentMeta.subtitle}
            </p>
          </div>

          {/* 4 Core Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-cream/70 border border-[#e8dfd1] backdrop-blur-xs">
              <div className="w-8 h-8 rounded-full bg-ink/10 text-ink flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink">Learn</h4>
                <p className="text-[0.72rem] text-[#5a6b5f] leading-snug">
                  Expert-led training &amp; hands-on practice.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-cream/70 border border-[#e8dfd1] backdrop-blur-xs">
              <div className="w-8 h-8 rounded-full bg-ink/10 text-ink flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink">Grow</h4>
                <p className="text-[0.72rem] text-[#5a6b5f] leading-snug">
                  Build real-world skills and confidence.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-cream/70 border border-[#e8dfd1] backdrop-blur-xs">
              <div className="w-8 h-8 rounded-full bg-ink/10 text-ink flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink">Belong</h4>
                <p className="text-[0.72rem] text-[#5a6b5f] leading-snug">
                  A supportive community that cares.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-cream/70 border border-[#e8dfd1] backdrop-blur-xs">
              <div className="w-8 h-8 rounded-full bg-ink/10 text-ink flex items-center justify-center shrink-0">
                <PawPrint className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink">Build Your Future</h4>
                <p className="text-[0.72rem] text-[#5a6b5f] leading-snug">
                  Turn your passion into a meaningful career.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Image and Signature script */}
        <div className="relative z-10 pt-6 space-y-4">
          <div className="relative h-56 sm:h-72 w-full rounded-2xl overflow-hidden shadow-md border border-[#dfd6c7] bg-[#e4ded3]">
            <Image
              src={currentMeta.image}
              alt={currentMeta.imageAlt}
              fill
              className="object-cover object-center"
              priority
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          {/* Cursive Handwriting Signature */}
          <div className="pt-2">
            {currentStep === 7 ? (
              <p className="font-script text-2xl sm:text-3xl text-gold-deep font-bold flex items-center gap-2">
                <span>Great things start here.</span>
                <PawPrint className="w-5 h-5 text-gold-deep fill-current" />
              </p>
            ) : (
              <p className="font-script text-2xl sm:text-3xl text-gold-deep font-bold flex items-center gap-2">
                <span>Better People. Healthier Pets. Stronger Communities.</span>
                <PawPrint className="w-5 h-5 text-gold-deep fill-current" />
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT COLUMN: Interactive Step Gates & Form Journey
          ========================================================================= */}
      <main className="flex-1 bg-[#fdfbf7] flex flex-col justify-between p-6 sm:p-10 lg:p-14 order-1 lg:order-2 overflow-y-auto">
        <div className="w-full max-w-xl mx-auto space-y-8">
          {/* Top Progress & Navigation Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={prevStep}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5a6b5f] hover:text-ink transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-[#f2ece1]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{currentStep === 1 ? 'Back to Courses' : 'Back'}</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#6a7d70] tracking-wider uppercase">
                  {currentStep} of 7
                </span>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="w-full h-1.5 bg-[#eae2d3] rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-deep transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / 7) * 100}%` }}
              />
            </div>
          </div>

          {/* ===================================================================
              STEP 1: Getting Started — The Enroll Process Starts Here
              =================================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.7rem] font-bold tracking-wider uppercase bg-ink/10 text-ink border border-ink/20">
                  <PawPrint className="w-3 h-3 text-ink" />
                  <span>Getting Started</span>
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                  The Enroll Process Starts Here
                </h2>
                <p className="text-xs sm:text-sm text-[#5a6b5f] leading-relaxed">
                  Your journey to a rewarding career in animal care, grooming, and pet business begins now. Follow this seamless 7-step enrollment sequence to set up your learner profile, confirm your training goals, and unlock your interactive Classroom Canvas.
                </p>
              </div>

              {/* 4 Feature Highlights */}
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#f8f5ee] border border-[#e8ded0] flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#0f1f35] text-[#ebdcc8] flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink">Build Real Skills</h3>
                    <p className="text-[0.72rem] text-[#5a6b5f]">
                      Hands-on practical training with expert animal-care instructors
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f8f5ee] border border-[#e8ded0] flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#0f1f35] text-[#ebdcc8] flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink">Earn Your Credential</h3>
                    <p className="text-[0.72rem] text-[#5a6b5f]">
                      Industry-recognized certifications and job-ready competencies
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f8f5ee] border border-[#e8ded0] flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#0f1f35] text-[#ebdcc8] flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink">Dedicated Support</h3>
                    <p className="text-[0.72rem] text-[#5a6b5f]">
                      1-on-1 mentorship, class advising &amp; interactive AI tutoring
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f8f5ee] border border-[#e8ded0] flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#0f1f35] text-[#ebdcc8] flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink">Create Your Future</h3>
                    <p className="text-[0.72rem] text-[#5a6b5f]">
                      Direct bridge from learning to pet care career &amp; business ownership
                    </p>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-4 space-y-2.5">
                <button
                  onClick={nextStep}
                  className="btn-gold w-full rounded-xl shadow-sm active:scale-[0.99]"
                >
                  <span>Let&apos;s Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-center text-[0.72rem] text-ink-soft">
                  Step 1 of 7 · Approximately 3 minutes · Unlocks Classroom Canvas
                </p>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 2: Create Your Account
              =================================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                  Create Your Account
                </h2>
                <p className="text-xs sm:text-sm text-[#5a6b5f] leading-relaxed">
                  Tell us a little about yourself so we can personalize your learning experience.
                </p>
              </div>

              {/* Continue with Google — above the email/password form */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full py-3 px-4 rounded-xl border border-[#d6ccb9] hover:border-ink/40 bg-cream hover:bg-[#faf7f2] text-ink font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-3 shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isGoogleLoading ? (
                    <span className="text-xs text-[#5a6b5f]">Connecting to Google…</span>
                  ) : (
                    <>
                      {/* Official Google G SVG icon */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                {/* Divider: or */}
                <div className="relative text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#e8dfd1]" />
                  </div>
                  <span className="relative px-3 bg-[#fdfbf7] text-xs text-[#7d9183] font-medium uppercase tracking-wider">
                    or
                  </span>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  nextStep();
                }}
                className="space-y-4 pt-1"
              >
                <div>
                  <label className="block text-xs font-bold text-[#5a6b5f] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6ccb9] bg-cream text-sm text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a6b5f] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6ccb9] bg-cream text-sm text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a6b5f] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6ccb9] bg-cream text-sm text-ink pr-10 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#788a7d] hover:text-ink"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms checkbox */}
                <div className="pt-2 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-ink focus:ring-ink border-[#c5baaa]"
                  />
                  <label htmlFor="terms" className="text-xs text-[#526456] leading-snug">
                    I agree to the{' '}
                    <span className="text-ink font-semibold underline cursor-pointer">
                      Terms of Service
                    </span>{' '}
                    and{' '}
                    <span className="text-ink font-semibold underline cursor-pointer">
                      Privacy Policy
                    </span>
                  </label>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="btn-gold w-full rounded-xl shadow-sm"
                  >
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 text-center text-xs text-[#6a7d70]">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => nextStep()}
                    className="text-ink font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===================================================================
              STEP 3: Confirm Your Role (Learner only — auto-selected)
              =================================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                  You&rsquo;re enrolling as a Learner
                </h2>
                <p className="text-xs sm:text-sm text-[#5a6b5f] leading-relaxed">
                  Your enrollment is set up for a learner profile. You can take courses, earn credentials, and build new hands-on skills.
                </p>
              </div>

              {/* Single Learner Role Card — auto-selected, BLACK border */}
              <div className="pt-1">
                <div
                  className="p-5 rounded-xl border-2 border-ink bg-cream relative flex items-start gap-4 shadow-sm"
                >
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-ink text-on-dark flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-ink/10 text-ink flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm font-bold text-ink">
                      Learner
                    </h3>
                    <p className="text-xs text-[#5a6b5f] leading-snug">
                      I&rsquo;m here to take a course, earn a credential, or build new skills.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={nextStep}
                  className="btn-gold w-full rounded-xl shadow-sm"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 4: What are your learning goals? (Checklist)
              =================================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                  What are your learning goals?
                </h2>
                <p className="text-xs sm:text-sm text-[#5a6b5f] leading-relaxed">
                  Select all that apply. This helps us suggest the best curriculum and resources for you.
                </p>
              </div>

              {/* Multi-select Goal Options */}
              <div className="space-y-2.5 pt-1">
                {[
                  {
                    title: 'Become a professional pet groomer',
                    icon: Scissors,
                  },
                  {
                    title: 'Become a professional dog trainer',
                    icon: Award,
                  },
                  {
                    title: 'Become a pet sitter',
                    icon: Home,
                  },
                  {
                    title: 'Learn business and entrepreneurship',
                    icon: Briefcase,
                  },
                  {
                    title: 'Gain animal care knowledge',
                    icon: Heart,
                  },
                  {
                    title: 'Explore multiple career paths',
                    icon: Compass,
                  },
                ].map((goal) => {
                  const isChecked = selectedGoals.includes(goal.title);
                  const Icon = goal.icon;
                  return (
                    <button
                      key={goal.title}
                      type="button"
                      onClick={() => toggleGoal(goal.title)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'border-ink bg-cream'
                          : 'border-[#dfd6c8] bg-cream hover:bg-[#faf7f2]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-ink/10 text-ink flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-ink">
                          {goal.title}
                        </span>
                      </div>

                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-ink text-on-dark'
                            : 'border border-[#cbbea9] bg-cream'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4">
                <button
                  onClick={nextStep}
                  className="btn-gold w-full rounded-xl shadow-sm"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 5: Tell us about yourself
              =================================================================== */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                  Tell us about yourself
                </h2>
                <p className="text-xs sm:text-sm text-[#5a6b5f] leading-relaxed">
                  A little more information helps us create the best experience for you.
                </p>
              </div>

              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a6b5f] mb-1.5">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6ccb9] bg-cream text-sm text-ink focus:outline-none focus:border-ink"
                      />
                      <Calendar className="w-4 h-4 text-[#788a7d] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5a6b5f] mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6ccb9] bg-cream text-sm text-ink focus:outline-none focus:border-ink"
                      />
                      <Phone className="w-4 h-4 text-[#788a7d] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a6b5f] mb-1.5">
                    Education Level
                  </label>
                  <select
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6ccb9] bg-cream text-sm text-ink focus:outline-none focus:border-ink"
                  >
                    <option>High School / GED</option>
                    <option>Some College</option>
                    <option>Associate Degree</option>
                    <option>Bachelor&apos;s Degree</option>
                    <option>Master&apos;s or Doctorate</option>
                    <option>Other Professional Background</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a6b5f] mb-1.5">
                    How did you hear about us?
                  </label>
                  <select
                    value={hearAboutUs}
                    onChange={(e) => setHearAboutUs(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6ccb9] bg-cream text-sm text-ink focus:outline-none focus:border-ink"
                  >
                    <option>Shelter / Vet Referral</option>
                    <option>Search Engine / Online Search</option>
                    <option>Social Media (Instagram / YouTube / TikTok)</option>
                    <option>Word of Mouth / Colleague</option>
                    <option>Pet Care Industry Event</option>
                    <option>Community Organization</option>
                  </select>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="py-3.5 px-5 rounded-xl border border-[#d6ccb9] bg-cream hover:bg-[#faf7f2] text-ink font-bold text-sm transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-gold flex-1 rounded-xl shadow-sm"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 6: Review Your Information (redesigned — clean card layout)
              =================================================================== */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                  Review Your Information
                </h2>
                <p className="text-xs sm:text-sm text-[#5a6b5f] leading-relaxed">
                  Please confirm your details before we create your account.
                </p>
              </div>

              {/* Review Card — black border, clean typography, no brown/green hovers */}
              <div className="rounded-2xl border-2 border-ink bg-cream overflow-hidden">
                {/* Name row */}
                <div className="flex items-center justify-between p-4 border-b border-ink/10 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-ink/10 text-ink flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[0.65rem] text-[#5a6b5f] uppercase font-bold tracking-wider">
                        Name
                      </span>
                      <span className="text-sm font-bold text-ink truncate block">{fullName}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => goToStep(2)}
                    className="text-xs font-bold text-ink hover:underline shrink-0"
                  >
                    Edit
                  </button>
                </div>

                {/* Email row */}
                <div className="flex items-center justify-between p-4 border-b border-ink/10 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-ink/10 text-ink flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[0.65rem] text-[#5a6b5f] uppercase font-bold tracking-wider">
                        Email
                      </span>
                      <span className="text-sm font-bold text-ink truncate block">{email}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => goToStep(2)}
                    className="text-xs font-bold text-ink hover:underline shrink-0"
                  >
                    Edit
                  </button>
                </div>

                {/* Role row */}
                <div className="flex items-center justify-between p-4 border-b border-ink/10 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-ink/10 text-ink flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[0.65rem] text-[#5a6b5f] uppercase font-bold tracking-wider">
                        Role
                      </span>
                      <span className="text-sm font-bold text-ink capitalize block">
                        {selectedRole.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => goToStep(3)}
                    className="text-xs font-bold text-ink hover:underline shrink-0"
                  >
                    Edit
                  </button>
                </div>

                {/* Learning Goals row */}
                <div className="flex items-center justify-between p-4 border-b border-ink/10 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-ink/10 text-ink flex items-center justify-center shrink-0">
                      <PawPrint className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[0.65rem] text-[#5a6b5f] uppercase font-bold tracking-wider">
                        Learning Goals
                      </span>
                      <span className="text-xs font-bold text-ink line-clamp-2 block">
                        {selectedGoals.length > 0 ? selectedGoals.join(', ') : 'None selected'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => goToStep(4)}
                    className="text-xs font-bold text-ink hover:underline shrink-0"
                  >
                    Edit
                  </button>
                </div>

                {/* Date of Birth row */}
                <div className="flex items-center justify-between p-4 border-b border-ink/10 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-ink/10 text-ink flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[0.65rem] text-[#5a6b5f] uppercase font-bold tracking-wider">
                        Date of Birth
                      </span>
                      <span className="text-sm font-bold text-ink block">{dateOfBirth}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => goToStep(5)}
                    className="text-xs font-bold text-ink hover:underline shrink-0"
                  >
                    Edit
                  </button>
                </div>

                {/* Phone row */}
                <div className="flex items-center justify-between p-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-ink/10 text-ink flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[0.65rem] text-[#5a6b5f] uppercase font-bold tracking-wider">
                        Phone
                      </span>
                      <span className="text-sm font-bold text-ink block">{phone}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => goToStep(5)}
                    className="text-xs font-bold text-ink hover:underline shrink-0"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="py-3.5 px-5 rounded-xl border border-[#d6ccb9] bg-cream hover:bg-[#faf7f2] text-ink font-bold text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-gold flex-1 rounded-xl shadow-sm"
                >
                  <span>Create My Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 7: You're Enrolled! (redesigned — polished celebration layout)
              =================================================================== */}
          {currentStep === 7 && (() => {
            // Derive the pathway name from selected goals for the celebration card.
            const goals = selectedGoals;
            const pathwayName = goals.includes('Become a professional pet groomer')
              ? 'Professional Dog Groomer'
              : goals.includes('Become a professional dog trainer')
                ? 'Professional Dog Trainer'
                : goals.includes('Become a pet sitter')
                  ? 'Professional Pet Sitter'
                  : goals.includes('Learn business and entrepreneurship')
                    ? 'Pet Care Business Ownership'
                    : goals.includes('Gain animal care knowledge')
                      ? 'Animal Care Assistant'
                      : 'Your Chosen Pathway';
            return (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Centered celebration header */}
                <div className="text-center space-y-4 pt-2">
                  <div className="w-16 h-16 rounded-2xl bg-ink text-on-dark flex items-center justify-center shadow-md mx-auto">
                    <PawPrint className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink">
                      You&rsquo;re Enrolled!
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5a6b5f] leading-relaxed max-w-md mx-auto">
                      Your learner profile is ready. Head to your classroom to start your first lesson.
                    </p>
                  </div>
                </div>

                {/* Pathway Card — clean centered layout with black border */}
                <div className="rounded-2xl border-2 border-ink bg-cream p-5 space-y-3">
                  <div className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-wider text-ink">
                    <GraduationCap className="w-4 h-4" />
                    <span>Your Pathway</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-ink leading-snug">
                    {pathwayName}
                  </h3>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded bg-ink/10 text-ink uppercase tracking-wider">
                      Learner
                    </span>
                    <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded bg-ink/10 text-ink uppercase tracking-wider">
                      Account Ready
                    </span>
                    <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded bg-ink/10 text-ink uppercase tracking-wider">
                      Classroom Unlocked
                    </span>
                  </div>
                </div>

                {/* Next Step Hint */}
                <p className="text-center text-xs text-[#5a6b5f] leading-relaxed">
                  Your classroom has your courses, schedule, and support team ready and waiting.
                </p>

                {/* Primary Action — black "Go to Classroom" button */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleGoToClassroom}
                    disabled={isEnrolling}
                    className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-ink hover:bg-ink/90 text-on-dark font-bold text-sm tracking-wide transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isEnrolling ? (
                      <>
                        <span className="w-4 h-4 border-2 border-on-dark/40 border-t-on-dark rounded-full animate-spin" />
                        <span>Activating enrollment…</span>
                      </>
                    ) : (
                      <>
                        <span>Go to Classroom</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  {enrollmentStatus && (
                    <p className="text-center text-[0.72rem] text-emerald-700 font-semibold animate-in fade-in duration-200">
                      ✓ {enrollmentStatus}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Bottom Security Trust Notice */}
          <div className="pt-6 border-t border-gold/25 flex items-center justify-center gap-2 text-center text-[0.75rem] text-[#6f8275]">
            <Lock className="w-3.5 h-3.5 text-[#889b8d]" />
            <span>Your information is safe with us. We use industry-standard security to protect your data.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
