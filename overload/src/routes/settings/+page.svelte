<script lang="ts">
	import { currentUser } from '$lib/stores/auth.js';
	import { syncStatus } from '$lib/stores/sync.js';
	import { signOut, signInWithGoogle, signInWithMagicLink } from '$lib/sync/auth.js';
	import { syncNow } from '$lib/sync/engine.js';
	import { showToast } from '$lib/stores/toasts.js';
	import ConfirmModal from '$lib/components/shared/ConfirmModal.svelte';
	import { exportAll, downloadJson, importWorkoutPrograms } from '$lib/utils/importExport.js';
	import { refreshAll } from '$lib/stores/data.js';
	import { getDB } from '$lib/db/index.js';
	import { formatDateTime } from '$lib/utils/format.js';

	$: user = $currentUser;
	$: sync = $syncStatus;

	let showClearConfirm = false;
	let syncing = false;
	let magicEmail = '';
	let showMagicForm = false;
	let signingIn = false;
	let importInput: HTMLInputElement;
	let historyInput: HTMLInputElement;

	// Theme
	let darkMode = true; // always dark for now, theme toggle placeholder

	async function handleSyncNow() {
		syncing = true;
		try {
			await syncNow();
			await refreshAll();
			showToast('Pulled latest cloud data ✓', 'success');
		}
		catch { showToast('Sync failed', 'error'); }
		finally { syncing = false; }
	}

	async function handleExportAll() {
		try {
			const data = await exportAll();
			downloadJson(data, `overload-backup-${new Date().toISOString().slice(0, 10)}.json`);
			showToast('Exported', 'success');
		} catch { showToast('Export failed', 'error'); }
	}

	async function handleImportWorkouts(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			await importWorkoutPrograms(JSON.parse(text));
			showToast('Imported', 'success');
		} catch { showToast('Import failed — check file format', 'error'); }
	}

	async function handleClearData() {
		const db = await getDB();
		for (const store of ['exercises', 'folders', 'templates', 'templateItems', 'sessions', 'sets'] as const) {
			await db.clear(store);
		}
		await refreshAll();
		showToast('All local data cleared', 'warn');
		showClearConfirm = false;
	}

	async function handleSignOut() {
		await signOut();
		showToast('Signed out', 'info');
	}

	async function googleSignIn() {
		signingIn = true;
		try { await signInWithGoogle(); }
		catch { showToast('Sign-in failed', 'error'); }
		finally { signingIn = false; }
	}

	async function sendMagicLink() {
		signingIn = true;
		try {
			await signInWithMagicLink(magicEmail);
			showToast('Magic link sent! Check your email.', 'success');
			showMagicForm = false;
		} catch (e) { showToast((e as Error).message, 'error'); }
		finally { signingIn = false; }
	}
</script>

{#if showClearConfirm}
	<ConfirmModal
		title="Clear all local data?"
		message="This deletes all exercises, workouts, and history from this device. Cloud data is not affected if you are signed in."
		danger={true}
		confirmLabel="Clear Everything"
		onConfirm={handleClearData}
		onCancel={() => (showClearConfirm = false)}
	/>
{/if}

<input type="file" accept=".json" bind:this={importInput} style="display:none" on:change={handleImportWorkouts} />

<div class="page">
	<h1 class="page-title" style="margin-bottom:20px">Settings</h1>

	<!-- Account -->
	<section class="section">
		<p class="section-title">Account</p>
		{#if user}
			<div class="card" style="margin-bottom:10px">
				<p class="setting-label">Signed in as</p>
				<p class="setting-value">{user.email}</p>
			</div>
			<div style="display:flex;gap:8px;flex-wrap:wrap">
				<button class="btn btn-secondary" on:click={handleSignOut}>Sign Out</button>
			</div>
		{:else}
			<div style="display:flex;flex-direction:column;gap:10px">
				<button class="btn btn-primary" on:click={googleSignIn} disabled={signingIn}>
					{signingIn ? 'Signing in…' : 'Sign in with Google'}
				</button>
				{#if !showMagicForm}
					<button class="btn btn-secondary" on:click={() => (showMagicForm = true)}>Magic Link</button>
				{:else}
					<form on:submit|preventDefault={sendMagicLink} style="display:flex;flex-direction:column;gap:8px">
						<input type="email" bind:value={magicEmail} placeholder="your@email.com" required />
						<button type="submit" class="btn btn-primary" disabled={signingIn}>
							{signingIn ? 'Sending…' : 'Send Magic Link'}
						</button>
					</form>
				{/if}
			</div>
		{/if}
	</section>

	<div class="divider"></div>

	<!-- Sync -->
	<section class="section">
		<p class="section-title">Sync</p>
		<div class="card" style="margin-bottom:10px">
			<p class="setting-label">Status</p>
			<p class="setting-value" class:err={sync.status === 'error'} class:ok={sync.status === 'ok'}>
				{sync.status === 'syncing' ? 'Syncing…'
				: sync.status === 'ok' ? `Synced${sync.lastSyncedAt ? ' · ' + formatDateTime(sync.lastSyncedAt) : ''}`
				: sync.status === 'error' ? `Error: ${sync.error ?? 'Unknown'}`
				: 'Idle'}
			</p>
		</div>
		<button class="btn btn-secondary" on:click={handleSyncNow} disabled={syncing || !user}>
			{syncing ? 'Syncing…' : 'Sync Now'}
		</button>
	</section>

	<div class="divider"></div>

	<!-- Data -->
	<section class="section">
		<p class="section-title">Data</p>
		<div style="display:flex;flex-direction:column;gap:10px">
			<button class="btn btn-secondary" on:click={handleExportAll}>Export All Data (JSON)</button>
			<button class="btn btn-secondary" on:click={() => importInput.click()}>Import Workout Programs</button>
		</div>
	</section>

	<div class="divider"></div>

	<!-- Danger zone -->
	<section class="section">
		<p class="section-title" style="color:var(--danger)">Danger Zone</p>
		<button class="btn btn-danger" on:click={() => (showClearConfirm = true)}>
			Clear All Local Data
		</button>
	</section>
</div>

<style>
	.section { margin-bottom: 4px; }
	.setting-label { font-size: 0.75rem; color: var(--text-3); margin-bottom: 2px; }
	.setting-value { font-size: 0.95rem; font-weight: 500; }
	.setting-value.ok { color: var(--success); }
	.setting-value.err { color: var(--danger); }
</style>
