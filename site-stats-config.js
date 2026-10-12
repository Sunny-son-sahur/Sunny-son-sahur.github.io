// Paste the deployed Cloudflare Worker URL here, ending in /stats.
//
// The original site's counter (simple-games-stats.maylarpp.workers.dev) is
// owned by the previous operator and answers 403 {"error":"Origin not allowed"}
// for this origin, so it is left unset here rather than pointing at a worker
// that will always reject us. Leaving it empty shows "Setup needed" and makes
// no network call at all.
//
// To turn live stats on: deploy a worker that allows this origin, then put its
// URL below. If it ever stops allowing us, site-stats.js detects the failure on
// the first attempt, flips the card to "Setup needed", and stops retrying.
window.simpleGamesStatsEndpoint = '';
