# LEVIANT Project Notes

## Goal

Build `LEVIANT`, a lightweight local browser game with a classic Flash-game feel and modern neon vector graphics. The game should run by opening `index.html` directly in a browser.

## Files

- `index.html`: App shell and canvas.
- `style.css`: Fullscreen layout, title/menu/game overlays, arcade neon UI.
- `game.js`: Game loop, menus, input, shooting mode, runner mode, sound, persistence.

## UX Flow

1. Title screen with large `LEVIANT` logo.
2. `START` advances to mode select.
3. Mode select: `SHOOTING` or `RUNNER`.
4. Difficulty select: `EASY`, `NORMAL`, `HARD`.
5. Game starts.
6. Game over offers restart, mode select, and title.

Also include fullscreen, BGM toggle, and SFX toggle. BGM and SFX default to on and settings persist in `localStorage`.

## Shared Game Direction

- Use a 16:9 horizontal canvas.
- Style: classic arcade/Flash-game controls plus rich neon vector graphics, glow, particles, trails, screen shake, and world transitions.
- World order: Space/Neon, Fantasy/Magic, Deep Sea, Cyber City, then repeat with increased difficulty.
- Store high scores per mode and difficulty.

## Shooting Mode

- Vertical scrolling shooter using the full horizontal 16:9 playfield.
- Player can move across the whole screen with arrow keys or WASD.
- Auto-fire is always active.
- Default HP is 3.
- Items:
  - Heart: HP +1.
  - Power: permanent weapon level increase.
  - Shield: blocks one hit.
  - Magnet: attracts score gems.
- Weapon growth:
  - Single, double, triple, 5-way, stronger shots, support drones, piercing/enhanced shots.
- Enemy and boss bodies are fully hittable.
- Different body parts have different hidden damage multipliers.
- Do not show damage numbers. Flash the hit area red, with stronger feedback for weak points.
- Progression per world:
  - 120 seconds first half.
  - Fixed mid-boss.
  - 120 seconds second half.
  - Large transition boss.

## Shooting Bosses

- World 1 mid-boss: angular neon electric pickup/truck inspired silhouette. Do not use logos.
- World 1 main boss: giant neon face-like battleship inspired by Elon Musk as a public-figure caricature.
- World 2 mid-boss: magic golem.
- World 2 main boss: rune dragon / magic core.
- World 3 mid-boss: yellow square sponge-like deep-sea parody boss with electric jellyfish squad.
  - Do not exactly copy SpongeBob's copyrighted face, clothing, name, or exact design.
- World 3 main boss: deep-sea leviathan.
- World 4 mid-boss: neon assassin machine.
- World 4 main boss: central city AI core.
- Boss behavior mixes fixed bullet patterns with tracking, aiming, and dash attacks.

## Runner Mode

- Human-shaped neon-suit runner.
- Auto-runner with jump and slide.
- Jump: `Space`, `W`, or `ArrowUp`.
- Slide: `S` or `ArrowDown`.
- One hit means game over.
- Only item is Boost:
  - Temporary invulnerability.
  - Breaks/passes obstacles.
  - Adds speed and visual effects.
- Obstacles mix classic jump/slide/gap tests with later rhythm-like sequences.
- Each world lasts 180 seconds before transitioning.

## Controls

- Move: WASD or arrow keys.
- Jump: Space, W, ArrowUp.
- Slide: S, ArrowDown.
- Pause: P.
- Return to menu/title flow: Escape.

## Implementation Notes

- Keep dependencies at zero unless explicitly approved.
- Prefer canvas-drawn vector art and generated effects over external assets.
- Avoid exact reproduction of third-party copyrighted characters or protected logos.
- Keep code readable and self-contained.
