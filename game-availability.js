// Temporarily withdraw these games without deleting their saved preferences.
const unavailableGames = new Set(['/worldguessr/', '/2d-fortnite/', '/thorns-and-ballons/', '/drift-hunters-pro/', '/moto-x3m/', '/snek-io/', '/house-painter/', '/tap-tap-shots/', '/drift-king/', '/8-ball-pool-billiard/', '/fast-food-rush/', '/football-legends/']);
document.querySelectorAll('.game-card').forEach(card => {
  const link = card.querySelector('a');
  if (link && unavailableGames.has(sitePath(link.href))) card.remove();
});
