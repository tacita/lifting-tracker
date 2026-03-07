import { getSupabase } from './supabase.js';
import { base } from '$app/paths';
import type { AuthChangeEvent, User } from '@supabase/supabase-js';

const ALLOWED_EMAILS = ['tacita.om@gmail.com', 'nico.p.morway@gmail.com'];
const ALLOWED_EMAILS_NORMALIZED = new Set(ALLOWED_EMAILS.map(normalizeEmail));

function normalizeEmail(email: string): string {
	const cleaned = email.trim().toLowerCase();
	const [localPart, domainPart] = cleaned.split('@');
	if (!localPart || !domainPart) return cleaned;

	// Gmail aliases can vary by dots and +suffix, while representing same inbox.
	if (domainPart === 'gmail.com' || domainPart === 'googlemail.com') {
		const localCanonical = localPart.split('+')[0].replace(/\./g, '');
		return `${localCanonical}@gmail.com`;
	}

	return `${localPart}@${domainPart}`;
}

// Full app origin including the base path, e.g. https://tacita.github.io/lifting-tracker
function appUrl(): string {
	return window.location.origin + base;
}

export function isAllowedEmail(email: string | undefined): boolean {
	if (!email) return false;
	return ALLOWED_EMAILS_NORMALIZED.has(normalizeEmail(email));
}

export async function signInWithGoogle(): Promise<void> {
	const supabase = getSupabase();
	const { error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: { redirectTo: appUrl() }
	});
	if (error) throw error;
}

export async function signInWithMagicLink(email: string): Promise<void> {
	if (!isAllowedEmail(email)) {
		throw new Error('This email is not authorized to use Overload.');
	}
	const supabase = getSupabase();
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: { emailRedirectTo: appUrl() }
	});
	if (error) throw error;
}

export async function signOut(): Promise<void> {
	const supabase = getSupabase();
	await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
	const supabase = getSupabase();
	const { data } = await supabase.auth.getUser();
	const user = data.user ?? null;
	if (user?.email && !isAllowedEmail(user.email)) {
		await supabase.auth.signOut();
		return null;
	}
	return user;
}

export async function settleCurrentUser(options?: { attempts?: number; delayMs?: number }): Promise<User | null> {
	const supabase = getSupabase();
	const attempts = options?.attempts ?? 8;
	const delayMs = options?.delayMs ?? 250;

	for (let i = 0; i < attempts; i++) {
		const { data } = await supabase.auth.getSession();
		const user = data.session?.user ?? null;
		if (user) {
			if (user.email && !isAllowedEmail(user.email)) {
				await supabase.auth.signOut();
				return null;
			}
			return user;
		}
		if (i < attempts - 1) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
	return null;
}

export function onAuthChange(callback: (user: User | null, event: AuthChangeEvent) => void) {
	const supabase = getSupabase();
	const { data } = supabase.auth.onAuthStateChange((event, session) => {
		const user = session?.user ?? null;
		// Only enforce allowlist when we have a concrete email.
		// During some mobile auth transitions, user objects can be transient.
		if (user?.email && !isAllowedEmail(user.email)) {
			supabase.auth.signOut();
			callback(null, 'SIGNED_OUT');
			return;
		}
		callback(user, event);
	});
	return data.subscription;
}
