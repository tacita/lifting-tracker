<script lang="ts">
	import { onDestroy } from 'svelte';
	import { workout } from '$lib/stores/workout.js';
	import { formatTimer } from '$lib/utils/format.js';

	let intervalId: ReturnType<typeof setInterval> | null = null;
	let remaining = 0;

	$: restTimer = $workout.restTimer;

	$: if (restTimer.active) { startTicking(); } else { stopTicking(); remaining = 0; }

	function startTicking() {
		if (intervalId) return;
		intervalId = setInterval(tick, 100);
		tick();
	}

	function stopTicking() {
		if (intervalId) { clearInterval(intervalId); intervalId = null; }
	}

	function tick() {
		if (!restTimer.targetEndMs) return;
		remaining = Math.ceil((restTimer.targetEndMs - Date.now()) / 1000);
		if (remaining <= 0) {
			remaining = 0;
			workout.update((w) => ({ ...w, restTimer: { ...w.restTimer, active: false, targetEndMs: null } }));
			notifyDone();
		}
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

	function notifyDone() {
		try {
			const ctx = new AudioContext();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain); gain.connect(ctx.destination);
			osc.frequency.value = 880;
			gain.gain.setValueAtTime(0.3, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
			osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
		} catch { /* unavailable */ }
		if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
	}

	onDestroy(stopTicking);
</script>

{#if restTimer.active}
	<div class="rest-timer" class:overtime={remaining <= 0}>
		<div class="rest-label">Rest</div>
		<div class="rest-time">{formatTimer(remaining)}</div>
		<div class="rest-controls">
			<button class="btn btn-secondary" on:click={() => adjust(-10)}>−10s</button>
			<button class="btn btn-secondary" on:click={endRest}>End Rest</button>
			<button class="btn btn-secondary" on:click={() => adjust(10)}>+10s</button>
		</div>
	</div>
{/if}

<style>
	.rest-timer {
		background: var(--warn-bg);
		border: 1px solid var(--warn);
		border-radius: var(--radius);
		padding: 14px 16px;
		margin: 12px 0;
		text-align: center;
	}
	.rest-timer.overtime { background: var(--success-bg); border-color: var(--success); }
	.rest-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--warn); margin-bottom: 4px; }
	.rest-timer.overtime .rest-label { color: var(--success); }
	.rest-time { font-size: 2.2rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--rest-active); line-height: 1; margin-bottom: 12px; }
	.rest-controls { display: flex; gap: 8px; justify-content: center; }
	.rest-controls .btn { padding: 7px 14px; font-size: 0.85rem; }
</style>
