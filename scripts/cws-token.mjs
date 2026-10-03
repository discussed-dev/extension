// Mint a Chrome Web Store refresh token via the loopback redirect flow
// (Google retired the urn:ietf:wg:oauth:2.0:oob flow that publish-extension init uses).
// Never prints secrets.
//   node scripts/cws-token.mjs .env.submit mint          open the printed URL, consent; writes CHROME_REFRESH_TOKEN
//   node scripts/cws-token.mjs .env.submit check         verify id + secret + token together
//   node scripts/cws-token.mjs .env.submit check client  verify id + secret only (expect invalid_grant)
import fs from 'node:fs';
import http from 'node:http';

const [envPath, mode = 'check'] = process.argv.slice(2);
const raw = fs.readFileSync(envPath, 'utf8');
const get = (k) => {
	const m = raw.match(new RegExp(`^${k}=(.*)$`, 'm'));
	return m ? m[1].trim().replace(/^"(.*)"$/, '$1') : '';
};
const clientId = get('CHROME_CLIENT_ID');
const clientSecret = get('CHROME_CLIENT_SECRET');
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function exchange(params) {
	const res = await fetch(TOKEN_URL, { method: 'POST', body: new URLSearchParams(params) });
	return res.json();
}

if (mode === 'check') {
	const token = get('CHROME_REFRESH_TOKEN');
	const probe = process.argv[4] === 'client' ? 'bogus' : token;
	const r = await exchange({
		grant_type: 'refresh_token',
		refresh_token: probe,
		client_id: clientId,
		client_secret: clientSecret,
	});
	console.log(
		r.access_token ? 'OK: access_token issued' : `ERROR: ${r.error} (${r.error_description ?? ''})`,
	);
} else {
	const server = http.createServer();
	server.listen(0, '127.0.0.1', () => {
		const redirect = `http://127.0.0.1:${server.address().port}`;
		const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
		url.search = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirect,
			response_type: 'code',
			scope: 'https://www.googleapis.com/auth/chromewebstore',
			access_type: 'offline',
			prompt: 'consent',
		}).toString();
		console.log(`OPEN THIS URL:\n${url}`);
		server.on('request', async (req, res) => {
			const code = new URL(req.url, redirect).searchParams.get('code');
			const err = new URL(req.url, redirect).searchParams.get('error');
			if (!code) {
				res.end(`No code (${err ?? 'unknown'}). You can close this tab.`);
				console.log(`ERROR: ${err ?? 'no code'}`);
				server.close();
				return;
			}
			const r = await exchange({
				grant_type: 'authorization_code',
				code,
				redirect_uri: redirect,
				client_id: clientId,
				client_secret: clientSecret,
			});
			if (!r.refresh_token) {
				res.end('Token exchange failed. See terminal.');
				console.log(`ERROR: ${r.error} (${r.error_description ?? ''})`);
			} else {
				const next = raw.replace(
					/^CHROME_REFRESH_TOKEN=.*$/m,
					`CHROME_REFRESH_TOKEN="${r.refresh_token}"`,
				);
				fs.writeFileSync(envPath, next);
				res.end('Done. Refresh token saved. You can close this tab.');
				console.log('OK: new refresh token written to .env.submit');
			}
			server.close();
		});
	});
}
