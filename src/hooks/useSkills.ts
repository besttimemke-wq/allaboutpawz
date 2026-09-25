import { useState, useEffect } from 'react';

export interface SkillRow {
  id: string;
  skill_domain_id: string;
  name: string;
  slug: string;
  is_core: boolean | null;
  created_at: string;
}

export interface SkillSignoffRow {
  id: string;
  learner_user_id: string;
  learner_name: string | null;
  skill_id: string;
  skill_name: string | null;
  course_id: string | null;
  signoff_level: string;
  signoff_method: string;
  verified_at: string | null;
  evidence_url: string | null;
  notes: string | null;
}

export interface CredentialRow {
  id: string;
  learner_user_id: string;
  learner_name: string | null;
  course_id: string | null;
  credential_type: string;
  title: string;
  issuer_name: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  verification_code: string;
  revoked_at: string | null;
  certificate_url: string | null;
}

export interface BadgeRow {
  id: string;
  name: string;
  slug: string;
  badge_type: string;
  points_value: number | null;
  is_active: boolean | null;
  created_at: string;
}

export function useSkills() {
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [skillSignoffs, setSkillSignoffs] = useState<SkillSignoffRow[]>([]);
  const [credentials, setCredentials] = useState<CredentialRow[]>([]);
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSkills() {
      try {
        const response = await fetch('/api/admin/lms-skills');
        if (!response.ok) throw new Error('Failed to fetch skills registry');
        const data = await response.json();
        setSkills(data.skills || []);
        setSkillSignoffs(data.skillSignoffs || []);
        setCredentials(data.credentials || []);
        setBadges(data.badges || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSkills();
  }, []);

  return { skills, skillSignoffs, credentials, badges, isLoading, error };
}
