// C-069: the app's cold-open decision, made before first paint by an inline script at the top of the /app layout
// (a plain module: a server layout can't read a string exported from a client component).
export const APP_KEY = "cu.opener.app";
export const READY_MS = 1500;

/**
 * A cold open (no session flag yet, motion allowed) gets html.cu-opening(-app); the flag is set right away.
 * The 1.5 s budget starts here, not when the app's JavaScript arrives: if the clip isn't playing by then (a slow
 * connection), the classes go and the opener never starts late (window.__cuOpener: t0, playing, skipped).
 */
export const OPENER_BOOT = `try{var d=document.documentElement;if(!sessionStorage.getItem("${APP_KEY}")){sessionStorage.setItem("${APP_KEY}","1");if(!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("cu-opening","cu-opening-app");var w=window.__cuOpener={t0:Date.now(),playing:false,skipped:false};setTimeout(function(){if(!w.playing){w.skipped=true;d.classList.remove("cu-opening","cu-opening-app")}},${READY_MS})}}}catch(e){}`;
