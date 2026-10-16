import 'server-only';

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';

export interface PublishedExamination {
  id: string;
  name: string;
  year: number;
  result_notice: string | null;
}

interface PublicHomeData {
  publishedExam: PublishedExamination | null;
  queryFailed: boolean;
}

const readPublishedExamination = unstable_cache(
  async (): Promise<PublishedExamination | null> => {
    const { data, error } = await createPublicClient()
      .from('examinations')
      .select('id, name, year, result_notice')
      .eq('status', 'PUBLISHED')
      .order('year', { ascending: false })
      .order('publication_date', { ascending: false })
      .limit(1);

    if (error) throw new Error('PUBLIC_QUERY_FAILED');
    return data?.[0] ?? null;
  },
  ['public-home-published-examination-v1'],
  { revalidate: 60, tags: ['examinations'] }
);

/**
 * Reads the newest public examination from the server cache. Normal publish,
 * unpublish, edit, and delete actions invalidate the shared examinations tag.
 */
export async function getPublicHomeData(): Promise<PublicHomeData> {
  try {
    return { publishedExam: await readPublishedExamination(), queryFailed: false };
  } catch {
    console.warn('[Public Examination Query]', { code: 'NETWORK_ERROR' });
    return { publishedExam: null, queryFailed: true };
  }
}
