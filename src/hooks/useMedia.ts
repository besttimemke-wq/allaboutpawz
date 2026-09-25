import { useState, useEffect } from 'react';

export interface MediaAssetRow {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  file_name: string;
  file_extension: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  storage_path: string;
  public_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  is_accessible: boolean | null;
  is_published: boolean | null;
  created_at: string;
}

export function useMedia() {
  const [media, setMedia] = useState<MediaAssetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMedia() {
      try {
        const response = await fetch('/api/admin/lms-media');
        if (!response.ok) throw new Error('Failed to fetch media assets');
        const data = await response.json();
        setMedia(data.media || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMedia();
  }, []);

  return { media, isLoading, error };
}
