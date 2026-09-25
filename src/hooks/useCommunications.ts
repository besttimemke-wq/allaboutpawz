import { useState, useEffect } from 'react';

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string | null;
  author_type: string;
  audience_scope: string;
  course_id: string | null;
  course_title: string | null;
  cohort_id: string | null;
  is_published: boolean | null;
  published_at: string | null;
  sticky_until: string | null;
  created_at: string;
}

export interface NotificationQueueRow {
  id: string;
  user_id: string;
  recipient_name: string | null;
  notification_type: string;
  channel: string;
  subject: string | null;
  status: string;
  priority: string;
  scheduled_for: string | null;
  sent_at: string | null;
  retry_count: number | null;
  error_message: string | null;
  created_at: string;
}

export function useCommunications() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationQueueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommunications() {
      try {
        const response = await fetch('/api/admin/lms-communication');
        if (!response.ok) throw new Error('Failed to fetch communications');
        const data = await response.json();
        setAnnouncements(data.announcements || []);
        setNotifications(data.notifications || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCommunications();
  }, []);

  return { announcements, notifications, isLoading, error };
}
