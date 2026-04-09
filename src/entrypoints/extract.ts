import { extractPageComments } from '@/extractors/registry';
import type { PageContent } from '@/lib/page-content';
import { Readability } from '@mozilla/readability';

const MAX_ARTICLE_CHARS = 8000;

function extractArticle(): string | undefined {
	try {
		const clone = document.cloneNode(true) as Document;
		const reader = new Readability(clone);
		const article = reader.parse();
		if (!article?.textContent) return undefined;
		const text = article.textContent.trim();
		return text.length > 0 ? text.slice(0, MAX_ARTICLE_CHARS) : undefined;
	} catch {
		return undefined;
	}
}

export default defineUnlistedScript(() => {
	const articleText = extractArticle();
	const pageCommentResult = extractPageComments(window.location.hostname);

	const content: PageContent = {
		articleText,
		comments: pageCommentResult?.comments,
		commentSource: pageCommentResult?.source,
	};

	return content;
});
