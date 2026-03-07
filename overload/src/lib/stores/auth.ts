import { writable } from 'svelte/store';
import type { User } from '@supabase/supabase-js';

export const currentUser = writable<User | null>(null);
export const authLoading = writable(true);
