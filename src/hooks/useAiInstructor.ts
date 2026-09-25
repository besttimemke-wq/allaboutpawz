import { useState, useEffect } from 'react';

export interface AiInstructorPersonaRow {
  id: string;
  name: string;
  display_name: string;
  voice_profile: string | null;
  tone_default: string;
  avatar_url: string | null;
  is_co_instructor: boolean | null;
  is_active: boolean | null;
  course_id: string | null;
  course_title: string | null;
  created_at: string;
}

export interface AiPromptTemplateRow {
  id: string;
  template_name: string;
  template_category: string;
  system_prompt: string;
  user_prompt_template: string;
  model_config_id: string | null;
  is_active: boolean | null;
  created_at: string;
}

export function useAiInstructor() {
  const [personas, setPersonas] = useState<AiInstructorPersonaRow[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<AiPromptTemplateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAiInstructor() {
      try {
        const response = await fetch('/api/admin/lms-ai-instructor');
        if (!response.ok) throw new Error('Failed to fetch AI instructor config');
        const data = await response.json();
        setPersonas(data.personas || []);
        setPromptTemplates(data.promptTemplates || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAiInstructor();
  }, []);

  return { personas, promptTemplates, isLoading, error };
}
