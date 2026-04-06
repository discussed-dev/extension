type BadgePayload = {
	tabId: number;
	text?: string;
	color?: string;
};

type ToolbarActionApi = {
	setBadgeText: (details: { tabId: number; text: string }) => Promise<void>;
	setBadgeBackgroundColor: (details: { tabId: number; color: string }) => Promise<void>;
};

type ToolbarActionSource = {
	action?: unknown;
	browserAction?: unknown;
};

function isToolbarActionApi(value: unknown): value is ToolbarActionApi {
	return (
		typeof value === 'object' &&
		value !== null &&
		'setBadgeText' in value &&
		typeof value.setBadgeText === 'function' &&
		'setBadgeBackgroundColor' in value &&
		typeof value.setBadgeBackgroundColor === 'function'
	);
}

export function getToolbarActionApi(api: ToolbarActionSource = browser): ToolbarActionApi {
	if (isToolbarActionApi(api.action)) return api.action;
	if (isToolbarActionApi(api.browserAction)) return api.browserAction;
	throw new Error('No toolbar action API available');
}

export async function setToolbarBadge(
	api: ToolbarActionSource,
	{ tabId, text, color }: BadgePayload,
): Promise<void> {
	const toolbarAction = getToolbarActionApi(api);
	if (text != null) {
		await toolbarAction.setBadgeText({ tabId, text });
	}
	if (color != null) {
		await toolbarAction.setBadgeBackgroundColor({ tabId, color });
	}
}
