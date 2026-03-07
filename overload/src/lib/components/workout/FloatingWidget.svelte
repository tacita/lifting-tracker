<script lang="ts">
	import { workout } from '$lib/stores/workout.js';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { formatTimer } from '$lib/utils/format.js';

	let intervalId: ReturnType<typeof setInterval> | null = null;
	let remaining = 0;

	$: restTimer = $workout.restTimer;
	$: isOnWorkout = $page.url.pathname === '/workout';
	$: show = $workout.session !== null;

	$: if (restTimer.active && restTimer.targetEndMs) {
		if (!intervalId) intervalId = setInterval(tick, 200);
	} else {
		if (intervalId) { clearInterval(intervalId); intervalId = null; }
		remaining = 0;
	}

	function tick() {
		if (!restTimer.targetEndMs) return;
		remaining = Math.ceil((restTimer.targetEndMs - Date.now()) / 1000);
	}

	function adjust(delta: number) {
		workout.update((w) => {
			if (!w.restTimer.targetEndMs) return w;
			return { ...w, restTimer: { ...w.restTimer, targetEndMs: w.restTimer.targetEndMs + delta * 1000 } };
		});
	}

	function endRest() {
		workout.update((w) => ({ ...w, restTimer: { ...w.restTimer, active: false, targetEndMs: null } }));
	}

	$: currentEx = $workout.exercises[$workout.currentExerciseIndex];
</script>

{#if show}
	<div class="floating-widget">
		<div class="inner">
			<div class="info">
				{#if currentEx}
					<span class="ex-name">{currentEx.exerciseName}</span>
				{/if}
				{#if restTimer.active}
					<span class="rest-time" class:overtime={remaining <= 0}>
						Rest {formatTimer(remaining)}
					</span>
				{/if}
			</div>
			{#if restTimer.active}
				<div class="controls">
					<button class="wbtn" on:click={() => adjust(-10)}>−10</button>
					<button class="wbtn wbtn-end" on:click={endRest}>End</button>
					<button class="wbtn" on:click={() => adjust(10)}>+10</button>
				</div>
			{/if}
			{#if !isOnWorkout}
				<a href={`${base}/workout`} class="btn btn-primary goto">Workout ›</a>
			{/if}
		</div>
	</div>
{/if}

<style>
	.floating-widget {
		position: fixed;
		top: calc(var(--safe-top) + 8px);
		left: 8px; right: 8px;
		max-width: 580px;
		margin: 0 auto;
		z-index: 50;
		pointer-events: none;
	}
	.inner {
		background: rgba(28, 31, 41, 0.92);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 10px 14px;
		display: flex;
		align-items: center;
		gap: 10px;
		pointer-events: all;
		backdrop-filter: blur(12px);
		box-shadow: 0 4px 20px rgba(0,0,0,0.4);
	}
	.info { flex: 1; min-width: 0; }
	.ex-name { display: block; font-size: 0.82rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.rest-time { font-size: 1rem; font-weight: 700; color: var(--rest-active); font-variant-numeric: tabular-nums; }
	.rest-time.overtime { color: var(--success); }
	.controls { display: flex; gap: 6px; }
	.wbtn { padding: 6px 10px; border-radius: var(--radius-sm); background: var(--bg-4); border: 1px solid var(--border); color: var(--text); font-size: 0.82rem; font-weight: 600; cursor: pointer; }
	.wbtn-end { color: var(--accent); border-color: var(--accent-dim); background: var(--accent-bg); }
	.goto { padding: 7px 14px; font-size: 0.85rem; flex-shrink: 0; }
</style>
