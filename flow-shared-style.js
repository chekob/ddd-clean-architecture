// flow-shared-styles.js
// Shared styles for all DDD architecture flow diagrams
// Injected as <style type="text/tailwindcss"> so Tailwind CDN processes @apply

const styleEl = document.createElement('style');
styleEl.setAttribute('type', 'text/tailwindcss');
styleEl.textContent = `
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(233,69,96,.4)}50%{box-shadow:0 0 12px rgba(233,69,96,.4)}}
.node-active{animation:pulse .8s ease-in-out infinite;border-color:#e94560!important;box-shadow:0 0 12px rgba(233,69,96,.4)}
.node-visited{@apply opacity-40}
.node{@apply rounded-lg border-2 text-center text-[12px] leading-snug flex flex-col items-center justify-center px-3 py-1.5 whitespace-nowrap;min-width:140px}
.pipe{@apply rounded-xl border-2 border-dashed p-2.5 flex flex-col gap-2 items-center}
.divider{@apply border-t-2 relative mb-4;margin-left:-16px;margin-right:-16px}
.divider span{@apply absolute right-4 text-[12px] font-bold px-2;top:-10px}
.token{@apply w-4 h-4 rounded-full border-2 border-white absolute;background:#e94560;z-index:30;box-shadow:0 0 14px #e94560}

/* Role-based node colors */
.node-object{@apply border-blue-400/80 bg-blue-950/40}
.node-mapper{@apply border-green-400/80 bg-green-950/40}
.node-interface{@apply border-dashed border-yellow-400 bg-yellow-950/30}
.node-impl{@apply border-violet-400/80 bg-violet-950/40}
.node-exception{@apply border-red-500/80 bg-red-950/40}
.node-infra{@apply border-gray-400/60 bg-gray-800/40}
.node-adapter{@apply border-purple-400/80 bg-purple-950/60}
.node-db{@apply border-cyan-500 bg-cyan-950/40}
.node-invariant{@apply border-orange-500/80 bg-orange-950/40}

/* Pipeline box colors */
.pipe-adapter{@apply border-pink-400/50 bg-pink-950/10}
.pipe-domain{@apply border-emerald-400/50 bg-emerald-950/10}
.pipe-infra{@apply border-sky-400/50 bg-sky-950/10}

/* Phase label colors */
.phase-adapter{color:#a78bfa}
.phase-load{color:#38bdf8}
.phase-execute{color:#fb923c}
.phase-save{color:#4ade80}
.phase-return{color:#e879f9}
.phase-error{color:#f87171}
`;
document.head.appendChild(styleEl);

// Shared phase color map
const PHASE_COLORS = {
  adapter: '#a78bfa',
  load: '#38bdf8',
  execute: '#fb923c',
  save: '#4ade80',
  return: '#e879f9',
  error: '#f87171',
};
