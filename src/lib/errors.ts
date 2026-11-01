import type { Platform } from './types';

/** The platform refused a logged-out request; signing in on that site restores access. */
export class SignInRequiredError extends Error {
	constructor(readonly platform: Platform) {
		super(`${platform} requires sign-in`);
		this.name = 'SignInRequiredError';
	}
}

/** The extension lacks an optional host permission the platform needs; the user must grant it. */
export class PermissionRequiredError extends Error {
	constructor(readonly platform: Platform) {
		super(`${platform} requires host permission`);
		this.name = 'PermissionRequiredError';
	}
}
