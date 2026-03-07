import { getSupabase } from './supabase.js';
import { base } from '$app/paths';
import type { User } from '@supabase/supabase-js';

const ALLOWED_EMAILS = ['tacita.om@gmail.com', 'nico.p.morway@gmail.com'];

// Full app origin including the base path, e.g. https://tacita.github.io/lifting-tracker
function appUrl(): string {
	return window.location.origin + base;
}

export function isAllowedEmail(email: string | undefined): boolean {
	if (!email) return false;
	return ALLOWED_EMAILS.includes(email.toLowerCase());
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
