<script lang="ts">
	import { base } from '$app/paths';
	import { sessions as sessionsStore, refreshSessions } from '$lib/stores/data.js';
	import { getSetsForSession } from '$lib/db/sessions.js';
	import type { Session, WorkoutSet } from '$lib/db/schema.js';
	import { formatDate, formatDuration, formatWeight } from '$lib/utils/format.js';
	import { onMount } from 'svelte';
	import { currentUser, authLoading } from '$lib/stores/auth.js';
	import { get } from 'svelte/store';

	$: user = $currentUser;
	$: isAuthLoading = $authLoading;

	onMount(() => {
		if (get(currentUser)) refreshSessions();
	});

	$: if (user) {
		refreshSessions();
	}

	let expanded = new Set<string>();
	let sessionSets: Record<string, WorkoutSet[]> = {};

	async function toggle(id: string) {
		if (!user) return;
		const next = new Set(expanded);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
			if (!sessionSets[id]) sessionSets[id] = await getSetsForSession(id);
		}
		expanded = next;
		sessionSets = sessionSets;
	}

	// Group sets by exercise within a session
	function groupByExercise(sets: WorkoutSet[]) {
		const map = new Map<string, { name: string; sets: WorkoutSet[] }>();
		for (const s of sets) {
			if (!map.has(s.exerciseId)) map.set(s.exerciseId, { name: s.exerciseName, sets: [] });
			map.get(s.exerciseId)!.sets.push(s);
		}
		return [...map.values()];
	}
</script>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">History</h1>
	</div>

	{#if isAuthLoading}
		<div class="empty-state">
			<p style="font-size:1.5rem">⏳</p>
			<p>Checking your account…</p>
		</div>
	{:else if !user}
		<div class="empty-state">
			<p style="font-size:1.5rem">🔒</p>
			<p>Sign in to view your workout history.</p>
			<a class="btn btn-primary" href={`${base}/`}>Go to sign in</a>
		</div>
	{:else if $sessionsStore.length === 0}
		<div class="empty-state">
			<p style="font-size:1.5rem">📈</p>
			<p>No completed workouts yet</p>
		</div>
	{:else}
		<div class="history-list">
			{#each $sessionsStore as session (session.id)}
				<div class="session-card card">
					<button class="session-header" on:click={() => toggle(session.id)}>
						<div class="session-info">
							<span class="session-date">{formatDate(session.startedAt)}</span>
							<span class="session-name">{session.templateName ?? 'Free Workout'}</span>
						</div>
						<div class="session-meta">
							{#if session.durationSeconds}<span>{formatDuration(session.durationSeconds)}</span>{/if}
							<span class="chevron" class:rot={expanded.has(session.id)}>›</span>
						</div>
					</button>

					{#if expanded.has(session.id)}
						<div class="session-body">
							{#if !sessionSets[session.id]}
								<p style="color:var(--text-3);font-size:0.85rem;padding:12px">Loading…</p>
							{:else if sessionSets[session.id].length === 0}
								<p style="color:var(--text-3);font-size:0.85rem;padding:12px">No sets logged</p>
							{:else}
								{#each groupByExercise(sessionSets[session.id]) as group}
									<div class="ex-group">
										<p class="ex-group-name">{group.name}</p>
									<div class="sets-list">
										{#each group.sets as s, idx}
											<div class="set-line">
												<span class="set-num">{idx + 1}</span>
												{#if s.weight}<span class="set-val">{formatWeight(s.weight)} lbs</span>{/if}
												<span class="set-val">{s.reps} reps</span>
											</div>
										{/each}
									</div>
									</div>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.history-list { display: flex; flex-direction: column; gap: 8px; }
	.session-card { padding: 0; overflow: hidden; }
	.session-header { width: 100%; display: flex; align-items: center; padding: 14px; gap: 10px; text-align: left; }
	.session-info { flex: 1; }
	.session-date { display: block; font-size: 0.8rem; color: var(--text-3); }
	.session-name { display: block; font-size: 0.95rem; font-weight: 600; margin-top: 2px; }
	.session-meta { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--text-3); flex-shrink: 0; }
	.chevron { font-size: 1.1rem; transition: transform 0.2s; }
	.chevron.rot { transform: rotate(90deg); }
	.session-body { border-top: 1px solid var(--border); padding: 12px 14px; }
	.ex-group { margin-bottom: 10px; }
	.ex-group:last-child { margin-bottom: 0; }
	.ex-group-name { font-size: 0.82rem; font-weight: 600; color: var(--text-2); margin-bottom: 6px; }
	.sets-list { display: flex; flex-direction: column; gap: 2px; }
	.set-line {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 3px 0;
		font-size: 0.82rem;
		font-variant-numeric: tabular-nums;
	}
	.set-num {
		width: 20px;
		text-align: center;
		color: var(--text-3);
		font-size: 0.75rem;
		flex-shrink: 0;
	}
	.set-val { color: var(--text-1); }
</style>
