import type { ExtractedComment } from '@/lib/page-content';
import type { CommentExtractor } from './types';
import { guardianExtractor } from './guardian';
import { nytExtractor } from './nyt';
import { substackExtractor } from './substack';
import { wsjExtractor } from './wsj';

const EXTRACTORS: CommentExtractor[] = [
  guardianExtractor,
  nytExtractor,
  wsjExtractor,
  substackExtractor,
];

export function extractPageComments(
  hostname: string,
): { comments: ExtractedComment[]; source: string } | undefined {
  for (const extractor of EXTRACTORS) {
    if (extractor.hostnames.some((h) => hostname === h || hostname.endsWith(`.${h}`))) {
      try {
        const comments = extractor.extract();
        return comments.length > 0 ? { comments, source: hostname } : undefined;
      } catch {
        return undefined;
      }
    }
  }

  if (hostname.endsWith('.substack.com')) {
    try {
      const comments = substackExtractor.extract();
      return comments.length > 0 ? { comments, source: hostname } : undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
}
