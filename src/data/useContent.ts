import { useEffect, useState } from 'react';
import { fetchContent } from './api';
import { fallbackContent, type Content } from './content';

/**
 * Starts from the bundled data so the page never renders empty, then swaps in
 * what is stored in Neon. If the API is unreachable the bundled data stays.
 */
export function useContent(): Content {
  const [content, setContent] = useState<Content>(fallbackContent);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchContent(ctrl.signal)
      .then(setContent)
      .catch((err: unknown) => {
        if (!ctrl.signal.aborted) console.warn('Showing bundled content:', err);
      });
    return () => ctrl.abort();
  }, []);

  return content;
}
