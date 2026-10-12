# October 6 game batch

Added 21 requested games. Library contains 51 cards, of which six remain intentionally hidden: 45 visible games. Five further games are needed for 50 visible games.

New games use the catalog's direct game URLs instead of its ad/navigation shell. All 21 URLs returned HTTP 200 and no explicit X-Frame-Options/Content-Security-Policy embedding prohibition when checked.

The shared player and new standalone wrappers have iframe sandbox restrictions: scripts, original-origin storage, forms, pointer lock, orientation lock, and presentation are allowed; pop-up windows and top-level navigation are not. Embedded provider ads or notices can still appear inside their game. No bypassing of browser protections is used.

The shared player fills the viewport with a black outer background. Added a fullscreen control; support depends on the browser. The sidebar no longer overlays games.

Browser checks: library count/search/favorites/rating controls present; Pac-Man, Cookie Clicker, Football Legends reached game screens. This is a smoke test, not a claim that every game was fully played. Remaining games need individual gameplay and fullscreen checks on the user's browser.

- Snow Rider 3D: https://classroomlesson.github.io/basic-ruffle-player/html/snow_rider_3d/index.html
- Cookie Clicker: https://classroomlesson.github.io/basic-ruffle-player/html/cookie_clicker/index.html
- 1v1.LOL: https://classroomlesson.github.io/basic-ruffle-player/html/1v1lol/index.html
- Dune: https://classroomlesson.github.io/basic-ruffle-player/html/dune/index.html
- Doge Miner: https://classroomlesson.github.io/basic-ruffle-player/html/doge_miner/index.html
- Rooftop Snipers: https://classroomlesson.github.io/basic-ruffle-player/html/rooftop_snipers/index.html
- House Painter: https://db2.duckmath.org/2023/construct/238/house-painter/index.html
- Tap Tap Shots: https://db2.duckmath.org/2023/q/1/tap-tap-shots/index.html
- Blocky Puzzle: https://classroomlesson.github.io/basic-ruffle-player/html/blocky_puzzle/index.html
- Backrooms: https://classroomlesson.github.io/basic-ruffle-player/html/backroomsv1.5/index.html
- Drift King: https://db2.duckmath.org/2024/unity/drift-king/index.html
- Granny: https://classroomlesson.github.io/basic-ruffle-player/html/granny/index.html
- President Simulator: https://classroomlesson.github.io/basic-ruffle-player/html/president_simulator/index.html
- Pac-Man: https://classroomlesson.github.io/basic-ruffle-player/html/pac_man/index.html
- 8 Ball Pool Billiard: https://db2.duckmath.org/2022/unity3/8-ball-pool-billiard/index.html
- Flappy Bird: https://classroomlesson.github.io/basic-ruffle-player/html/flappy_bird/index.html
- Stickman Parkour: https://classroomlesson.github.io/basic-ruffle-player/html/stickman_parkour/index.html
- Mini Golf: https://classroomlesson.github.io/basic-ruffle-player/html/mini_golf/index.html
- Plants vs Zombies: https://classroomlesson.github.io/basic-ruffle-player/html/pvz/index.html
- Fast Food Rush: https://db2.duckmath.org/2025/unity/fast-food-rush/index.html
- Football Legends: https://ubg005.gitlab.io/football-legends/
