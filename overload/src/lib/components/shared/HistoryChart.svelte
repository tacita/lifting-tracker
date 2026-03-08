<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { WorkoutSet } from '$lib/db/schema.js';
	import { formatDate } from '$lib/utils/format.js';

	export let sets: WorkoutSet[] = [];
	export let exerciseName = '';

	let canvas: HTMLCanvasElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let chart: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let ChartCtor: any;

	$: sortedSets = [...sets]
		.filter((s) => s.reps > 0)
		.sort((a, b) => a.completedAt.localeCompare(b.completedAt));

	$: hasWeight = sortedSets.some((s) => (s.weight ?? 0) > 0);

	$: chartData = {
		labels: sortedSets.map((s) => formatDate(s.completedAt)),
		values: sortedSets.map((s) => (hasWeight ? (s.weight ?? 0) : s.reps))
	};

	async function ensureChart() {
		if (ChartCtor) return;
		const { Chart, registerables } = await import('chart.js');
		Chart.register(...registerables);
		ChartCtor = Chart;
	}

	async function renderChart() {
		if (!canvas) return;
		if (sortedSets.length === 0) {
			chart?.destroy();
			chart = null;
			return;
		}
		await ensureChart();
		chart?.destroy();
		chart = new ChartCtor(canvas, {
			type: 'line',
			data: {
				labels: chartData.labels,
				datasets: [{
					label: hasWeight ? 'Weight (lbs)' : 'Reps',
					data: chartData.values,
					borderColor: '#6c8fff',
					backgroundColor: 'rgba(108,143,255,0.1)',
					borderWidth: 2,
					pointBackgroundColor: '#6c8fff',
					pointRadius: 4,
					tension: 0.3,
					fill: true
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: { legend: { display: false } },
				scales: {
					x: { ticks: { color: '#636b80', font: { size: 11 } }, grid: { color: '#2e3340' } },
					y: { ticks: { color: '#636b80', font: { size: 11 } }, grid: { color: '#2e3340' } }
				}
			}
		});
	}

	onMount(async () => {
		await renderChart();
	});

	onDestroy(() => chart?.destroy());

	$: if (canvas && sortedSets) {
		void renderChart();
	}
</script>

{#if sortedSets.length === 0}
	<p class="empty-state" style="padding:32px">No history yet for {exerciseName}</p>
{:else}
	<div class="chart-wrap">
		<canvas bind:this={canvas}></canvas>
	</div>

	<div class="set-log">
		<div class="set-table">
			<div class="set-row set-header">
				<span class="col-date">Date</span>
				{#if hasWeight}<span class="col-weight">lbs</span>{/if}
				<span class="col-reps">Reps</span>
			</div>
			{#each sortedSets as s, i}
				<div class="set-row" class:alt={i % 2 === 1}>
					<span class="col-date">{formatDate(s.completedAt)}</span>
					{#if hasWeight}<span class="col-weight">{s.weight ?? '–'}</span>{/if}
					<span class="col-reps">{s.reps}</span>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.chart-wrap { height: 220px; position: relative; }
	canvas { width: 100% !important; height: 100% !important; }

	.set-log {
		margin-top: 16px;
		max-height: 300px;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
	.set-table { display: flex; flex-direction: column; }
	.set-row {
		display: flex;
		padding: 6px 0;
		font-size: 0.9rem;
		color: var(--text-primary, #e0e4f0);
	}
	.set-row.set-header {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary, #636b80);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 6px 0 2px;
	}
	.set-row.alt { background: rgba(255, 255, 255, 0.02); }
	.col-date { flex: 1.4; }
	.col-weight { flex: 1; text-align: right; padding-right: 16px; }
	.col-reps { flex: 1; text-align: right; }
</style>
