<script lang="ts">
	import { onDestroy } from 'svelte';
	import { workout } from '$lib/stores/workout.js';
	import { formatTimer } from '$lib/utils/format.js';

	let intervalId: ReturnType<typeof setInterval> | null = null;
	let remaining = 0;
	let wakeLock: WakeLockSentinel | null = null;

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
			// #region agent log
			fetch('http://127.0.0.1:7589/ingest/0e413562-a1f0-4ceb-8841-01fe617785fa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59ff68'},body:JSON.stringify({sessionId:'59ff68',runId:'pre-fix',hypothesisId:'H1',location:'RestTimer.svelte:tick',message:'rest timer reached completion threshold',data:{delta,active:restTimer.active,targetEndMs:restTimer.targetEndMs,visibility:typeof document!=='undefined'?document.visibilityState:'unknown'},timestamp:Date.now()})}).catch(()=>{});
			// #endregion
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

	function notifyDone() {
		// #region agent log
		fetch('http://127.0.0.1:7589/ingest/0e413562-a1f0-4ceb-8841-01fe617785fa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59ff68'},body:JSON.stringify({sessionId:'59ff68',runId:'pre-fix',hypothesisId:'H2',location:'RestTimer.svelte:notifyDone',message:'notifyDone entered',data:{visibility:typeof document!=='undefined'?document.visibilityState:'unknown',hasAudioContext:typeof AudioContext!=='undefined',hasVibrate:typeof navigator!=='undefined'&&'vibrate'in navigator},timestamp:Date.now()})}).catch(()=>{});
		// #endregion
		try {
			const ctx = new AudioContext();
			const t = ctx.currentTime;
			// #region agent log
			fetch('http://127.0.0.1:7589/ingest/0e413562-a1f0-4ceb-8841-01fe617785fa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59ff68'},body:JSON.stringify({sessionId:'59ff68',runId:'pre-fix',hypothesisId:'H2',location:'RestTimer.svelte:notifyDone',message:'audio context created',data:{audioState:ctx.state,sampleRate:ctx.sampleRate,currentTime:t},timestamp:Date.now()})}).catch(()=>{});
			// #endregion

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
			// #region agent log
			fetch('http://127.0.0.1:7589/ingest/0e413562-a1f0-4ceb-8841-01fe617785fa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59ff68'},body:JSON.stringify({sessionId:'59ff68',runId:'pre-fix',hypothesisId:'H2',location:'RestTimer.svelte:notifyDone',message:'beep sequence scheduled',data:{freqs,totalDurationMs:freqs.length*250+200,audioState:ctx.state},timestamp:Date.now()})}).catch(()=>{});
			// #endregion
		} catch (error) {
			// #region agent log
			fetch('http://127.0.0.1:7589/ingest/0e413562-a1f0-4ceb-8841-01fe617785fa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59ff68'},body:JSON.stringify({sessionId:'59ff68',runId:'pre-fix',hypothesisId:'H2',location:'RestTimer.svelte:notifyDone',message:'audio setup failed',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now()})}).catch(()=>{});
			// #endregion
			releaseWakeLock();
		}
		if ('vibrate' in navigator) {
			const vibrateResult = navigator.vibrate([150, 80, 150, 80, 150]);
			// #region agent log
			fetch('http://127.0.0.1:7589/ingest/0e413562-a1f0-4ceb-8841-01fe617785fa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59ff68'},body:JSON.stringify({sessionId:'59ff68',runId:'pre-fix',hypothesisId:'H5',location:'RestTimer.svelte:notifyDone',message:'vibrate attempted',data:{vibrateResult},timestamp:Date.now()})}).catch(()=>{});
			// #endregion
		} else {
			// #region agent log
			fetch('http://127.0.0.1:7589/ingest/0e413562-a1f0-4ceb-8841-01fe617785fa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59ff68'},body:JSON.stringify({sessionId:'59ff68',runId:'pre-fix',hypothesisId:'H5',location:'RestTimer.svelte:notifyDone',message:'vibrate unavailable',data:{},timestamp:Date.now()})}).catch(()=>{});
			// #endregion
		}
	}

	onDestroy(() => {
		// #region agent log
		fetch('http://127.0.0.1:7589/ingest/0e413562-a1f0-4ceb-8841-01fe617785fa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59ff68'},body:JSON.stringify({sessionId:'59ff68',runId:'pre-fix',hypothesisId:'H4',location:'RestTimer.svelte:onDestroy',message:'rest timer component destroyed',data:{activeAtDestroy:restTimer?.active??false,targetEndAtDestroy:restTimer?.targetEndMs??null,visibility:typeof document!=='undefined'?document.visibilityState:'unknown'},timestamp:Date.now()})}).catch(()=>{});
		// #endregion
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
