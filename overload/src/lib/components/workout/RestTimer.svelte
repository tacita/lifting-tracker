<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { workout } from '$lib/stores/workout.js';
	import { formatTimer } from '$lib/utils/format.js';

	let intervalId: ReturnType<typeof setInterval> | null = null;
	let remaining = 0;
	let wakeLock: WakeLockSentinel | null = null;
	let sharedAudioCtx: AudioContext | null = null;
	let audioPrimed = false;

	$: restTimer = $workout.restTimer;

	$: if (restTimer.active && Number.isFinite(restTimer.targetEndMs)) {
		startTicking();
		acquireWakeLock();
	} else {
		stopTicking();
		remaining = 0;
	}

	async function acquireWakeLock() {
		if (wakeLock) return;
		try {
			if ('wakeLock' in navigator) {
				wakeLock = await navigator.wakeLock.request('screen');
				wakeLock.addEventListener('release', () => { wakeLock = null; });
			}
		} catch { /* Wake Lock not available or denied */ }
	}

	async function releaseWakeLock() {
		if (wakeLock) {
			try { await wakeLock.release(); } catch { /* already released */ }
			wakeLock = null;
		}
	}

	function getSharedAudioContext() {
		if (!sharedAudioCtx) sharedAudioCtx = new AudioContext();
		return sharedAudioCtx;
	}

	async function primeAudioFromGesture() {
		if (audioPrimed) return;
		try {
			const ctx = getSharedAudioContext();
			await ctx.resume();
			audioPrimed = ctx.state === 'running';
			// #region agent log
			fetch('http://127.0.0.1:7589/ingest/0e413562-a1f0-4ceb-8841-01fe617785fa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59ff68'},body:JSON.stringify({sessionId:'59ff68',runId:'pre-fix',hypothesisId:'H6',location:'RestTimer.svelte:primeAudioFromGesture',message:'audio primed from user gesture',data:{audioState:ctx.state,audioPrimed},timestamp:Date.now()})}).catch(()=>{});
			// #endregion
		} catch (error) {
			// #region agent log
			fetch('http://127.0.0.1:7589/ingest/0e413562-a1f0-4ceb-8841-01fe617785fa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59ff68'},body:JSON.stringify({sessionId:'59ff68',runId:'pre-fix',hypothesisId:'H6',location:'RestTimer.svelte:primeAudioFromGesture',message:'audio prime failed',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now()})}).catch(()=>{});
			// #endregion
		}
	}

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
		const delta = Number(restTimer.targetEndMs) - Date.now();
		remaining = Math.ceil(delta / 1000);
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
		releaseWakeLock();
	}

	async function notifyDone() {
		try {
			const ctx = getSharedAudioContext();
			if (ctx.state !== 'running') {
				await ctx.resume();
			}
			const t = ctx.currentTime;

			// Three ascending beeps: louder and longer than before
			const freqs = [660, 880, 1100];
			for (let i = 0; i < freqs.length; i++) {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.frequency.value = freqs[i];
				const start = t + i * 0.25;
				gain.gain.setValueAtTime(0.5, start);
				gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
				osc.start(start);
				osc.stop(start + 0.2);
			}

			// Release wake lock after final beep finishes
			setTimeout(() => releaseWakeLock(), freqs.length * 250 + 200);
		} catch {
			releaseWakeLock();
		}
		if ('vibrate' in navigator) navigator.vibrate([150, 80, 150, 80, 150]);
	}

	onMount(() => {
		const prime = () => { primeAudioFromGesture().catch(() => {}); };
		window.addEventListener('pointerdown', prime, { passive: true });
		window.addEventListener('touchstart', prime, { passive: true });
		window.addEventListener('keydown', prime);
		return () => {
			window.removeEventListener('pointerdown', prime);
			window.removeEventListener('touchstart', prime);
			window.removeEventListener('keydown', prime);
		};
	});

	onDestroy(() => {
		stopTicking();
		releaseWakeLock();
	});
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
