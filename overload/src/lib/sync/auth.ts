import { getSupabase } from './supabase.js';
import { base } from '$app/paths';
import type { User } from '@supabase/supabase-js';

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

export function onAuthChange(callback: (user: User | null) => void) {
	const supabase = getSupabase();
	const { data } = supabase.auth.onAuthStateChange((_event, session) => {
		const user = session?.user ?? null;
		if (user && !isAllowedEmail(user.email)) {
			supabase.auth.signOut();
			callback(null);
			return;
		}
		callback(user);
	});
	return data.subscription;
}
