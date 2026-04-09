import type { ExtractedComment } from '@/lib/page-content';

export interface CommentExtractor {
  hostnames: string[];
  extract(): ExtractedComment[];
}
