(() => {
  "use strict";

  const WIDTH = 960;
  const HEIGHT = 540;
  const SHOOTING_PHASE_SECONDS = 120;
  const RUNNER_WORLD_SECONDS = 180;
  const STORAGE_PREFIX = "leviant";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const screens = {
    title: document.getElementById("titleScreen"),
    mode: document.getElementById("modeScreen"),
    difficulty: document.getElementById("difficultyScreen"),
    pause: document.getElementById("pauseScreen"),
    gameover: document.getElementById("gameoverScreen")
  };

  const hud = {
    root: document.getElementById("hud"),
    metric: document.getElementById("hudMetric"),
    best: document.getElementById("hudBest"),
    world: document.getElementById("hudWorld"),
    phase: document.getElementById("hudPhase"),
    status: document.getElementById("hudStatus"),
    difficulty: document.getElementById("hudDifficulty")
  };

  const ui = {
    start: document.getElementById("startBtn"),
    fullscreen: document.getElementById("fullscreenBtn"),
    bgm: document.getElementById("bgmToggle"),
    sfx: document.getElementById("sfxToggle"),
    records: document.getElementById("recordsPanel"),
    shooting: document.getElementById("shootingBtn"),
    runner: document.getElementById("runnerBtn"),
    difficultyMode: document.getElementById("difficultyModeLabel"),
    backMode: document.getElementById("backModeBtn"),
    resume: document.getElementById("resumeBtn"),
    pauseMode: document.getElementById("pauseModeBtn"),
    restart: document.getElementById("restartBtn"),
    gameoverMode: document.getElementById("gameoverModeBtn"),
    gameoverModeLabel: document.getElementById("gameoverMode"),
    resultScore: document.getElementById("resultScore"),
    resultBest: document.getElementById("resultBest")
  };

  const worlds = [
    {
      id: "space",
      name: "SPACE",
      base: "#040715",
      deep: "#100928",
      primary: "#35f2ff",
      secondary: "#ff3df2",
      accent: "#ffd166",
      player: "#8ffcff"
    },
    {
      id: "fantasy",
      name: "FANTASY",
      base: "#071025",
      deep: "#210b33",
      primary: "#b86dff",
      secondary: "#ffd166",
      accent: "#4dff91",
      player: "#ffd166"
    },
    {
      id: "sea",
      name: "DEEP SEA",
      base: "#021421",
      deep: "#001f32",
      primary: "#4dffdf",
      secondary: "#ff4fd8",
      accent: "#81c8ff",
      player: "#4dffdf"
    },
    {
      id: "cyber",
      name: "CYBER CITY",
      base: "#080911",
      deep: "#1a0612",
      primary: "#ff4d6d",
      secondary: "#35f2ff",
      accent: "#ffd166",
      player: "#ff6d8a"
    }
  ];

  const difficultyConfig = {
    easy: {
      label: "EASY",
      score: 1,
      speed: 0.86,
      spawn: 0.78,
      enemyHp: 0.82,
      bullet: 0.82,
      item: 1.25
    },
    normal: {
      label: "NORMAL",
      score: 1.25,
      speed: 1,
      spawn: 1,
      enemyHp: 1,
      bullet: 1,
      item: 1
    },
    hard: {
      label: "HARD",
      score: 1.6,
      speed: 1.18,
      spawn: 1.26,
      enemyHp: 1.24,
      bullet: 1.22,
      item: 0.72
    }
  };

  const state = {
    screen: "title",
    mode: null,
    pendingMode: null,
    difficulty: "normal",
    game: null,
    paused: false,
    lastTime: performance.now(),
    shake: 0,
    attractTime: 0
  };

  const keys = new Set();
  const bgDots = Array.from({ length: 170 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    z: 0.25 + Math.random() * 1.4,
    r: 0.7 + Math.random() * 1.9,
    seed: Math.random() * Math.PI * 2
  }));

  const settings = loadSettings();
  state.difficulty = settings.lastDifficulty;

  const audio = new AudioSystem();
  syncAudioButtons();
  updateRecordsPanel();

  ui.start.addEventListener("click", () => {
    userGesture();
    audio.sfx("select");
    showModeSelect();
  });

  ui.fullscreen.addEventListener("click", () => {
    userGesture();
    audio.sfx("select");
    toggleFullscreen();
  });

  ui.bgm.addEventListener("click", () => {
    userGesture();
    settings.bgm = !settings.bgm;
    audio.resetBgmClock();
    saveSettings();
    syncAudioButtons();
    audio.sfx("select");
  });

  ui.sfx.addEventListener("click", () => {
    userGesture();
    settings.sfx = !settings.sfx;
    saveSettings();
    syncAudioButtons();
    audio.sfx("select");
  });

  ui.shooting.addEventListener("click", () => {
    selectMode("shooting");
  });

  ui.runner.addEventListener("click", () => {
    selectMode("runner");
  });

  ui.backMode.addEventListener("click", () => {
    userGesture();
    audio.sfx("select");
    showModeSelect();
  });

  ui.resume.addEventListener("click", () => {
    userGesture();
    resumeGame();
  });

  ui.pauseMode.addEventListener("click", () => {
    userGesture();
    audio.sfx("select");
    showModeSelect();
  });

  ui.restart.addEventListener("click", () => {
    userGesture();
    audio.sfx("start");
    startGame(state.mode, state.difficulty);
  });

  ui.gameoverMode.addEventListener("click", () => {
    userGesture();
    audio.sfx("select");
    showModeSelect();
  });

  document.querySelectorAll("[data-go-title]").forEach((button) => {
    button.addEventListener("click", () => {
      userGesture();
      audio.sfx("select");
      showTitle();
    });
  });

  document.querySelectorAll("[data-difficulty]").forEach((button) => {
    button.addEventListener("click", () => {
      const difficulty = button.getAttribute("data-difficulty");
      userGesture();
      audio.sfx("start");
      startGame(state.pendingMode, difficulty);
    });
  });

  document.addEventListener("pointerdown", userGesture, { passive: true });

  window.addEventListener("keydown", (event) => {
    userGesture();
    if (isGameKey(event.code)) {
      event.preventDefault();
    }

    if (!keys.has(event.code) && state.game && state.screen === "playing" && !state.paused) {
      state.game.keyDown(event.code);
    }

    keys.add(event.code);

    if (event.code === "KeyP" && state.screen === "playing") {
      togglePause();
      return;
    }

    if (event.code === "Escape") {
      if (state.screen === "playing") {
        showModeSelect();
      } else if (state.screen === "difficulty") {
        showModeSelect();
      } else if (state.screen === "mode") {
        showTitle();
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  requestAnimationFrame(loop);

  function loop(now) {
    const rawDt = (now - state.lastTime) / 1000;
    const dt = clamp(Number.isFinite(rawDt) ? rawDt : 0, 0, 0.034);
    state.lastTime = now;

    if (state.screen === "playing" && state.game && !state.paused) {
      state.game.update(dt);
      audio.update(dt, state.game.worldIndex || 0);
    } else {
      state.attractTime += dt;
      audio.update(dt, Math.floor(state.attractTime / 8) % worlds.length);
    }

    drawFrame(now / 1000);
    updateHud();
    requestAnimationFrame(loop);
  }

  function drawFrame(t) {
    ctx.save();
    if (state.shake > 0) {
      const amount = state.shake * 8;
      ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
      state.shake = Math.max(0, state.shake - 0.035);
    }

    if (state.game) {
      state.game.draw(ctx);
    } else {
      const worldIndex = Math.floor(t / 8) % worlds.length;
      drawWorldBackground(ctx, worldIndex, t, "attract", 1);
      drawAttractVignette(ctx, t);
    }

    ctx.restore();
  }

  function showOnly(screenName) {
    Object.values(screens).forEach((screen) => {
      screen.classList.add("hidden");
    });
    if (screenName && screens[screenName]) {
      screens[screenName].classList.remove("hidden");
    }
  }

  function showTitle() {
    state.screen = "title";
    state.game = null;
    state.paused = false;
    state.mode = null;
    state.pendingMode = null;
    showOnly("title");
    hud.root.classList.add("hidden");
    updateRecordsPanel();
  }

  function showModeSelect() {
    state.screen = "mode";
    state.game = null;
    state.paused = false;
    showOnly("mode");
    hud.root.classList.add("hidden");
    updateRecordsPanel();
  }

  function selectMode(mode) {
    userGesture();
    audio.sfx("select");
    state.pendingMode = mode;
    state.screen = "difficulty";
    ui.difficultyMode.textContent = mode === "shooting" ? "SHOOTING" : "RUNNER";
    showOnly("difficulty");
    hud.root.classList.add("hidden");
  }

  function startGame(mode, difficulty) {
    state.mode = mode;
    state.difficulty = difficulty;
    settings.lastDifficulty = difficulty;
    saveSettings();
    state.paused = false;
    state.screen = "playing";
    state.game = mode === "shooting" ? createShootingGame(difficulty) : createRunnerGame(difficulty);
    showOnly(null);
    hud.root.classList.remove("hidden");
  }

  function togglePause() {
    if (state.screen !== "playing" || !state.game) {
      return;
    }
    state.paused = !state.paused;
    if (state.paused) {
      audio.sfx("pause");
      screens.pause.classList.remove("hidden");
    } else {
      audio.sfx("select");
      screens.pause.classList.add("hidden");
    }
  }

  function resumeGame() {
    if (state.screen !== "playing") {
      return;
    }
    state.paused = false;
    screens.pause.classList.add("hidden");
    audio.sfx("select");
  }

  function finishGame(game) {
    if (state.screen !== "playing") {
      return;
    }
    const metric = Math.floor(game.metric());
    const best = Math.max(metric, getBest(state.mode, state.difficulty));
    setBest(state.mode, state.difficulty, best);
    updateRecordsPanel();

    state.screen = "gameover";
    state.paused = false;
    ui.gameoverModeLabel.textContent = state.mode === "shooting" ? "COMBAT LOST" : "RUN ENDED";
    ui.resultScore.textContent = game.metricLabel(metric);
    ui.resultBest.textContent = state.mode === "runner" ? `BEST ${formatNumber(best)}M` : `BEST ${formatNumber(best)}`;
    showOnly("gameover");
    hud.root.classList.add("hidden");
    audio.sfx("gameover");
  }

  function updateHud() {
    if (state.screen !== "playing" || !state.game) {
      return;
    }
    const game = state.game;
    const best = getBest(state.mode, state.difficulty);
    hud.metric.textContent = game.hudMetric();
    hud.best.textContent = `BEST ${formatNumber(best)}`;
    hud.world.textContent = worlds[game.worldIndex].name;
    hud.phase.textContent = game.hudPhase();
    hud.status.textContent = game.hudStatus();
    hud.difficulty.textContent = difficultyConfig[state.difficulty].label;
  }

  function syncAudioButtons() {
    ui.bgm.textContent = settings.bgm ? "BGM ON" : "BGM OFF";
    ui.sfx.textContent = settings.sfx ? "SFX ON" : "SFX OFF";
  }

  function updateRecordsPanel() {
    const parts = [];
    ["easy", "normal", "hard"].forEach((difficulty) => {
      parts.push(`S ${difficultyConfig[difficulty].label} ${formatNumber(getBest("shooting", difficulty))}`);
    });
    ["easy", "normal", "hard"].forEach((difficulty) => {
      parts.push(`R ${difficultyConfig[difficulty].label} ${formatNumber(getBest("runner", difficulty))}M`);
    });
    ui.records.textContent = parts.join("   ");
  }

  function userGesture() {
    audio.unlock();
  }

  function toggleFullscreen() {
    const frame = document.getElementById("gameFrame");
    if (!document.fullscreenElement) {
      frame.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function isGameKey(code) {
    return [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyP"
    ].includes(code);
  }

  function loadSettings() {
    const fallback = { bgm: true, sfx: true, lastDifficulty: "normal" };
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}.settings`);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw);
      return {
        bgm: parsed.bgm !== false,
        sfx: parsed.sfx !== false,
        lastDifficulty: difficultyConfig[parsed.lastDifficulty] ? parsed.lastDifficulty : "normal"
      };
    } catch {
      return fallback;
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}.settings`, JSON.stringify(settings));
    } catch {
      // localStorage can be unavailable in private or restricted browser contexts.
    }
  }

  function bestKey(mode, difficulty) {
    return `${STORAGE_PREFIX}.best.${mode}.${difficulty}`;
  }

  function getBest(mode, difficulty) {
    try {
      return Number(localStorage.getItem(bestKey(mode, difficulty)) || 0) || 0;
    } catch {
      return 0;
    }
  }

  function setBest(mode, difficulty, value) {
    try {
      localStorage.setItem(bestKey(mode, difficulty), String(Math.floor(value)));
    } catch {
      // Ignore persistence failures; the game should still play.
    }
  }

  function createShootingGame(difficulty) {
    const config = difficultyConfig[difficulty];
    const game = {
      type: "shooting",
      difficulty,
      config,
      elapsed: 0,
      score: 0,
      worldIndex: 0,
      loop: 0,
      phase: "first",
      phaseTime: 0,
      phaseMessage: 2.2,
      spawnTimer: 0.4,
      itemTimer: 7,
      boss: null,
      player: {
        x: WIDTH / 2,
        y: HEIGHT - 82,
        r: 18,
        hp: 3,
        maxHp: 8,
        power: 1,
        shield: 0,
        magnet: 0,
        invuln: 0,
        hitFlash: 0,
        fireTimer: 0
      },
      bullets: [],
      enemyBullets: [],
      enemies: [],
      items: [],
      gems: [],
      particles: [],
      keyDown() {},
      update(dt) {
        updateShooting(this, dt);
      },
      draw(target) {
        drawShooting(this, target);
      },
      metric() {
        return this.score;
      },
      metricLabel(value) {
        return `SCORE ${formatNumber(value)}`;
      },
      hudMetric() {
        return `SCORE ${formatNumber(this.score)}`;
      },
      hudPhase() {
        if (this.boss) {
          return this.boss.kind === "mid" ? "MID BOSS" : "WORLD BOSS";
        }
        if (this.phase === "first") {
          return `ALPHA ${Math.max(0, Math.ceil(SHOOTING_PHASE_SECONDS - this.phaseTime))}`;
        }
        return `OMEGA ${Math.max(0, Math.ceil(SHOOTING_PHASE_SECONDS - this.phaseTime))}`;
      },
      hudStatus() {
        const shield = this.player.shield > 0 ? ` SHIELD ${this.player.shield}` : "";
        const magnet = this.player.magnet > 0 ? ` MAG ${Math.ceil(this.player.magnet)}` : "";
        return `HP ${this.player.hp}  PWR ${this.player.power}${shield}${magnet}`;
      }
    };
    return game;
  }

  function updateShooting(game, dt) {
    const player = game.player;
    game.elapsed += dt;
    game.phaseTime += dt;
    game.phaseMessage = Math.max(0, game.phaseMessage - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.hitFlash = Math.max(0, player.hitFlash - dt);
    player.magnet = Math.max(0, player.magnet - dt);

    moveShootingPlayer(player, dt);
    updatePlayerFire(game, dt);

    if (game.boss) {
      updateBoss(game, game.boss, dt);
    } else {
      updateShootingProgress(game);
      updateEnemySpawns(game, dt);
    }

    game.itemTimer -= dt;
    if (game.itemTimer <= 0 && !game.boss) {
      game.itemTimer = (11 + Math.random() * 8) / game.config.item;
      spawnItem(game, randomChoice(["heart", "power", "shield", "magnet"]), 70 + Math.random() * (WIDTH - 140), -30);
    }

    updatePlayerBullets(game, dt);
    updateEnemies(game, dt);
    updateEnemyBullets(game, dt);
    updateItems(game, dt);
    updateGems(game, dt);
    updateParticles(game, dt);
    checkPlayerCollisions(game);

    game.score += dt * 8 * game.config.score * (1 + game.loop * 0.15);
  }

  function moveShootingPlayer(player, dt) {
    let dx = 0;
    let dy = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      const speed = 310;
      player.x += (dx / len) * speed * dt;
      player.y += (dy / len) * speed * dt;
    }
    player.x = clamp(player.x, 28, WIDTH - 28);
    player.y = clamp(player.y, 68, HEIGHT - 34);
  }

  function updatePlayerFire(game, dt) {
    const player = game.player;
    player.fireTimer -= dt;
    const interval = clamp(0.17 - player.power * 0.006, 0.075, 0.17);
    if (player.fireTimer <= 0) {
      player.fireTimer += interval;
      firePlayerShots(game);
    }
  }

  function firePlayerShots(game) {
    const player = game.player;
    const world = worlds[game.worldIndex];
    const level = player.power;
    const damage = 1 + Math.floor((level - 1) / 4) * 0.38;
    const bulletSpeed = 650 + Math.min(120, level * 8);
    const pierce = level >= 8 ? 2 : level >= 5 ? 1 : 0;
    const shots = [];

    if (level === 1) {
      shots.push({ off: 0, angle: 0 });
    } else if (level === 2) {
      shots.push({ off: -9, angle: -0.025 }, { off: 9, angle: 0.025 });
    } else if (level === 3) {
      shots.push({ off: -15, angle: -0.05 }, { off: 0, angle: 0 }, { off: 15, angle: 0.05 });
    } else {
      shots.push(
        { off: -24, angle: -0.22 },
        { off: -12, angle: -0.1 },
        { off: 0, angle: 0 },
        { off: 12, angle: 0.1 },
        { off: 24, angle: 0.22 }
      );
    }

    shots.forEach((shot) => {
      const vx = Math.sin(shot.angle) * bulletSpeed;
      const vy = -Math.cos(shot.angle) * bulletSpeed;
      game.bullets.push({
        x: player.x + shot.off,
        y: player.y - 24,
        vx,
        vy,
        r: level >= 5 ? 5.2 : 4,
        damage,
        pierce,
        life: 1.6,
        color: world.player
      });
    });

    const droneCount = Math.min(2, Math.max(0, level - 5));
    for (let i = 0; i < droneCount; i += 1) {
      const side = i === 0 ? -1 : 1;
      game.bullets.push({
        x: player.x + side * 42,
        y: player.y - 10,
        vx: side * 32,
        vy: -bulletSpeed * 0.94,
        r: 3.8,
        damage: damage * 0.72,
        pierce: Math.max(0, pierce - 1),
        life: 1.4,
        color: world.secondary
      });
    }

    if (Math.random() < 0.45) {
      audio.sfx("shoot");
    }
  }

  function updateShootingProgress(game) {
    if (game.phase === "first" && game.phaseTime >= SHOOTING_PHASE_SECONDS) {
      spawnBoss(game, "mid");
      return;
    }
    if (game.phase === "second" && game.phaseTime >= SHOOTING_PHASE_SECONDS) {
      spawnBoss(game, "main");
    }
  }

  function updateEnemySpawns(game, dt) {
    const pressure = 1 + game.loop * 0.18 + game.worldIndex * 0.08;
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      const base = random(0.72, 1.15) / (game.config.spawn * pressure);
      game.spawnTimer = base;
      spawnEnemy(game);
      if (Math.random() < 0.18 + game.worldIndex * 0.03) {
        spawnEnemy(game);
      }
    }
  }

  function spawnEnemy(game) {
    const worldIndex = game.worldIndex;
    const loopScale = 1 + game.loop * 0.22;
    const kinds = ["drone", "zig", "turret", "seeker"];
    const kind = randomChoice(kinds);
    const r = kind === "turret" ? 24 : kind === "seeker" ? 18 : 20;
    const hpBase = kind === "turret" ? 8 : kind === "seeker" ? 5 : 4;
    const speedBase = kind === "turret" ? 45 : kind === "seeker" ? 104 : 78;
    const enemy = {
      kind,
      worldIndex,
      x: random(45, WIDTH - 45),
      y: -45,
      baseX: 0,
      vx: random(-30, 30),
      vy: (speedBase + game.worldIndex * 8) * game.config.speed * loopScale,
      r,
      hp: hpBase * game.config.enemyHp * loopScale,
      maxHp: hpBase * game.config.enemyHp * loopScale,
      age: 0,
      shootTimer: random(1.0, 2.2) / game.config.bullet,
      hitFlash: 0,
      hitX: 0,
      hitY: 0,
      weakFlash: false
    };
    enemy.baseX = enemy.x;
    game.enemies.push(enemy);
  }

  function updatePlayerBullets(game, dt) {
    for (let i = game.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = game.bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;

      let consumed = false;
      if (game.boss && bulletHitsBoss(game.boss, bullet)) {
        damageBoss(game, game.boss, bullet);
        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
        } else {
          consumed = true;
        }
      }

      if (!consumed) {
        for (let j = game.enemies.length - 1; j >= 0; j -= 1) {
          const enemy = game.enemies[j];
          if (distance(bullet.x, bullet.y, enemy.x, enemy.y) <= bullet.r + enemy.r) {
            damageEnemy(game, enemy, bullet);
            if (enemy.hp <= 0) {
              destroyEnemy(game, enemy, j);
            }
            if (bullet.pierce > 0) {
              bullet.pierce -= 1;
            } else {
              consumed = true;
            }
            break;
          }
        }
      }

      if (
        consumed ||
        bullet.life <= 0 ||
        bullet.y < -50 ||
        bullet.x < -60 ||
        bullet.x > WIDTH + 60
      ) {
        game.bullets.splice(i, 1);
      }
    }
  }

  function updateEnemies(game, dt) {
    for (let i = game.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = game.enemies[i];
      enemy.age += dt;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

      if (enemy.kind === "zig") {
        enemy.x = enemy.baseX + Math.sin(enemy.age * 3.1) * 80;
        enemy.y += enemy.vy * dt;
      } else if (enemy.kind === "seeker") {
        const toward = Math.sign(game.player.x - enemy.x);
        enemy.vx += toward * 55 * dt;
        enemy.vx = clamp(enemy.vx, -92, 92);
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      } else {
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      }

      enemy.x = clamp(enemy.x, 24, WIDTH - 24);

      enemy.shootTimer -= dt;
      if (enemy.shootTimer <= 0 && enemy.y > 20 && enemy.y < HEIGHT - 90) {
        enemy.shootTimer = random(1.2, 2.6) / game.config.bullet;
        fireEnemyShot(game, enemy);
      }

      if (enemy.y > HEIGHT + 70) {
        game.enemies.splice(i, 1);
      }
    }
  }

  function fireEnemyShot(game, enemy) {
    const world = worlds[enemy.worldIndex];
    const speed = (170 + game.worldIndex * 16 + game.loop * 20) * game.config.bullet;
    const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
    const spread = enemy.kind === "turret" ? [-0.18, 0, 0.18] : [0];
    spread.forEach((offset) => {
      game.enemyBullets.push({
        x: enemy.x,
        y: enemy.y + enemy.r * 0.4,
        vx: Math.cos(angle + offset) * speed,
        vy: Math.sin(angle + offset) * speed,
        r: enemy.kind === "turret" ? 6 : 5,
        color: world.secondary,
        life: 5
      });
    });
  }

  function updateEnemyBullets(game, dt) {
    for (let i = game.enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = game.enemyBullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (
        bullet.life <= 0 ||
        bullet.x < -80 ||
        bullet.x > WIDTH + 80 ||
        bullet.y < -90 ||
        bullet.y > HEIGHT + 90
      ) {
        game.enemyBullets.splice(i, 1);
      }
    }
  }

  function updateItems(game, dt) {
    for (let i = game.items.length - 1; i >= 0; i -= 1) {
      const item = game.items[i];
      item.y += item.vy * dt;
      item.spin += dt * 4;
      if (distance(item.x, item.y, game.player.x, game.player.y) < item.r + game.player.r + 8) {
        collectItem(game, item);
        game.items.splice(i, 1);
      } else if (item.y > HEIGHT + 40) {
        game.items.splice(i, 1);
      }
    }
  }

  function updateGems(game, dt) {
    for (let i = game.gems.length - 1; i >= 0; i -= 1) {
      const gem = game.gems[i];
      const magnetRange = game.player.magnet > 0 ? 460 : 46;
      const d = distance(gem.x, gem.y, game.player.x, game.player.y);
      if (d < magnetRange) {
        const a = Math.atan2(game.player.y - gem.y, game.player.x - gem.x);
        const pull = game.player.magnet > 0 ? 620 : 180;
        gem.vx += Math.cos(a) * pull * dt;
        gem.vy += Math.sin(a) * pull * dt;
      }
      gem.x += gem.vx * dt;
      gem.y += gem.vy * dt;
      gem.vy += 20 * dt;
      gem.life -= dt;
      if (d < game.player.r + gem.r + 5) {
        game.score += gem.value * game.config.score;
        burst(game, gem.x, gem.y, gem.color, 4, 90);
        game.gems.splice(i, 1);
        audio.sfx("gem");
      } else if (gem.life <= 0 || gem.y > HEIGHT + 35) {
        game.gems.splice(i, 1);
      }
    }
  }

  function updateParticles(game, dt) {
    for (let i = game.particles.length - 1; i >= 0; i -= 1) {
      const p = game.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - Math.min(0.85, dt * 1.4);
      p.vy *= 1 - Math.min(0.85, dt * 1.2);
      p.life -= dt;
      if (p.life <= 0) {
        game.particles.splice(i, 1);
      }
    }
  }

  function checkPlayerCollisions(game) {
    const player = game.player;
    for (let i = game.enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = game.enemyBullets[i];
      if (distance(player.x, player.y, bullet.x, bullet.y) < player.r + bullet.r) {
        game.enemyBullets.splice(i, 1);
        damagePlayer(game, bullet.x, bullet.y);
      }
    }

    for (let i = game.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = game.enemies[i];
      if (distance(player.x, player.y, enemy.x, enemy.y) < player.r + enemy.r * 0.9) {
        destroyEnemy(game, enemy, i);
        damagePlayer(game, enemy.x, enemy.y);
      }
    }

    if (game.boss && rectCircleCollision(bossRect(game.boss), player.x, player.y, player.r)) {
      damagePlayer(game, player.x, player.y);
    }
  }

  function damagePlayer(game, x, y) {
    const player = game.player;
    if (player.invuln > 0) {
      return;
    }
    if (player.shield > 0) {
      player.shield -= 1;
      player.invuln = 0.8;
      state.shake = 0.5;
      burst(game, x, y, "#35f2ff", 18, 180);
      audio.sfx("shield");
      return;
    }
    player.hp -= 1;
    player.hitFlash = 0.55;
    player.invuln = 1.15;
    state.shake = 0.9;
    burst(game, x, y, "#ff4d6d", 28, 220);
    audio.sfx("hurt");
    if (player.hp <= 0) {
      finishGame(game);
    }
  }

  function damageEnemy(game, enemy, bullet) {
    const dx = bullet.x - enemy.x;
    const dy = bullet.y - enemy.y;
    const center = Math.hypot(dx, dy) / enemy.r;
    let mult = 1;
    if (center < 0.38) {
      mult = 1.45;
    } else if (dy < -enemy.r * 0.32) {
      mult = enemy.worldIndex === 2 ? 1.65 : 1.28;
    } else if (center > 0.82) {
      mult = 0.72;
    }
    enemy.hp -= bullet.damage * mult;
    enemy.hitFlash = mult > 1.3 ? 0.22 : 0.14;
    enemy.hitX = bullet.x;
    enemy.hitY = bullet.y;
    enemy.weakFlash = mult > 1.3;
    if (Math.random() < 0.45) {
      game.particles.push({
        x: bullet.x,
        y: bullet.y,
        vx: random(-50, 50),
        vy: random(-50, 50),
        r: random(1, 2.5),
        life: random(0.18, 0.36),
        maxLife: 0.36,
        color: mult > 1.3 ? "#ff4d6d" : bullet.color
      });
    }
  }

  function destroyEnemy(game, enemy, index) {
    const world = worlds[enemy.worldIndex];
    game.enemies.splice(index, 1);
    game.score += Math.floor((80 + enemy.maxHp * 12) * game.config.score);
    burst(game, enemy.x, enemy.y, world.secondary, 22, 190);
    spawnGems(game, enemy.x, enemy.y, 5 + Math.floor(enemy.maxHp / 3), world.accent);
    if (Math.random() < 0.075 * game.config.item) {
      spawnItem(game, randomChoice(["heart", "power", "shield", "magnet"]), enemy.x, enemy.y);
    }
    audio.sfx("explode");
  }

  function spawnGems(game, x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      const a = random(0, Math.PI * 2);
      const s = random(50, 170);
      game.gems.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: random(3, 5),
        value: 12,
        color,
        life: 6
      });
    }
  }

  function spawnItem(game, type, x, y) {
    game.items.push({
      type,
      x,
      y,
      vy: 74,
      r: 15,
      spin: Math.random() * 10
    });
  }

  function collectItem(game, item) {
    const player = game.player;
    if (item.type === "heart") {
      player.hp = Math.min(player.maxHp, player.hp + 1);
    } else if (item.type === "power") {
      player.power = Math.min(12, player.power + 1);
    } else if (item.type === "shield") {
      player.shield = Math.min(3, player.shield + 1);
    } else if (item.type === "magnet") {
      player.magnet = 14;
    }
    game.score += 60 * game.config.score;
    burst(game, item.x, item.y, itemColor(item.type), 20, 170);
    audio.sfx("power");
  }

  function spawnBoss(game, kind) {
    const world = worlds[game.worldIndex];
    game.boss = {
      kind,
      worldIndex: game.worldIndex,
      x: WIDTH / 2,
      y: kind === "mid" ? 104 : 126,
      targetY: kind === "mid" ? 112 : 138,
      w: kind === "mid" ? 218 : 318,
      h: kind === "mid" ? 112 : 184,
      hp: (kind === "mid" ? 175 : 430) * game.config.enemyHp * (1 + game.loop * 0.35),
      maxHp: (kind === "mid" ? 175 : 430) * game.config.enemyHp * (1 + game.loop * 0.35),
      age: 0,
      attackTimer: 0.8,
      flashes: [],
      color: world.primary
    };
    game.phase = kind === "mid" ? "midboss" : "boss";
    game.phaseTime = 0;
    game.enemyBullets.length = 0;
    game.enemies.length = 0;
    state.shake = 0.7;
    audio.sfx("boss");
  }

  function updateBoss(game, boss, dt) {
    boss.age += dt;
    boss.y += (boss.targetY - boss.y) * Math.min(1, dt * 2.6);
    const moveAmp = boss.kind === "mid" ? 170 : 125;
    boss.x = WIDTH / 2 + Math.sin(boss.age * (boss.kind === "mid" ? 0.8 : 0.55)) * moveAmp;
    boss.x = clamp(boss.x, boss.w / 2 + 20, WIDTH - boss.w / 2 - 20);

    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      bossAttack(game, boss);
      boss.attackTimer = boss.kind === "mid" ? random(0.72, 1.18) : random(0.56, 1.02);
    }

    for (let i = boss.flashes.length - 1; i >= 0; i -= 1) {
      boss.flashes[i].life -= dt;
      if (boss.flashes[i].life <= 0) {
        boss.flashes.splice(i, 1);
      }
    }
  }

  function bossAttack(game, boss) {
    const world = worlds[boss.worldIndex];
    const phase = boss.hp / boss.maxHp < 0.42 ? 1 : 0;
    const speed = (170 + game.worldIndex * 16 + game.loop * 18 + phase * 34) * game.config.bullet;

    if (boss.worldIndex === 0 && boss.kind === "mid") {
      fireBossFan(game, boss.x - 58, boss.y + 16, 5, 0.78, 2.36, speed, world.secondary);
      fireBossFan(game, boss.x + 58, boss.y + 16, 5, 0.78, 2.36, speed, world.secondary);
      if (phase) {
        fireAimedBurst(game, boss.x, boss.y + 46, 3, speed + 40, world.accent);
      }
    } else if (boss.worldIndex === 0) {
      fireBossFan(game, boss.x, boss.y + 48, 11 + phase * 4, 0.48, 2.68, speed, world.secondary);
      fireAimedBurst(game, boss.x - 70, boss.y + 20, 3 + phase, speed + 30, world.primary);
      fireAimedBurst(game, boss.x + 70, boss.y + 20, 3 + phase, speed + 30, world.primary);
    } else if (boss.worldIndex === 1 && boss.kind === "mid") {
      fireBossRing(game, boss.x, boss.y + 24, 12 + phase * 4, speed * 0.72, world.secondary, boss.age * 0.3);
      fireAimedBurst(game, boss.x, boss.y + 42, 2 + phase, speed + 20, world.accent);
    } else if (boss.worldIndex === 1) {
      fireBossFan(game, boss.x, boss.y + 58, 13 + phase * 5, 0.35, 2.79, speed, world.secondary);
      fireBossRing(game, boss.x, boss.y, 10 + phase * 5, speed * 0.62, world.accent, boss.age);
    } else if (boss.worldIndex === 2 && boss.kind === "mid") {
      for (let i = 0; i < 4; i += 1) {
        const a = boss.age * 1.5 + i * Math.PI * 0.5;
        const x = boss.x + Math.cos(a) * 92;
        const y = boss.y + Math.sin(a) * 32;
        fireAimedBurst(game, x, y, 2 + phase, speed, world.secondary);
      }
    } else if (boss.worldIndex === 2) {
      fireBossFan(game, boss.x, boss.y + 72, 15 + phase * 4, 0.3, 2.84, speed, world.primary);
      fireBossRing(game, boss.x - 90, boss.y + 8, 8 + phase * 3, speed * 0.68, world.secondary, -boss.age);
      fireBossRing(game, boss.x + 90, boss.y + 8, 8 + phase * 3, speed * 0.68, world.secondary, boss.age);
    } else if (boss.worldIndex === 3 && boss.kind === "mid") {
      fireAimedBurst(game, boss.x, boss.y + 44, 5 + phase * 2, speed + 80, world.primary);
      fireBossFan(game, boss.x, boss.y + 12, 7, 0.8, 2.34, speed * 0.8, world.secondary);
    } else {
      fireBossRing(game, boss.x, boss.y + 8, 18 + phase * 6, speed * 0.7, world.secondary, boss.age * 0.7);
      fireAimedBurst(game, boss.x, boss.y + 64, 5 + phase * 2, speed + 60, world.primary);
    }

    audio.sfx("enemyShoot");
  }

  function fireBossFan(game, x, y, count, startAngle, endAngle, speed, color) {
    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = lerp(startAngle, endAngle, t);
      game.enemyBullets.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 5.5,
        color,
        life: 6
      });
    }
  }

  function fireBossRing(game, x, y, count, speed, color, offset) {
    for (let i = 0; i < count; i += 1) {
      const angle = offset + (i / count) * Math.PI * 2;
      game.enemyBullets.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 5,
        color,
        life: 5.5
      });
    }
  }

  function fireAimedBurst(game, x, y, count, speed, color) {
    const base = Math.atan2(game.player.y - y, game.player.x - x);
    const spread = count <= 1 ? 0 : 0.11;
    for (let i = 0; i < count; i += 1) {
      const angle = base + (i - (count - 1) / 2) * spread;
      game.enemyBullets.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 5.8,
        color,
        life: 5
      });
    }
  }

  function bulletHitsBoss(boss, bullet) {
    const rect = bossRect(boss);
    return rectCircleCollision(rect, bullet.x, bullet.y, bullet.r);
  }

  function damageBoss(game, boss, bullet) {
    const part = bossPartAt(boss, bullet.x, bullet.y);
    boss.hp -= bullet.damage * part.mult;
    boss.flashes.push({
      x: bullet.x,
      y: bullet.y,
      r: part.weak ? 24 : 15,
      life: part.weak ? 0.26 : 0.16,
      maxLife: part.weak ? 0.26 : 0.16,
      weak: part.weak
    });
    if (part.weak) {
      game.score += 8 * game.config.score;
    }
    if (boss.hp <= 0) {
      defeatBoss(game, boss);
    }
  }

  function bossPartAt(boss, x, y) {
    const nx = (x - (boss.x - boss.w / 2)) / boss.w;
    const ny = (y - (boss.y - boss.h / 2)) / boss.h;
    let mult = 0.78;
    let weak = false;

    if (boss.worldIndex === 0 && boss.kind === "mid") {
      if (ny > 0.22 && ny < 0.52 && nx > 0.38 && nx < 0.64) {
        mult = 1.62;
        weak = true;
      } else if (ny > 0.42 && nx > 0.12 && nx < 0.88) {
        mult = 1.08;
      }
    } else if (boss.worldIndex === 0) {
      if ((nx > 0.36 && nx < 0.46 && ny > 0.35 && ny < 0.48) || (nx > 0.54 && nx < 0.64 && ny > 0.35 && ny < 0.48)) {
        mult = 1.72;
        weak = true;
      } else if (nx > 0.38 && nx < 0.62 && ny > 0.58 && ny < 0.72) {
        mult = 1.35;
      }
    } else if (boss.worldIndex === 1) {
      if (nx > 0.42 && nx < 0.58 && ny > 0.32 && ny < 0.58) {
        mult = boss.kind === "mid" ? 1.55 : 1.68;
        weak = true;
      } else if (ny < 0.25) {
        mult = 1.12;
      }
    } else if (boss.worldIndex === 2) {
      if (ny < 0.34 && nx > 0.37 && nx < 0.63) {
        mult = 1.75;
        weak = true;
      } else if (nx > 0.44 && nx < 0.56 && ny > 0.56) {
        mult = 1.36;
      }
    } else if (boss.worldIndex === 3) {
      if (nx > 0.4 && nx < 0.6 && ny > 0.34 && ny < 0.62) {
        mult = 1.72;
        weak = true;
      } else if (Math.abs(nx - 0.5) > 0.34) {
        mult = 1.1;
      }
    }
    return { mult, weak };
  }

  function defeatBoss(game, boss) {
    const world = worlds[boss.worldIndex];
    burst(game, boss.x, boss.y, world.primary, boss.kind === "mid" ? 80 : 140, boss.kind === "mid" ? 290 : 390);
    spawnGems(game, boss.x, boss.y, boss.kind === "mid" ? 24 : 46, world.accent);
    game.score += (boss.kind === "mid" ? 2200 : 5400) * game.config.score * (1 + game.loop * 0.2);
    game.boss = null;
    game.enemyBullets.length = 0;
    state.shake = boss.kind === "mid" ? 1.0 : 1.5;
    audio.sfx("bossDown");

    if (boss.kind === "mid") {
      game.phase = "second";
      game.phaseTime = 0;
      game.phaseMessage = 2.2;
      game.spawnTimer = 1.0;
    } else {
      game.worldIndex = (game.worldIndex + 1) % worlds.length;
      if (game.worldIndex === 0) {
        game.loop += 1;
      }
      game.phase = "first";
      game.phaseTime = 0;
      game.phaseMessage = 2.2;
      game.spawnTimer = 1.0;
    }
  }

  function drawShooting(game, target) {
    drawWorldBackground(target, game.worldIndex, game.elapsed, "shooting", game.config.speed);
    drawShootingField(target, game);

    game.gems.forEach((gem) => drawGem(target, gem));
    game.items.forEach((item) => drawItem(target, item));
    game.bullets.forEach((bullet) => drawPlayerBullet(target, bullet));
    game.enemies.forEach((enemy) => drawEnemy(target, enemy));
    if (game.boss) {
      drawBoss(target, game.boss);
    }
    game.enemyBullets.forEach((bullet) => drawEnemyBullet(target, bullet));
    drawShootingPlayer(target, game);
    drawParticles(target, game.particles);

    if (game.boss) {
      drawBossBar(target, game.boss);
    }
  }

  function drawShootingField(target, game) {
    const world = worlds[game.worldIndex];
    target.save();
    target.globalAlpha = 0.38;
    target.strokeStyle = world.primary;
    target.lineWidth = 1;
    for (let y = -40; y < HEIGHT + 40; y += 42) {
      const scrollY = (y + game.elapsed * 60 * game.config.speed) % (HEIGHT + 80);
      target.beginPath();
      target.moveTo(0, scrollY);
      target.lineTo(WIDTH, scrollY);
      target.stroke();
    }
    target.restore();
  }

  function drawShootingPlayer(target, game) {
    const p = game.player;
    const world = worlds[game.worldIndex];
    target.save();
    target.translate(p.x, p.y);
    target.globalCompositeOperation = "lighter";

    for (let i = 0; i < Math.min(2, Math.max(0, p.power - 5)); i += 1) {
      const side = i === 0 ? -1 : 1;
      target.save();
      target.translate(side * 42, -2 + Math.sin(game.elapsed * 8) * 3);
      neonCircle(target, 0, 0, 10, world.secondary, 0.8);
      target.strokeStyle = world.secondary;
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(-7, 7);
      target.lineTo(0, -12);
      target.lineTo(7, 7);
      target.stroke();
      target.restore();
    }

    target.fillStyle = world.player;
    target.shadowColor = world.player;
    target.shadowBlur = 18;
    target.beginPath();
    target.moveTo(0, -28);
    target.lineTo(19, 14);
    target.lineTo(8, 9);
    target.lineTo(0, 24);
    target.lineTo(-8, 9);
    target.lineTo(-19, 14);
    target.closePath();
    target.fill();

    target.fillStyle = "#06101d";
    target.shadowBlur = 0;
    target.beginPath();
    target.moveTo(0, -16);
    target.lineTo(8, 10);
    target.lineTo(0, 17);
    target.lineTo(-8, 10);
    target.closePath();
    target.fill();

    neonCircle(target, 0, 3, 8 + Math.sin(game.elapsed * 10) * 1.5, world.secondary, 0.95);

    target.strokeStyle = world.primary;
    target.lineWidth = 2;
    target.shadowBlur = 12;
    target.beginPath();
    target.moveTo(-19, 17);
    target.lineTo(-32, 29 + Math.sin(game.elapsed * 12) * 4);
    target.moveTo(19, 17);
    target.lineTo(32, 29 + Math.sin(game.elapsed * 12) * 4);
    target.stroke();

    if (p.shield > 0) {
      target.globalAlpha = 0.65 + Math.sin(game.elapsed * 12) * 0.2;
      target.strokeStyle = "#35f2ff";
      target.lineWidth = 3;
      target.beginPath();
      target.arc(0, 0, 31, 0, Math.PI * 2);
      target.stroke();
    }

    if (p.invuln > 0 || p.hitFlash > 0) {
      target.globalAlpha = 0.35 + Math.sin(game.elapsed * 35) * 0.2;
      target.fillStyle = "#ff2448";
      target.shadowColor = "#ff2448";
      target.shadowBlur = 18;
      target.beginPath();
      target.moveTo(0, -29);
      target.lineTo(21, 15);
      target.lineTo(0, 25);
      target.lineTo(-21, 15);
      target.closePath();
      target.fill();
    }

    target.restore();
  }

  function drawPlayerBullet(target, bullet) {
    target.save();
    target.globalCompositeOperation = "lighter";
    target.strokeStyle = bullet.color;
    target.fillStyle = bullet.color;
    target.shadowColor = bullet.color;
    target.shadowBlur = 14;
    target.lineWidth = bullet.r * 1.2;
    target.beginPath();
    target.moveTo(bullet.x, bullet.y + 10);
    target.lineTo(bullet.x, bullet.y - 14);
    target.stroke();
    target.beginPath();
    target.arc(bullet.x, bullet.y - 10, bullet.r, 0, Math.PI * 2);
    target.fill();
    target.restore();
  }

  function drawEnemyBullet(target, bullet) {
    target.save();
    target.globalCompositeOperation = "lighter";
    target.fillStyle = bullet.color;
    target.shadowColor = bullet.color;
    target.shadowBlur = 13;
    target.beginPath();
    target.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    target.fill();
    target.strokeStyle = "#ffffff";
    target.globalAlpha = 0.35;
    target.lineWidth = 1;
    target.stroke();
    target.restore();
  }

  function drawEnemy(target, enemy) {
    const world = worlds[enemy.worldIndex];
    target.save();
    target.translate(enemy.x, enemy.y);
    target.rotate(enemy.kind === "zig" ? Math.sin(enemy.age * 5) * 0.25 : enemy.age * 0.4);
    target.globalCompositeOperation = "lighter";
    target.strokeStyle = world.primary;
    target.fillStyle = "rgba(5, 12, 28, 0.82)";
    target.lineWidth = 2.5;
    target.shadowColor = world.primary;
    target.shadowBlur = 13;

    if (enemy.worldIndex === 0) {
      target.beginPath();
      target.moveTo(0, -enemy.r);
      target.lineTo(enemy.r * 0.9, enemy.r * 0.8);
      target.lineTo(0, enemy.r * 0.35);
      target.lineTo(-enemy.r * 0.9, enemy.r * 0.8);
      target.closePath();
      target.fill();
      target.stroke();
      neonCircle(target, 0, 0, enemy.r * 0.34, world.secondary, 0.85);
    } else if (enemy.worldIndex === 1) {
      target.beginPath();
      polygon(target, 0, 0, enemy.r, 6, enemy.age * 0.6);
      target.fill();
      target.stroke();
      target.strokeStyle = world.secondary;
      target.beginPath();
      target.arc(0, 0, enemy.r * 0.58, 0, Math.PI * 2);
      target.stroke();
    } else if (enemy.worldIndex === 2) {
      target.beginPath();
      target.ellipse(0, -2, enemy.r * 0.9, enemy.r * 0.62, 0, 0, Math.PI * 2);
      target.fill();
      target.stroke();
      target.beginPath();
      for (let i = -2; i <= 2; i += 1) {
        target.moveTo(i * 6, enemy.r * 0.35);
        target.quadraticCurveTo(i * 9 + Math.sin(enemy.age * 5 + i) * 5, enemy.r * 0.9, i * 5, enemy.r * 1.3);
      }
      target.stroke();
      neonCircle(target, 0, -3, enemy.r * 0.25, world.secondary, 0.85);
    } else {
      target.beginPath();
      target.rect(-enemy.r * 0.8, -enemy.r * 0.8, enemy.r * 1.6, enemy.r * 1.6);
      target.fill();
      target.stroke();
      target.strokeStyle = world.secondary;
      target.beginPath();
      target.moveTo(-enemy.r, 0);
      target.lineTo(enemy.r, 0);
      target.moveTo(0, -enemy.r);
      target.lineTo(0, enemy.r);
      target.stroke();
    }

    if (enemy.hitFlash > 0) {
      target.globalAlpha = enemy.hitFlash / 0.22;
      target.fillStyle = enemy.weakFlash ? "#ff1f3f" : "#ff5169";
      target.shadowColor = "#ff1f3f";
      target.shadowBlur = enemy.weakFlash ? 28 : 16;
      target.beginPath();
      target.arc(enemy.hitX - enemy.x, enemy.hitY - enemy.y, enemy.weakFlash ? enemy.r * 0.62 : enemy.r * 0.42, 0, Math.PI * 2);
      target.fill();
    }

    target.restore();
  }

  function drawBoss(target, boss) {
    target.save();
    target.globalCompositeOperation = "lighter";
    drawBossShape(target, boss);
    boss.flashes.forEach((flash) => {
      const alpha = flash.life / flash.maxLife;
      target.save();
      target.globalAlpha = alpha;
      target.fillStyle = flash.weak ? "#ff102f" : "#ff5169";
      target.shadowColor = "#ff102f";
      target.shadowBlur = flash.weak ? 36 : 18;
      target.beginPath();
      target.arc(flash.x, flash.y, flash.r * (1.25 - alpha * 0.25), 0, Math.PI * 2);
      target.fill();
      target.restore();
    });
    target.restore();
  }

  function drawBossShape(target, boss) {
    const world = worlds[boss.worldIndex];
    target.save();
    target.translate(boss.x, boss.y);
    target.strokeStyle = world.primary;
    target.fillStyle = "rgba(5, 11, 24, 0.88)";
    target.lineWidth = 3;
    target.shadowColor = world.primary;
    target.shadowBlur = 22;

    if (boss.worldIndex === 0 && boss.kind === "mid") {
      drawTruckBoss(target, boss, world);
    } else if (boss.worldIndex === 0) {
      drawFaceShipBoss(target, boss, world);
    } else if (boss.worldIndex === 1 && boss.kind === "mid") {
      drawGolemBoss(target, boss, world);
    } else if (boss.worldIndex === 1) {
      drawDragonBoss(target, boss, world);
    } else if (boss.worldIndex === 2 && boss.kind === "mid") {
      drawSpongeJellyBoss(target, boss, world);
    } else if (boss.worldIndex === 2) {
      drawLeviathanBoss(target, boss, world);
    } else if (boss.worldIndex === 3 && boss.kind === "mid") {
      drawAssassinBoss(target, boss, world);
    } else {
      drawAiCoreBoss(target, boss, world);
    }
    target.restore();
  }

  function drawTruckBoss(target, boss, world) {
    const w = boss.w;
    const h = boss.h;
    target.beginPath();
    target.moveTo(-w * 0.48, h * 0.25);
    target.lineTo(-w * 0.34, -h * 0.18);
    target.lineTo(-w * 0.02, -h * 0.34);
    target.lineTo(w * 0.34, -h * 0.18);
    target.lineTo(w * 0.49, h * 0.24);
    target.lineTo(w * 0.22, h * 0.38);
    target.lineTo(-w * 0.3, h * 0.38);
    target.closePath();
    target.fill();
    target.stroke();
    target.strokeStyle = world.secondary;
    target.beginPath();
    target.moveTo(-w * 0.18, -h * 0.1);
    target.lineTo(w * 0.2, -h * 0.1);
    target.lineTo(w * 0.3, h * 0.12);
    target.lineTo(-w * 0.28, h * 0.12);
    target.closePath();
    target.stroke();
    target.strokeStyle = world.accent;
    target.beginPath();
    target.moveTo(-w * 0.42, h * 0.23);
    target.lineTo(-w * 0.25, h * 0.2);
    target.moveTo(w * 0.42, h * 0.23);
    target.lineTo(w * 0.25, h * 0.2);
    target.stroke();
    neonCircle(target, -w * 0.27, h * 0.39, 15, world.secondary, 0.7);
    neonCircle(target, w * 0.27, h * 0.39, 15, world.secondary, 0.7);
  }

  function drawFaceShipBoss(target, boss, world) {
    const w = boss.w;
    const h = boss.h;
    target.beginPath();
    target.moveTo(-w * 0.5, 0);
    target.quadraticCurveTo(-w * 0.36, -h * 0.5, 0, -h * 0.44);
    target.quadraticCurveTo(w * 0.36, -h * 0.5, w * 0.5, 0);
    target.quadraticCurveTo(w * 0.28, h * 0.44, 0, h * 0.48);
    target.quadraticCurveTo(-w * 0.28, h * 0.44, -w * 0.5, 0);
    target.fill();
    target.stroke();

    target.strokeStyle = world.secondary;
    target.lineWidth = 4;
    target.beginPath();
    target.arc(0, -h * 0.04, h * 0.38, 0, Math.PI * 2);
    target.stroke();
    target.beginPath();
    target.moveTo(-w * 0.13, -h * 0.08);
    target.quadraticCurveTo(0, -h * 0.18, w * 0.13, -h * 0.08);
    target.stroke();

    target.fillStyle = world.accent;
    target.shadowColor = world.accent;
    target.shadowBlur = 18;
    target.beginPath();
    target.ellipse(-w * 0.1, -h * 0.02, 14, 8, 0, 0, Math.PI * 2);
    target.ellipse(w * 0.1, -h * 0.02, 14, 8, 0, 0, Math.PI * 2);
    target.fill();

    target.strokeStyle = world.primary;
    target.beginPath();
    target.moveTo(-w * 0.13, h * 0.15);
    target.quadraticCurveTo(0, h * 0.23, w * 0.13, h * 0.15);
    target.stroke();

    target.fillStyle = "rgba(53, 242, 255, 0.16)";
    target.fillRect(-w * 0.57, -h * 0.14, w * 0.18, h * 0.3);
    target.fillRect(w * 0.39, -h * 0.14, w * 0.18, h * 0.3);
  }

  function drawGolemBoss(target, boss, world) {
    const w = boss.w;
    const h = boss.h;
    target.fillRect(-w * 0.2, -h * 0.44, w * 0.4, h * 0.28);
    target.strokeRect(-w * 0.2, -h * 0.44, w * 0.4, h * 0.28);
    target.fillRect(-w * 0.3, -h * 0.12, w * 0.6, h * 0.52);
    target.strokeRect(-w * 0.3, -h * 0.12, w * 0.6, h * 0.52);
    target.fillRect(-w * 0.55, -h * 0.02, w * 0.2, h * 0.34);
    target.strokeRect(-w * 0.55, -h * 0.02, w * 0.2, h * 0.34);
    target.fillRect(w * 0.35, -h * 0.02, w * 0.2, h * 0.34);
    target.strokeRect(w * 0.35, -h * 0.02, w * 0.2, h * 0.34);
    neonCircle(target, 0, h * 0.08, 24, world.secondary, 0.9);
    drawRuneCircle(target, 0, h * 0.08, 37, world.accent, boss.age);
  }

  function drawDragonBoss(target, boss, world) {
    const w = boss.w;
    const h = boss.h;
    target.beginPath();
    target.moveTo(-w * 0.48, h * 0.12);
    target.bezierCurveTo(-w * 0.2, -h * 0.52, w * 0.2, -h * 0.45, w * 0.48, h * 0.02);
    target.bezierCurveTo(w * 0.22, h * 0.34, -w * 0.24, h * 0.45, -w * 0.48, h * 0.12);
    target.fill();
    target.stroke();
    target.beginPath();
    target.moveTo(w * 0.28, -h * 0.1);
    target.lineTo(w * 0.5, -h * 0.28);
    target.lineTo(w * 0.42, h * 0.02);
    target.closePath();
    target.fill();
    target.stroke();
    neonCircle(target, 0, 0, 33, world.secondary, 0.85);
    drawRuneCircle(target, 0, 0, 52, world.accent, -boss.age * 0.8);
    target.strokeStyle = world.secondary;
    for (let i = 0; i < 7; i += 1) {
      const x = -w * 0.3 + i * w * 0.1;
      target.beginPath();
      target.moveTo(x, -h * 0.19);
      target.lineTo(x + 14, -h * 0.34);
      target.stroke();
    }
  }

  function drawSpongeJellyBoss(target, boss, world) {
    const w = boss.w;
    const h = boss.h;
    target.save();
    target.fillStyle = "rgba(255, 222, 63, 0.88)";
    target.strokeStyle = world.primary;
    target.shadowColor = "#ffd93f";
    target.shadowBlur = 18;
    roundRect(target, -w * 0.23, -h * 0.42, w * 0.46, h * 0.72, 14);
    target.fill();
    target.stroke();
    target.fillStyle = "rgba(10, 30, 38, 0.55)";
    for (let i = 0; i < 9; i += 1) {
      const x = -w * 0.16 + (i % 3) * w * 0.16 + Math.sin(boss.age * 2 + i) * 2;
      const y = -h * 0.3 + Math.floor(i / 3) * h * 0.2;
      target.beginPath();
      target.arc(x, y, 4 + (i % 2) * 2, 0, Math.PI * 2);
      target.fill();
    }
    target.strokeStyle = "#122435";
    target.lineWidth = 4;
    target.beginPath();
    target.moveTo(-w * 0.08, -h * 0.12);
    target.lineTo(-w * 0.03, -h * 0.07);
    target.lineTo(-w * 0.08, -h * 0.02);
    target.moveTo(w * 0.08, -h * 0.12);
    target.lineTo(w * 0.03, -h * 0.07);
    target.lineTo(w * 0.08, -h * 0.02);
    target.stroke();
    target.beginPath();
    target.arc(0, h * 0.08, 18, 0.1, Math.PI - 0.1);
    target.stroke();
    target.strokeStyle = world.secondary;
    for (let i = 0; i < 4; i += 1) {
      const a = boss.age * 1.4 + i * Math.PI * 0.5;
      const x = Math.cos(a) * w * 0.38;
      const y = Math.sin(a) * h * 0.24;
      target.beginPath();
      target.ellipse(x, y, 18, 12, 0, 0, Math.PI * 2);
      target.stroke();
      target.beginPath();
      target.moveTo(x - 8, y + 9);
      target.quadraticCurveTo(x - 12, y + 24, x - 3, y + 34);
      target.moveTo(x + 5, y + 10);
      target.quadraticCurveTo(x + 10, y + 25, x + 1, y + 34);
      target.stroke();
    }
    target.restore();
  }

  function drawLeviathanBoss(target, boss, world) {
    const w = boss.w;
    const h = boss.h;
    target.beginPath();
    target.moveTo(-w * 0.48, h * 0.18);
    target.bezierCurveTo(-w * 0.25, -h * 0.34, w * 0.18, -h * 0.32, w * 0.48, -h * 0.02);
    target.bezierCurveTo(w * 0.2, h * 0.36, -w * 0.24, h * 0.42, -w * 0.48, h * 0.18);
    target.fill();
    target.stroke();
    target.beginPath();
    target.moveTo(w * 0.3, -h * 0.1);
    target.lineTo(w * 0.52, -h * 0.26);
    target.lineTo(w * 0.45, h * 0.04);
    target.closePath();
    target.fill();
    target.stroke();
    neonCircle(target, w * 0.26, -h * 0.08, 13, world.secondary, 0.95);
    neonCircle(target, -w * 0.02, h * 0.08, 30, world.primary, 0.6);
    target.strokeStyle = world.secondary;
    for (let i = 0; i < 9; i += 1) {
      const x = -w * 0.34 + i * w * 0.075;
      target.beginPath();
      target.moveTo(x, -h * 0.1);
      target.lineTo(x + 12, -h * 0.28);
      target.stroke();
    }
  }

  function drawAssassinBoss(target, boss, world) {
    const h = boss.h;
    neonCircle(target, 0, -h * 0.18, 24, world.primary, 0.85);
    target.beginPath();
    target.moveTo(0, -h * 0.06);
    target.lineTo(35, h * 0.26);
    target.lineTo(0, h * 0.42);
    target.lineTo(-35, h * 0.26);
    target.closePath();
    target.fill();
    target.stroke();
    target.strokeStyle = world.secondary;
    target.lineWidth = 4;
    target.beginPath();
    target.moveTo(-30, 0);
    target.lineTo(-90, -h * 0.22);
    target.moveTo(30, 0);
    target.lineTo(90, -h * 0.22);
    target.moveTo(-22, h * 0.24);
    target.lineTo(-68, h * 0.48);
    target.moveTo(22, h * 0.24);
    target.lineTo(68, h * 0.48);
    target.stroke();
  }

  function drawAiCoreBoss(target, boss, world) {
    const w = boss.w;
    const h = boss.h;
    target.beginPath();
    polygon(target, 0, 0, h * 0.45, 6, boss.age * 0.15);
    target.fill();
    target.stroke();
    drawRuneCircle(target, 0, 0, h * 0.58, world.secondary, boss.age);
    drawRuneCircle(target, 0, 0, h * 0.32, world.primary, -boss.age * 1.1);
    neonCircle(target, 0, 0, 34, world.accent, 0.95);
    target.strokeStyle = world.primary;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + boss.age * 0.2;
      target.beginPath();
      target.moveTo(Math.cos(a) * h * 0.6, Math.sin(a) * h * 0.6);
      target.lineTo(Math.cos(a) * w * 0.48, Math.sin(a) * h * 0.42);
      target.stroke();
    }
  }

  function drawBossBar(target, boss) {
    const pct = clamp(boss.hp / boss.maxHp, 0, 1);
    const world = worlds[boss.worldIndex];
    target.save();
    target.fillStyle = "rgba(2, 5, 14, 0.74)";
    target.fillRect(210, 506, 540, 12);
    target.strokeStyle = "rgba(255,255,255,0.22)";
    target.strokeRect(210, 506, 540, 12);
    target.fillStyle = world.secondary;
    target.shadowColor = world.secondary;
    target.shadowBlur = 12;
    target.fillRect(212, 508, 536 * pct, 8);
    target.restore();
  }

  function drawGem(target, gem) {
    target.save();
    target.translate(gem.x, gem.y);
    target.rotate(gem.life * 4);
    target.globalCompositeOperation = "lighter";
    target.fillStyle = gem.color;
    target.shadowColor = gem.color;
    target.shadowBlur = 12;
    target.beginPath();
    target.moveTo(0, -gem.r);
    target.lineTo(gem.r, 0);
    target.lineTo(0, gem.r);
    target.lineTo(-gem.r, 0);
    target.closePath();
    target.fill();
    target.restore();
  }

  function drawItem(target, item) {
    const color = itemColor(item.type);
    target.save();
    target.translate(item.x, item.y);
    target.rotate(item.spin);
    target.globalCompositeOperation = "lighter";
    target.strokeStyle = color;
    target.fillStyle = "rgba(2, 5, 14, 0.9)";
    target.shadowColor = color;
    target.shadowBlur = 18;
    target.lineWidth = 3;
    target.beginPath();
    polygon(target, 0, 0, item.r, 6, 0);
    target.fill();
    target.stroke();
    target.rotate(-item.spin);
    target.fillStyle = color;
    target.font = "900 14px system-ui";
    target.textAlign = "center";
    target.textBaseline = "middle";
    target.fillText(item.type[0].toUpperCase(), 0, 1);
    target.restore();
  }

  function itemColor(type) {
    if (type === "heart") return "#ff4d6d";
    if (type === "power") return "#ffd166";
    if (type === "shield") return "#35f2ff";
    return "#4dff91";
  }

  function createRunnerGame(difficulty) {
    const config = difficultyConfig[difficulty];
    const game = {
      type: "runner",
      difficulty,
      config,
      elapsed: 0,
      distance: 0,
      score: 0,
      worldIndex: 0,
      loop: 0,
      groundY: 430,
      spawnTimer: 0.8,
      boostSpawnTimer: 8,
      patternIndex: 0,
      obstacles: [],
      boosts: [],
      particles: [],
      player: {
        x: 180,
        y: 430 - 68,
        w: 34,
        h: 68,
        vy: 0,
        onGround: true,
        sliding: false,
        boost: 0,
        stride: 0,
        hitFlash: 0
      },
      keyDown(code) {
        if (code === "Space" || code === "ArrowUp" || code === "KeyW") {
          runnerJump(this);
        }
      },
      update(dt) {
        updateRunner(this, dt);
      },
      draw(target) {
        drawRunner(this, target);
      },
      metric() {
        return this.distance;
      },
      metricLabel(value) {
        return `DIST ${formatNumber(value)}M`;
      },
      hudMetric() {
        return `DIST ${formatNumber(this.distance)}M`;
      },
      hudPhase() {
        const remaining = RUNNER_WORLD_SECONDS - (this.elapsed % RUNNER_WORLD_SECONDS);
        return `SHIFT ${Math.ceil(remaining)}`;
      },
      hudStatus() {
        return this.player.boost > 0 ? `BOOST ${this.player.boost.toFixed(1)}` : "ONE HIT";
      }
    };
    return game;
  }

  function updateRunner(game, dt) {
    const speed = runnerSpeed(game);
    game.elapsed += dt;
    game.worldIndex = Math.floor(game.elapsed / RUNNER_WORLD_SECONDS) % worlds.length;
    game.loop = Math.floor(game.elapsed / (RUNNER_WORLD_SECONDS * worlds.length));
    game.distance += (speed * dt) / 8;
    game.score = game.distance;

    const player = game.player;
    player.boost = Math.max(0, player.boost - dt);
    player.hitFlash = Math.max(0, player.hitFlash - dt);
    player.stride += dt * speed * 0.045;
    player.sliding = player.onGround && (keys.has("ArrowDown") || keys.has("KeyS"));
    updateRunnerPlayer(game, dt);
    updateRunnerSpawns(game, dt, speed);
    updateRunnerObstacles(game, dt, speed);
    updateRunnerBoosts(game, dt, speed);
    updateParticles(game, dt);
  }

  function runnerSpeed(game) {
    return (305 + game.elapsed * 1.25 + game.loop * 34 + game.worldIndex * 11) * game.config.speed;
  }

  function runnerJump(game) {
    const p = game.player;
    if (!p.onGround) {
      return;
    }
    p.onGround = false;
    p.sliding = false;
    p.h = 68;
    p.y = game.groundY - p.h;
    p.vy = -635;
    audio.sfx("jump");
    for (let i = 0; i < 10; i += 1) {
      game.particles.push({
        x: p.x,
        y: game.groundY - 3,
        vx: random(-160, 20),
        vy: random(-90, -20),
        r: random(1.5, 3),
        life: random(0.2, 0.42),
        maxLife: 0.42,
        color: worlds[game.worldIndex].primary
      });
    }
  }

  function updateRunnerPlayer(game, dt) {
    const p = game.player;
    const targetH = p.sliding ? 36 : 68;
    const groundAvailable = isGroundAvailable(game, p.x + p.w * 0.45);

    if (p.onGround && !groundAvailable && p.boost <= 0) {
      p.onGround = false;
      p.vy = 70;
    }

    if (!p.onGround) {
      p.vy += 1720 * dt;
      p.y += p.vy * dt;
      p.h = 68;
      if (p.y + p.h >= game.groundY && groundAvailable) {
        p.y = game.groundY - p.h;
        p.vy = 0;
        p.onGround = true;
        landParticles(game);
      }
    } else {
      p.h += (targetH - p.h) * Math.min(1, dt * 18);
      p.y = game.groundY - p.h;
    }

    if (p.y > HEIGHT + 40) {
      finishGame(game);
    }
  }

  function isGroundAvailable(game, x) {
    for (const obstacle of game.obstacles) {
      if (obstacle.type === "gap" && x > obstacle.x && x < obstacle.x + obstacle.w) {
        return false;
      }
    }
    return true;
  }

  function landParticles(game) {
    const world = worlds[game.worldIndex];
    for (let i = 0; i < 12; i += 1) {
      game.particles.push({
        x: game.player.x + random(-10, 12),
        y: game.groundY,
        vx: random(-180, 40),
        vy: random(-80, -8),
        r: random(1.2, 3.2),
        life: random(0.18, 0.34),
        maxLife: 0.34,
        color: world.accent
      });
    }
    audio.sfx("land");
  }

  function updateRunnerSpawns(game, dt, speed) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      spawnRunnerPattern(game, speed);
      const pressure = 1 + game.elapsed / 340 + game.loop * 0.18;
      game.spawnTimer = clamp(random(0.72, 1.1) / (game.config.spawn * pressure), 0.46, 1.18);
    }

    game.boostSpawnTimer -= dt;
    if (game.boostSpawnTimer <= 0) {
      game.boostSpawnTimer = random(13, 20) / game.config.item;
      game.boosts.push({
        x: WIDTH + 70,
        y: game.groundY - random(96, 150),
        r: 16,
        spin: 0
      });
    }
  }

  function spawnRunnerPattern(game, speed) {
    const age = game.elapsed;
    const worldIndex = game.worldIndex;
    const simple = [["low"], ["high"], ["gap"], ["low"], ["high"]];
    const mixed = [
      ["low", "high"],
      ["gap", "low"],
      ["high", "gap"],
      ["low", "gap", "high"],
      ["high", "low", "gap"]
    ];
    const rhythm = [
      ["low", "low", "high"],
      ["gap", "gap", "low"],
      ["high", "low", "high"],
      ["low", "gap", "low", "high"]
    ];
    let bank = simple;
    if (age > 45) bank = mixed;
    if (age > 120) bank = rhythm;
    const pattern = randomChoice(bank);
    const spacing = clamp(210 - Math.min(70, age * 0.12) + speed * 0.04, 150, 250);
    pattern.forEach((type, index) => {
      spawnRunnerObstacle(game, type, WIDTH + 80 + index * spacing, worldIndex);
    });
  }

  function spawnRunnerObstacle(game, type, x, worldIndex) {
    if (type === "low") {
      game.obstacles.push({
        type,
        x,
        y: game.groundY - 52,
        w: random(36, 52),
        h: 52,
        worldIndex,
        scored: false,
        dead: false
      });
    } else if (type === "high") {
      game.obstacles.push({
        type,
        x,
        y: game.groundY - 86,
        w: random(54, 72),
        h: 40,
        worldIndex,
        scored: false,
        dead: false
      });
    } else {
      game.obstacles.push({
        type,
        x,
        y: game.groundY,
        w: random(92, 142),
        h: 0,
        worldIndex,
        scored: false,
        dead: false
      });
    }
  }

  function updateRunnerObstacles(game, dt, speed) {
    const playerRect = runnerPlayerRect(game);
    for (let i = game.obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = game.obstacles[i];
      obstacle.x -= speed * dt;

      if (!obstacle.scored && obstacle.x + obstacle.w < game.player.x) {
        obstacle.scored = true;
        game.distance += 10 * game.config.score;
      }

      if (obstacle.dead || obstacle.x + obstacle.w < -120) {
        game.obstacles.splice(i, 1);
        continue;
      }

      if (obstacle.type !== "gap") {
        const obstacleRect = {
          x: obstacle.x,
          y: obstacle.y,
          w: obstacle.w,
          h: obstacle.h
        };
        if (rectsOverlap(playerRect, obstacleRect)) {
          if (game.player.boost > 0) {
            obstacle.dead = true;
            burst(game, obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, worlds[obstacle.worldIndex].secondary, 18, 220);
            state.shake = 0.45;
            audio.sfx("break");
          } else {
            game.player.hitFlash = 0.5;
            state.shake = 1.1;
            finishGame(game);
          }
        }
      }
    }
  }

  function updateRunnerBoosts(game, dt, speed) {
    const playerRect = runnerPlayerRect(game);
    for (let i = game.boosts.length - 1; i >= 0; i -= 1) {
      const boost = game.boosts[i];
      boost.x -= speed * dt;
      boost.spin += dt * 5;
      const rect = { x: boost.x - boost.r, y: boost.y - boost.r, w: boost.r * 2, h: boost.r * 2 };
      if (rectsOverlap(playerRect, rect)) {
        game.player.boost = 6.2;
        burst(game, boost.x, boost.y, worlds[game.worldIndex].accent, 28, 250);
        game.boosts.splice(i, 1);
        state.shake = 0.55;
        audio.sfx("boost");
      } else if (boost.x < -40) {
        game.boosts.splice(i, 1);
      }
    }
  }

  function runnerPlayerRect(game) {
    const p = game.player;
    return {
      x: p.x - p.w / 2,
      y: p.y,
      w: p.w,
      h: p.h
    };
  }

  function drawRunner(game, target) {
    drawWorldBackground(target, game.worldIndex, game.elapsed, "runner", runnerSpeed(game) / 320);
    drawRunnerGround(target, game);
    game.boosts.forEach((boost) => drawRunnerBoost(target, game, boost));
    game.obstacles.forEach((obstacle) => drawRunnerObstacle(target, game, obstacle));
    drawRunnerPlayer(target, game);
    drawParticles(target, game.particles);
  }

  function drawRunnerGround(target, game) {
    const world = worlds[game.worldIndex];
    const speed = runnerSpeed(game);
    target.save();
    target.fillStyle = "rgba(2, 5, 14, 0.78)";
    target.fillRect(0, game.groundY, WIDTH, HEIGHT - game.groundY);
    target.strokeStyle = world.primary;
    target.shadowColor = world.primary;
    target.shadowBlur = 14;
    target.lineWidth = 3;
    target.beginPath();
    target.moveTo(0, game.groundY);
    target.lineTo(WIDTH, game.groundY);
    target.stroke();

    target.globalAlpha = 0.65;
    target.lineWidth = 1;
    for (let x = -120; x < WIDTH + 120; x += 64) {
      const sx = (x - (game.elapsed * speed * 0.35) % 64 + 64) % (WIDTH + 128) - 64;
      target.beginPath();
      target.moveTo(sx, game.groundY);
      target.lineTo(sx - 80, HEIGHT);
      target.stroke();
    }

    game.obstacles.forEach((obstacle) => {
      if (obstacle.type === "gap") {
        target.save();
        target.globalCompositeOperation = "source-over";
        target.fillStyle = "#02050e";
        target.fillRect(obstacle.x, game.groundY - 5, obstacle.w, HEIGHT - game.groundY + 10);
        target.strokeStyle = world.secondary;
        target.shadowColor = world.secondary;
        target.shadowBlur = 16;
        target.lineWidth = 4;
        target.beginPath();
        target.moveTo(obstacle.x, game.groundY);
        target.lineTo(obstacle.x, HEIGHT);
        target.moveTo(obstacle.x + obstacle.w, game.groundY);
        target.lineTo(obstacle.x + obstacle.w, HEIGHT);
        target.stroke();
        target.restore();
      }
    });
    target.restore();
  }

  function drawRunnerObstacle(target, game, obstacle) {
    if (obstacle.type === "gap") {
      return;
    }
    const world = worlds[obstacle.worldIndex];
    target.save();
    target.translate(obstacle.x, obstacle.y);
    target.globalCompositeOperation = "lighter";
    target.strokeStyle = world.secondary;
    target.fillStyle = "rgba(5, 12, 28, 0.9)";
    target.shadowColor = world.secondary;
    target.shadowBlur = 18;
    target.lineWidth = 3;

    if (obstacle.type === "low") {
      if (obstacle.worldIndex === 1) {
        target.beginPath();
        target.moveTo(0, obstacle.h);
        target.lineTo(obstacle.w * 0.5, 0);
        target.lineTo(obstacle.w, obstacle.h);
        target.closePath();
      } else if (obstacle.worldIndex === 2) {
        target.beginPath();
        target.ellipse(obstacle.w * 0.5, obstacle.h * 0.5, obstacle.w * 0.48, obstacle.h * 0.5, 0, 0, Math.PI * 2);
      } else {
        target.beginPath();
        target.rect(0, 0, obstacle.w, obstacle.h);
      }
      target.fill();
      target.stroke();
      target.strokeStyle = world.primary;
      target.beginPath();
      target.moveTo(6, obstacle.h * 0.5);
      target.lineTo(obstacle.w - 6, obstacle.h * 0.5);
      target.stroke();
    } else {
      roundRect(target, 0, 0, obstacle.w, obstacle.h, 5);
      target.fill();
      target.stroke();
      target.strokeStyle = world.primary;
      target.beginPath();
      target.moveTo(8, obstacle.h * 0.5);
      target.lineTo(obstacle.w - 8, obstacle.h * 0.5);
      target.stroke();
    }
    target.restore();
  }

  function drawRunnerBoost(target, game, boost) {
    const world = worlds[game.worldIndex];
    target.save();
    target.translate(boost.x, boost.y);
    target.rotate(boost.spin);
    target.globalCompositeOperation = "lighter";
    target.fillStyle = world.accent;
    target.strokeStyle = "#ffffff";
    target.shadowColor = world.accent;
    target.shadowBlur = 20;
    target.lineWidth = 2;
    target.beginPath();
    target.moveTo(0, -boost.r);
    target.lineTo(boost.r, 0);
    target.lineTo(0, boost.r);
    target.lineTo(-boost.r, 0);
    target.closePath();
    target.fill();
    target.stroke();
    target.restore();
  }

  function drawRunnerPlayer(target, game) {
    const p = game.player;
    const world = worlds[game.worldIndex];
    const boost = p.boost > 0;
    const stride = p.stride;
    const bob = p.onGround && !p.sliding ? Math.sin(stride * 2) * 3 : 0;
    const x = p.x;
    const y = p.y + bob;

    target.save();
    target.globalCompositeOperation = "lighter";

    if (boost) {
      for (let i = 0; i < 4; i += 1) {
        target.globalAlpha = 0.15 - i * 0.025;
        drawRunnerBody(target, x - 18 * (i + 1), y, p, world, true, stride - i * 0.3);
      }
      target.globalAlpha = 1;
    }

    drawRunnerBody(target, x, y, p, world, boost, stride);
    target.restore();
  }

  function drawRunnerBody(target, x, y, p, world, boost, stride) {
    target.save();
    target.translate(x, y);
    target.strokeStyle = boost ? world.accent : world.primary;
    target.fillStyle = "rgba(5, 12, 28, 0.96)";
    target.shadowColor = boost ? world.accent : world.primary;
    target.shadowBlur = boost ? 24 : 15;
    target.lineWidth = 5;
    target.lineCap = "round";

    if (p.sliding) {
      target.beginPath();
      target.moveTo(-20, p.h * 0.68);
      target.lineTo(10, p.h * 0.42);
      target.lineTo(28, p.h * 0.65);
      target.stroke();
      target.beginPath();
      target.arc(2, p.h * 0.2, 12, 0, Math.PI * 2);
      target.fill();
      target.stroke();
      target.lineWidth = 4;
      target.beginPath();
      target.moveTo(3, p.h * 0.33);
      target.lineTo(-24, p.h * 0.66);
      target.moveTo(-4, p.h * 0.44);
      target.lineTo(26, p.h * 0.7);
      target.stroke();
    } else {
      const legA = Math.sin(stride) * 18;
      const legB = Math.sin(stride + Math.PI) * 18;
      const armA = Math.sin(stride + Math.PI) * 15;
      const armB = Math.sin(stride) * 15;
      target.beginPath();
      target.arc(0, 12, 13, 0, Math.PI * 2);
      target.fill();
      target.stroke();
      target.beginPath();
      target.moveTo(0, 26);
      target.lineTo(0, 48);
      target.moveTo(0, 32);
      target.lineTo(-18, 42 + armA);
      target.moveTo(0, 33);
      target.lineTo(18, 42 + armB);
      target.moveTo(0, 48);
      target.lineTo(-16, 68 + legA);
      target.moveTo(0, 48);
      target.lineTo(18, 68 + legB);
      target.stroke();
      target.strokeStyle = world.secondary;
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(-8, 11);
      target.lineTo(9, 11);
      target.stroke();
    }

    if (p.hitFlash > 0) {
      target.globalAlpha = p.hitFlash / 0.5;
      target.strokeStyle = "#ff2448";
      target.shadowColor = "#ff2448";
      target.shadowBlur = 24;
      target.strokeRect(-24, 0, 48, p.h);
    }
    target.restore();
  }

  function drawParticles(target, particles) {
    target.save();
    target.globalCompositeOperation = "lighter";
    particles.forEach((p) => {
      const alpha = clamp(p.life / (p.maxLife || 1), 0, 1);
      target.globalAlpha = alpha;
      target.fillStyle = p.color;
      target.shadowColor = p.color;
      target.shadowBlur = 10;
      target.beginPath();
      target.arc(p.x, p.y, p.r * (1 + (1 - alpha) * 1.2), 0, Math.PI * 2);
      target.fill();
    });
    target.restore();
  }

  function drawWorldBackground(target, worldIndex, time, mode, speedFactor) {
    const world = worlds[worldIndex];
    const gradient = target.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, world.base);
    gradient.addColorStop(0.52, "#02050e");
    gradient.addColorStop(1, world.deep);
    target.fillStyle = gradient;
    target.fillRect(0, 0, WIDTH, HEIGHT);

    target.save();
    target.globalCompositeOperation = "lighter";
    bgDots.forEach((dot) => {
      let x = dot.x;
      let y = dot.y;
      if (mode === "shooting") {
        y = (dot.y + time * 28 * dot.z * speedFactor) % HEIGHT;
        x = dot.x + Math.sin(time * 0.4 + dot.seed) * 16 * dot.z;
      } else if (mode === "runner") {
        x = (dot.x - time * 42 * dot.z * speedFactor) % WIDTH;
        if (x < 0) x += WIDTH;
        y = dot.y + Math.sin(time * 0.6 + dot.seed) * 8;
      } else {
        x = dot.x + Math.sin(time * 0.3 + dot.seed) * 10;
        y = dot.y + Math.cos(time * 0.28 + dot.seed) * 8;
      }
      const alpha = 0.18 + dot.z * 0.18;
      target.globalAlpha = alpha;
      target.fillStyle = dot.z > 0.95 ? world.primary : world.secondary;
      target.beginPath();
      target.arc(x, y, dot.r, 0, Math.PI * 2);
      target.fill();
    });
    target.globalAlpha = 1;

    if (world.id === "space") {
      drawSpaceLayer(target, world, time, mode);
    } else if (world.id === "fantasy") {
      drawFantasyLayer(target, world, time);
    } else if (world.id === "sea") {
      drawSeaLayer(target, world, time, mode);
    } else {
      drawCyberLayer(target, world, time, mode, speedFactor);
    }
    target.restore();

    const vignette = target.createRadialGradient(WIDTH / 2, HEIGHT / 2, 130, WIDTH / 2, HEIGHT / 2, 610);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.5)");
    target.fillStyle = vignette;
    target.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function drawSpaceLayer(target, world, time) {
    target.strokeStyle = world.secondary;
    target.lineWidth = 1;
    target.globalAlpha = 0.34;
    for (let i = 0; i < 9; i += 1) {
      const y = (i * 74 + time * 38) % (HEIGHT + 90) - 45;
      target.beginPath();
      target.moveTo(80 + Math.sin(time + i) * 30, y);
      target.lineTo(WIDTH - 80, y + Math.cos(time * 0.6 + i) * 22);
      target.stroke();
    }
    target.globalAlpha = 0.52;
    target.strokeStyle = world.primary;
    target.beginPath();
    target.arc(120, 92, 48 + Math.sin(time) * 3, 0, Math.PI * 2);
    target.stroke();
  }

  function drawFantasyLayer(target, world, time) {
    target.globalAlpha = 0.44;
    drawRuneCircle(target, WIDTH * 0.22, HEIGHT * 0.26, 76, world.secondary, time * 0.45);
    drawRuneCircle(target, WIDTH * 0.78, HEIGHT * 0.68, 96, world.accent, -time * 0.32);
    target.strokeStyle = world.primary;
    target.lineWidth = 1.5;
    for (let i = 0; i < 7; i += 1) {
      const x = (i * 150 + Math.sin(time + i) * 24) % WIDTH;
      target.beginPath();
      target.moveTo(x, 0);
      target.quadraticCurveTo(x + 40, HEIGHT * 0.5, x - 20, HEIGHT);
      target.stroke();
    }
  }

  function drawSeaLayer(target, world, time, mode) {
    target.strokeStyle = world.primary;
    target.lineWidth = 2;
    for (let i = 0; i < 7; i += 1) {
      target.globalAlpha = 0.22 + i * 0.035;
      const y = 80 + i * 58;
      target.beginPath();
      for (let x = 0; x <= WIDTH; x += 28) {
        const yy = y + Math.sin(x * 0.018 + time * (mode === "runner" ? 2.3 : 1.4) + i) * 12;
        if (x === 0) {
          target.moveTo(x, yy);
        } else {
          target.lineTo(x, yy);
        }
      }
      target.stroke();
    }
    target.globalAlpha = 0.5;
    target.fillStyle = world.secondary;
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 83 + Math.sin(time + i) * 20) % WIDTH;
      const y = HEIGHT - ((time * 26 + i * 47) % (HEIGHT + 70));
      target.beginPath();
      target.arc(x, y, 3 + (i % 4), 0, Math.PI * 2);
      target.fill();
    }
  }

  function drawCyberLayer(target, world, time, mode, speedFactor) {
    target.globalAlpha = 0.5;
    target.strokeStyle = world.primary;
    target.lineWidth = 1;
    const horizon = HEIGHT * 0.56;
    for (let i = 0; i < 18; i += 1) {
      const x = i * 64 - ((mode === "runner" ? time * 85 * speedFactor : 0) % 64);
      target.beginPath();
      target.moveTo(x, horizon);
      target.lineTo(x - 220, HEIGHT);
      target.stroke();
    }
    for (let i = 0; i < 9; i += 1) {
      const y = horizon + i * 28 + ((time * 20) % 28);
      target.beginPath();
      target.moveTo(0, y);
      target.lineTo(WIDTH, y);
      target.stroke();
    }

    target.globalAlpha = 0.38;
    for (let i = 0; i < 18; i += 1) {
      const w = 32 + (i % 5) * 13;
      const h = 60 + ((i * 37) % 130);
      const x = i * 62 - ((mode === "runner" ? time * 55 * speedFactor : 0) % 62);
      target.fillStyle = i % 2 ? world.secondary : world.primary;
      target.fillRect(x, horizon - h, w, h);
    }
  }

  function drawAttractVignette(target, time) {
    target.save();
    target.globalCompositeOperation = "lighter";
    target.strokeStyle = "rgba(255,255,255,0.22)";
    target.lineWidth = 2;
    target.beginPath();
    target.arc(WIDTH / 2, HEIGHT / 2, 150 + Math.sin(time * 1.4) * 12, 0, Math.PI * 2);
    target.stroke();
    target.restore();
  }

  function burst(game, x, y, color, count, power) {
    for (let i = 0; i < count; i += 1) {
      const a = random(0, Math.PI * 2);
      const s = random(power * 0.2, power);
      game.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: random(1.2, 4.2),
        life: random(0.28, 0.76),
        maxLife: 0.76,
        color
      });
    }
  }

  function AudioSystem() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.nextNote = 0;
    this.step = 0;
    this.ready = false;
  }

  AudioSystem.prototype.unlock = function unlock() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      this.ctx = new AudioContextClass();
      this.master = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.master.gain.value = 0.72;
      this.sfxGain.gain.value = 0.32;
      this.bgmGain.gain.value = 0.14;
      this.sfxGain.connect(this.master);
      this.bgmGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.nextNote = this.ctx.currentTime + 0.04;
      this.ready = true;
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  };

  AudioSystem.prototype.update = function update(dt, worldIndex) {
    if (!dt || !settings.bgm || !this.ready || !this.ctx || this.ctx.state !== "running") {
      return;
    }
    const now = this.ctx.currentTime;
    if (this.nextNote < now - 0.5) {
      this.nextNote = now + 0.04;
    }
    const scales = [
      [110, 165, 220, 330, 247, 220, 165, 147],
      [98, 147, 196, 294, 262, 196, 147, 131],
      [82, 123, 164, 246, 220, 164, 123, 110],
      [123, 185, 247, 370, 311, 247, 185, 165]
    ];
    while (this.nextNote < now + 0.08) {
      const seq = scales[worldIndex % scales.length];
      const freq = seq[this.step % seq.length] * (this.step % 16 === 12 ? 2 : 1);
      this.tone(freq, 0.09, "sawtooth", 0.05, this.bgmGain, this.nextNote);
      if (this.step % 4 === 0) {
        this.tone(freq / 2, 0.16, "triangle", 0.035, this.bgmGain, this.nextNote);
      }
      this.step += 1;
      this.nextNote += 0.18;
    }
  };

  AudioSystem.prototype.sfx = function sfx(name) {
    if (!settings.sfx || !this.ready || !this.ctx || this.ctx.state !== "running") {
      return;
    }
    const now = this.ctx.currentTime;
    if (name === "shoot") this.tone(random(610, 760), 0.045, "square", 0.045, this.sfxGain, now);
    if (name === "enemyShoot") this.tone(random(190, 260), 0.08, "sawtooth", 0.05, this.sfxGain, now);
    if (name === "explode") this.noise(0.18, 0.12, this.sfxGain, now);
    if (name === "bossDown") this.noise(0.5, 0.22, this.sfxGain, now);
    if (name === "boss") this.tone(92, 0.45, "sawtooth", 0.12, this.sfxGain, now);
    if (name === "hurt") this.tone(110, 0.16, "sawtooth", 0.12, this.sfxGain, now);
    if (name === "shield") this.tone(460, 0.12, "triangle", 0.1, this.sfxGain, now);
    if (name === "power") this.tone(520, 0.08, "triangle", 0.09, this.sfxGain, now);
    if (name === "gem") this.tone(840, 0.045, "sine", 0.05, this.sfxGain, now);
    if (name === "jump") this.tone(330, 0.08, "triangle", 0.09, this.sfxGain, now);
    if (name === "land") this.noise(0.06, 0.05, this.sfxGain, now);
    if (name === "boost") this.tone(720, 0.2, "sawtooth", 0.12, this.sfxGain, now);
    if (name === "break") this.noise(0.14, 0.1, this.sfxGain, now);
    if (name === "pause") this.tone(180, 0.12, "triangle", 0.08, this.sfxGain, now);
    if (name === "gameover") this.tone(72, 0.55, "sawtooth", 0.16, this.sfxGain, now);
    if (name === "select") this.tone(420, 0.06, "sine", 0.07, this.sfxGain, now);
    if (name === "start") {
      this.tone(360, 0.08, "triangle", 0.08, this.sfxGain, now);
      this.tone(720, 0.12, "triangle", 0.08, this.sfxGain, now + 0.08);
    }
  };

  AudioSystem.prototype.resetBgmClock = function resetBgmClock() {
    if (this.ctx) {
      this.nextNote = this.ctx.currentTime + 0.04;
    }
  };

  AudioSystem.prototype.tone = function tone(freq, duration, type, volume, destination, when) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  };

  AudioSystem.prototype.noise = function noise(duration, volume, destination, when) {
    if (!this.ctx) return;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(gain);
    gain.connect(destination);
    source.start(when);
    source.stop(when + duration);
  };

  function neonCircle(target, x, y, r, color, alpha) {
    target.save();
    target.globalAlpha *= alpha;
    target.fillStyle = color;
    target.shadowColor = color;
    target.shadowBlur = 18;
    target.beginPath();
    target.arc(x, y, r, 0, Math.PI * 2);
    target.fill();
    target.restore();
  }

  function drawRuneCircle(target, x, y, r, color, rotation) {
    target.save();
    target.translate(x, y);
    target.rotate(rotation);
    target.strokeStyle = color;
    target.shadowColor = color;
    target.shadowBlur = 15;
    target.lineWidth = 2;
    target.beginPath();
    target.arc(0, 0, r, 0, Math.PI * 2);
    target.stroke();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      target.beginPath();
      target.moveTo(Math.cos(a) * (r - 12), Math.sin(a) * (r - 12));
      target.lineTo(Math.cos(a) * (r + 8), Math.sin(a) * (r + 8));
      target.stroke();
    }
    target.restore();
  }

  function polygon(target, x, y, r, sides, rotation) {
    target.moveTo(x + Math.cos(rotation) * r, y + Math.sin(rotation) * r);
    for (let i = 1; i <= sides; i += 1) {
      const a = rotation + (i / sides) * Math.PI * 2;
      target.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
  }

  function roundRect(target, x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    target.beginPath();
    target.moveTo(x + radius, y);
    target.lineTo(x + w - radius, y);
    target.quadraticCurveTo(x + w, y, x + w, y + radius);
    target.lineTo(x + w, y + h - radius);
    target.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    target.lineTo(x + radius, y + h);
    target.quadraticCurveTo(x, y + h, x, y + h - radius);
    target.lineTo(x, y + radius);
    target.quadraticCurveTo(x, y, x + radius, y);
    target.closePath();
  }

  function bossRect(boss) {
    return {
      x: boss.x - boss.w / 2,
      y: boss.y - boss.h / 2,
      w: boss.w,
      h: boss.h
    };
  }

  function rectCircleCollision(rect, cx, cy, r) {
    const closestX = clamp(cx, rect.x, rect.x + rect.w);
    const closestY = clamp(cy, rect.y, rect.y + rect.h);
    return distance(cx, cy, closestX, closestY) <= r;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomChoice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function formatNumber(value) {
    return Math.floor(value).toLocaleString("en-US");
  }
})();
