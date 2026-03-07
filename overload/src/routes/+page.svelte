<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { folders, templates, templateItemsCache, refreshAll, refreshTemplateItems } from '$lib/stores/data.js';
	import { workout, resetWorkout } from '$lib/stores/workout.js';
	import { currentUser, authLoading } from '$lib/stores/auth.js';
	import { createSession, getDraftSession, updateSession } from '$lib/db/sessions.js';
	import { getTemplateItems, getTemplates } from '$lib/db/templates.js';
	import { addFolder, updateFolder, deleteFolder as deleteProgramFolder } from '$lib/db/templates.js';
	import { getExercises } from '$lib/db/exercises.js';
	import { getSetsForSession } from '$lib/db/sessions.js';
	import { now } from '$lib/db/index.js';
	import { signInWithGoogle, signInWithMagicLink } from '$lib/sync/auth.js';
	import { showToast } from '$lib/stores/toasts.js';
	import ProgramAccordion from '$lib/components/programs/ProgramAccordion.svelte';
	import TemplateEditor from '$lib/components/programs/TemplateEditor.svelte';
	import ConfirmModal from '$lib/components/shared/ConfirmModal.svelte';
	import type { Template, TemplateItem } from '$lib/db/schema.js';
	let openFolders = new Set<string>();
	let showEditor = false;
	let showProgramsManager = false;
	let editingTemplate: Template | null = null;
	let editingItems: TemplateItem[] = [];
	let confirmCancel: { show: boolean; cb: (result: boolean) => void } = { show: false, cb: () => {} };
	let signingIn = false;
	let magicEmail = '';
	let showMagicForm = false;
	let newProgramName = '';
	let renameDrafts: Record<string, string> = {};

	$: user = $currentUser;
	$: isAuthLoading = $authLoading;

	// Group templates by folder
	$: folderGroups = (() => {
		const groups: { folder: typeof $folders[0] | null; templates: typeof $templates }[] = [];
		const normalized = (value: string | undefined) => String(value || '').trim().toLowerCase();
		for (const folder of $folders) {
			groups.push({
				folder,
				templates: $templates.filter((t) => {
					if (t.folderId === folder.id) return true;
					// Legacy compatibility: template.folder stores folder name, not folderId
					return !t.folderId && normalized(t.folder) === normalized(folder.name);
				})
			});
		}
		const folderNameSet = new Set($folders.map((f) => normalized(f.name)));
		const unassigned = $templates.filter((t) => !t.folderId && !folderNameSet.has(normalized(t.folder)));
		if (unassigned.length) groups.push({ folder: null, templates: unassigned });
		return groups;
	})();

	function toggleFolder(id: string) {
		const next = new Set(openFolders);
		if (next.has(id)) next.delete(id); else next.add(id);
		openFolders = next;
	}

	async function startWorkout(templateId: string) {
		// Cancel any existing draft
		const draft = await getDraftSession();
		if (draft) {
			const existingSets = await getSetsForSession(draft.id);
			if (existingSets.length === 0) {
				// Empty draft is usually stale navigation state; clear it silently.
				await updateSession(draft.id, { status: 'cancelled', finishedAt: now() });
				resetWorkout();
			} else {
				const confirmed = await showConfirm('Cancel current workout?', 'You have a workout in progress. Cancel it to start a new one?');
				if (!confirmed) return;
				await updateSession(draft.id, { status: 'cancelled', finishedAt: now() });
				resetWorkout();
			}
		}

		const tmpl = $templates.find((t) => t.id === templateId);
		const items = await getTemplateItems(templateId);
		const exList = await getExercises();
		const exMap = new Map(exList.map((e) => [e.id, e]));
		const exByName = new Map(exList.map((e) => [e.name.trim().toLowerCase(), e]));
		const resolveItemExerciseId = (ti: { exerciseId: string }) => {
			const rawId = String(ti.exerciseId);
			if (exMap.has(rawId)) return rawId;
			// Legacy fallback: some old rows stored exercise name instead of id.
			const byName = exByName.get(rawId.trim().toLowerCase());
			return byName?.id;
		};
		const resolvedExerciseIds = items
			.map((ti) => resolveItemExerciseId(ti))
			.filter((id): id is string => Boolean(id));
		const exIds = [...new Set(resolvedExerciseIds)];

		const session = await createSession({
			templateId,
			templateName: tmpl?.name,
			status: 'draft',
			startedAt: now()
		});

		workout.set({
			session,
			exercises: exIds.map((exId) => {
				const ex = exMap.get(exId);
				const item = items.find((ti) => resolveItemExerciseId(ti) === exId);
				const rows = item?.sets ?? 3;
				return {
					exerciseId: exId,
					exerciseName: ex?.name ?? exId,
					note: ex?.note,
					templateItem: item,
					sets: Array.from({ length: rows }, (_, i) => ({ setNumber: i + 1, completed: false }))
				};
			}),
			currentExerciseIndex: 0,
			restTimer: { active: false, targetEndMs: null, durationSeconds: 90 },
			timerPausedAt: null,
			pausedDurationMs: 0
		});

		goto(`${base}/workout`);
	}

	async function startEmptyWorkout() {
		const draft = await getDraftSession();
		if (draft) {
			const existingSets = await getSetsForSession(draft.id);
			if (existingSets.length === 0) {
				await updateSession(draft.id, { status: 'cancelled', finishedAt: now() });
				resetWorkout();
			} else {
				const confirmed = await showConfirm('Cancel current workout?', 'You have a workout in progress. Cancel it?');
				if (!confirmed) return;
				await updateSession(draft.id, { status: 'cancelled', finishedAt: now() });
				resetWorkout();
			}
		}
		const session = await createSession({ status: 'draft', startedAt: now() });
		workout.set({
			session,
			exercises: [],
			currentExerciseIndex: 0,
			restTimer: { active: false, targetEndMs: null, durationSeconds: 90 },
			timerPausedAt: null,
			pausedDurationMs: 0
		});
		goto(`${base}/workout`);
	}

	async function openEditor(template?: Template) {
		editingTemplate = template ?? null;
		editingItems = template ? (await refreshTemplateItems(template.id)) : [];
		showEditor = true;
	}

	async function createProgram() {
		const name = newProgramName.trim();
		if (!name) return;
		await addFolder({ name, sortOrder: $folders.length });
		await refreshAll();
		newProgramName = '';
		showToast('Program created', 'success');
	}

	async function renameProgram(folderId: string) {
		const nextName = (renameDrafts[folderId] ?? '').trim();
		if (!nextName) return;
		await updateFolder(folderId, { name: nextName });
		await refreshAll();
		showToast('Program renamed', 'success');
	}

	async function moveProgram(folderId: string, direction: -1 | 1) {
		const ordered = [...$folders].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
		const idx = ordered.findIndex((f) => f.id === folderId);
		const swapIdx = idx + direction;
		if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
		const current = ordered[idx];
		const swap = ordered[swapIdx];
		await Promise.all([
			updateFolder(current.id, { sortOrder: swap.sortOrder ?? swapIdx }),
			updateFolder(swap.id, { sortOrder: current.sortOrder ?? idx })
		]);
		await refreshAll();
	}

	async function deleteProgram(folderId: string, folderName: string) {
		const confirmed = await showConfirm(
			'Delete program?',
			`Delete "${folderName}"? Workouts inside it will move to "No Program".`
		);
		if (!confirmed) return;
		await deleteProgramFolder(folderId);
		await refreshAll();
		showToast('Program deleted', 'info');
	}

	function handleEditorSaved() {
		showEditor = false;
		editingTemplate = null;
	}

	async function deleteTemplate(template: Template) {
		const confirmed = await showConfirm('Delete workout?', `Delete "${template.name}"? This cannot be undone.`);
		if (!confirmed) return;
		const { deleteTemplate: del } = await import('$lib/db/templates.js');
		await del(template.id);
		await refreshAll();
		showToast('Workout deleted', 'info');
	}

	// Simple confirm helper using a promise
	function showConfirm(title: string, message: string): Promise<boolean> {
		return new Promise((resolve) => {
			confirmCancel = {
				show: true,
				cb: (result: boolean) => {
					confirmCancel = { show: false, cb: () => {} };
					resolve(result);
				}
			};
			confirmTitle = title;
			confirmMessage = message;
		});
	}
	let confirmTitle = '';
	let confirmMessage = '';

	async function googleSignIn() {
		signingIn = true;
		try { await signInWithGoogle(); }
		catch (e) { showToast('Sign-in failed', 'error'); }
		finally { signingIn = false; }
	}

	async function sendMagicLink() {
		signingIn = true;
		try {
			await signInWithMagicLink(magicEmail);
			showToast('Magic link sent! Check your email.', 'success');
			showMagicForm = false;
		} catch (e) {
			showToast((e as Error).message, 'error');
		} finally { signingIn = false; }
	}

</script>

<!-- Confirm modal -->
{#if confirmCancel.show}
	<ConfirmModal
		title={confirmTitle}
		message={confirmMessage}
		danger={true}
		confirmLabel="Yes, proceed"
		onConfirm={() => confirmCancel.cb(true)}
		onCancel={() => confirmCancel.cb(false)}
	/>
{/if}

<!-- Template editor -->
{#if showEditor}
	<div class="modal-overlay" role="dialog" aria-modal="true">
		<div class="modal-sheet">
			<div class="modal-header">
				<h2 class="modal-title">{editingTemplate ? 'Edit Workout' : 'New Workout'}</h2>
				<button class="modal-close btn-ghost" on:click={() => (showEditor = false)}>✕</button>
			</div>
			<TemplateEditor
				template={editingTemplate}
				initialItems={editingItems}
				on:saved={handleEditorSaved}
				on:cancel={() => (showEditor = false)}
			/>
		</div>
	</div>
{/if}

{#if showProgramsManager}
	<div class="modal-overlay" role="dialog" aria-modal="true">
		<div class="modal-sheet">
			<div class="modal-header">
				<h2 class="modal-title">Manage Programs</h2>
				<button class="modal-close btn-ghost" on:click={() => (showProgramsManager = false)}>✕</button>
			</div>

			<div class="form-row-inline">
				<input
					type="text"
					placeholder="New program name"
					bind:value={newProgramName}
					on:keydown={(e) => e.key === 'Enter' && createProgram()}
				/>
				<button class="btn btn-primary" style="flex:0 0 auto" on:click={createProgram}>Add</button>
			</div>

			{#if $folders.length === 0}
				<p class="empty-state" style="padding:24px">No programs yet</p>
			{:else}
				<div class="program-list">
					{#each $folders as folder, i (folder.id)}
						<div class="program-row card">
							<div class="program-top">
								<input
									type="text"
									value={renameDrafts[folder.id] ?? folder.name}
									on:input={(e) => {
										const target = e.currentTarget as HTMLInputElement;
										renameDrafts = { ...renameDrafts, [folder.id]: target.value };
									}}
								/>
								<button class="btn btn-secondary" style="padding:8px 10px;font-size:0.8rem" on:click={() => renameProgram(folder.id)}>Save</button>
							</div>
							<div class="program-actions">
								<button class="btn btn-ghost" on:click={() => moveProgram(folder.id, -1)} disabled={i === 0}>↑</button>
								<button class="btn btn-ghost" on:click={() => moveProgram(folder.id, 1)} disabled={i === $folders.length - 1}>↓</button>
								<button class="btn btn-ghost" style="color:var(--danger)" on:click={() => deleteProgram(folder.id, folder.name)}>Delete</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<div class="page">
	{#if isAuthLoading}
		<div class="auth-gate">
			<div class="auth-logo">Overload</div>
			<p class="auth-sub">Finishing sign-in…</p>
			<div class="auth-loading"></div>
		</div>
	{:else if !user}
		<div class="auth-gate">
			<div class="auth-logo">Overload</div>
			<p class="auth-sub">Track your progressive overload</p>

			<button class="btn btn-primary auth-btn" on:click={googleSignIn} disabled={signingIn}>
				{signingIn ? 'Signing in…' : 'Sign in with Google'}
			</button>

			{#if !showMagicForm}
				<button class="btn btn-secondary auth-btn" on:click={() => (showMagicForm = true)}>
					Sign in with Magic Link
				</button>
			{:else}
				<form on:submit|preventDefault={sendMagicLink} class="magic-form">
					<input type="email" bind:value={magicEmail} placeholder="your@email.com" required />
					<button type="submit" class="btn btn-primary" disabled={signingIn}>
						{signingIn ? 'Sending…' : 'Send Link'}
					</button>
				</form>
			{/if}
		</div>
	{:else}
		<div class="page-header">
			<h1 class="page-title">Workouts</h1>
		</div>

		{#if folderGroups.length === 0}
			<div class="empty-state">
				<p style="font-size:1.5rem">🏋️</p>
				<p>No workouts yet. Create one or import a program.</p>
			</div>
		{/if}

		{#each folderGroups as group}
			{@const fid = group.folder?.id ?? '__none__'}
			<ProgramAccordion
				folder={group.folder}
				templates={group.templates}
				open={openFolders.has(fid)}
				on:start={(e) => startWorkout(e.detail.templateId)}
				on:edit={(e) => openEditor(e.detail.template)}
				on:delete={(e) => deleteTemplate(e.detail.template)}
			/>
		{/each}

		<div class="workout-controls-row">
			<button class="btn btn-secondary" on:click={startEmptyWorkout}>
				Start Empty Workout
			</button>
			<button class="btn btn-secondary" on:click={() => (showProgramsManager = true)} title="Manage programs">
				Manage Programs
			</button>
			<button class="btn btn-primary" on:click={() => openEditor()}>+ New</button>
		</div>
	{/if}
</div>

<style>
	.auth-gate {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 70dvh;
		gap: 14px;
		padding: 24px;
		text-align: center;
	}
	.auth-logo { font-size: 2.4rem; font-weight: 800; letter-spacing: -0.03em; }
	.auth-sub { color: var(--text-3); margin-bottom: 8px; }
	.auth-btn { width: 100%; max-width: 280px; }
	.magic-form { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 280px; }
	.auth-loading {
		width: 24px;
		height: 24px;
		border: 3px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	.workout-controls-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		margin-top: 14px;
	}
	.workout-controls-row .btn {
		width: 100%;
	}
	.program-list { display: flex; flex-direction: column; gap: 8px; }
	.program-row { padding: 10px; }
	.program-top { display: flex; gap: 8px; }
	.program-actions { display: flex; justify-content: flex-end; gap: 4px; margin-top: 8px; }
</style>
