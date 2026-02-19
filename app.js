/* ═══════════════════════════════════════════
   BLINK TRIVIA — Game Logic
   ═══════════════════════════════════════════ */

// ── Constants ────────────────────────────

const TOTAL_ROUNDS = 10;
const NEXT_ROUND_DELAY_MS = 3000;
const PLAY_TIMEOUT_MS = 6000;
const SPOTIFY_INIT_TIMEOUT_MS = 6000;
const TIMER_TICK_MS = 50;
const MIN_PLAY_DELAY_MS = 300;
const TARGET_LOAD_DELAY_MS = 1000;
const PLAY_RETRY_DELAY_MS = 2000;
const STOP_RETRY_DELAY_MS = 300;
const MIN_ADVANCE_DELAY_MS = 1000;
const INPUT_FOCUS_DELAY_MS = 100;
const SCORE_BUMP_MS = 400;
const TOAST_DURATION_MS = 3000;
const CONFETTI_DURATION_MS = 5000;
const CONFETTI_PIECE_COUNT = 60;
const WAVEFORM_BAR_COUNT = 32;
const FUZZY_THRESHOLD = 0.55;
const STORAGE_KEY = 'blink_trivia_save';

const DIFFICULTY = {
  easy:   { duration: 7.5 },
  medium: { duration: 5 },
  hard:   { duration: 2.5 },
};

// ── State ────────────────────────────────
// All game state consolidated into a single object.

const state = {
  screen: 'start',
  difficulty: 'medium',
  round: 0,
  score: 0,
  roundSongs: [],
  roundResults: [],
  playedSongIds: new Set(),

  currentOptions: [],
  correctIndex: -1,
  answered: false,

  isPlaying: false,
  hasPlayedSnippet: false,
  fallbackMode: false,
  playbackDetected: false,
  embedIsPlaying: false,
  trackLoadedAt: 0,
  answeredAt: 0,
  timerStart: 0,
};

// Timer/interval IDs (separate from game state for clarity)
const timers = {
  tick: null,
  nextRound: null,
  playTimeout: null,
  playRetry: null,
};

// Spotify embed controller (infrastructure, not game state)
let embedController = null;
let spotifyReady = false;
let pendingRestore = null;

// ── DOM Refs ─────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let screens = {};

// ── Data Validation ──────────────────────

function validateSongs() {
  if (!Array.isArray(SONGS) || SONGS.length === 0) {
    console.error('SONGS array is empty or missing');
    return false;
  }

  const validMembers = new Set(['group', 'jennie', 'lisa', 'rose', 'jisoo']);
  const ids = new Set();
  let valid = true;

  SONGS.forEach((song, i) => {
    if (!song.id || typeof song.id !== 'string') {
      console.warn(`Song at index ${i}: invalid or missing id`);
      valid = false;
    }
    if (ids.has(song.id)) {
      console.warn(`Song at index ${i}: duplicate id "${song.id}"`);
    }
    ids.add(song.id);

    if (!song.title) {
      console.warn(`Song "${song.id}": missing title`);
      valid = false;
    }
    if (!song.artist) {
      console.warn(`Song "${song.id}": missing artist`);
    }
    if (!validMembers.has(song.member)) {
      console.warn(`Song "${song.id}": invalid member "${song.member}"`);
    }
    if (!Array.isArray(song.safe) || song.safe.length === 0) {
      console.warn(`Song "${song.id}": missing safe timestamps`);
    }
  });

  return valid;
}

// ── Session Persistence ──────────────────

function saveGame() {
  try {
    const data = {
      difficulty: state.difficulty,
      round: state.round,
      score: state.score,
      roundSongIds: state.roundSongs.map((s) => s.id),
      playedSongIds: [...state.playedSongIds],
      roundResults: state.roundResults,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }
}

function clearSavedGame() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

function loadSavedGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data.roundSongIds || !Array.isArray(data.roundSongIds)) return null;
    if (typeof data.round !== 'number' || data.round < 0) return null;
    if (typeof data.score !== 'number') return null;

    // Resolve song IDs back to song objects
    const songMap = new Map(SONGS.map((s) => [s.id, s]));
    const roundSongs = data.roundSongIds.map((id) => songMap.get(id)).filter(Boolean);
    if (roundSongs.length < TOTAL_ROUNDS) {
      clearSavedGame();
      return null;
    }

    return {
      difficulty: data.difficulty || 'medium',
      round: data.round,
      score: data.score,
      roundSongs,
      playedSongIds: new Set(data.playedSongIds || []),
      roundResults: data.roundResults || [],
    };
  } catch (e) {
    clearSavedGame();
    return null;
  }
}

// ── Init ─────────────────────────────────

function init() {
  validateSongs();

  screens = {
    start: $('#start-screen'),
    game: $('#game-screen'),
    end: $('#end-screen'),
  };

  $('#song-count').textContent = SONGS.length;
  $('#start-btn').addEventListener('click', startGame);
  $('#replay-btn').addEventListener('click', startGame);
  $('#play-btn').addEventListener('click', playSnippet);
  $('#guess-submit').addEventListener('click', submitGuess);
  $('#reset-btn').addEventListener('click', resetToStart);
  $('#total-rounds').textContent = TOTAL_ROUNDS;

  // Difficulty picker
  $$('.diff-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.diff-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.difficulty = btn.dataset.mode;
    });
  });

  // Submit on Enter in text input
  $('#guess-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitGuess();
    }
  });

  // Generate waveform bars
  const wf = $('#waveform');
  for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.setProperty('--max-h', (12 + Math.random() * 36) + 'px');
    bar.style.animationDelay = (i * 0.04) + 's';
    wf.appendChild(bar);
  }

  // Generate progress dots
  const progress = $('#round-progress');
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const dot = document.createElement('div');
    dot.className = 'round-dot';
    progress.appendChild(dot);
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeydown);

  initSpotifyEmbed();

  // Check for saved game
  const saved = loadSavedGame();
  if (saved) {
    pendingRestore = saved;
    $('#loading-text').textContent = 'Resuming game...';
  }

  // Spotify init timeout / fallback
  setTimeout(() => {
    if (!spotifyReady) {
      state.fallbackMode = true;
      if (pendingRestore) {
        restoreGame(pendingRestore);
        pendingRestore = null;
      } else {
        $('#start-btn').disabled = false;
        $('#loading-text').textContent = 'Using Spotify player fallback';
      }
    }
  }, SPOTIFY_INIT_TIMEOUT_MS);
}

function handleKeydown(e) {
  if (state.screen === 'start' && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    if (!$('#start-btn').disabled) startGame();
  } else if (state.screen === 'end' && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    startGame();
  } else if (state.screen === 'game' && (e.key === ' ' || e.key === 'Enter') && document.activeElement !== $('#guess-input')) {
    e.preventDefault();
    if (state.answered && timers.nextRound && (Date.now() - state.answeredAt) > MIN_ADVANCE_DELAY_MS) {
      clearTimeout(timers.nextRound);
      timers.nextRound = null;
      state.round++;
      if (state.round >= TOTAL_ROUNDS) { showEndScreen(); } else { showRound(); }
    } else {
      playSnippet();
    }
  } else if (state.screen === 'game' && isEasyMode() && e.key >= '1' && e.key <= '4') {
    handleAnswer(parseInt(e.key) - 1);
  }
}

// ── Spotify Embed ────────────────────────

function initSpotifyEmbed() {
  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    const el = $('#spotify-embed');
    const options = {
      width: '100%',
      height: '100%',
      uri: 'spotify:track:' + SONGS[0].id,
    };

    IFrameAPI.createController(el, options, (controller) => {
      embedController = controller;
      spotifyReady = true;

      $('#start-btn').disabled = false;
      const loadingEl = $('#loading-text');
      if (loadingEl) loadingEl.style.display = 'none';

      const iframe = el.querySelector('iframe');
      if (iframe) {
        iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      }

      controller.addListener('playback_update', (e) => {
        if (e && e.data && typeof e.data.isPaused === 'boolean') {
          state.embedIsPlaying = !e.data.isPaused;
          if (state.embedIsPlaying) state.playbackDetected = true;
        }
      });

      // Restore saved game once Spotify is ready
      if (pendingRestore) {
        restoreGame(pendingRestore);
        pendingRestore = null;
      }
    });
  };
}

function createFallbackEmbed(trackId) {
  const layer = $('#spotify-layer');
  layer.innerHTML = `<iframe
    src="https://open.spotify.com/embed/track/${encodeURIComponent(trackId)}?theme=0&utm_source=generator"
    width="100%" height="80" frameborder="0"
    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    loading="lazy"
    style="border-radius:12px; border:none;">
  </iframe>`;
}

// ── Screen Management ────────────────────

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
  state.screen = name;
}

// ── Helpers ──────────────────────────────

function isEasyMode() {
  return state.difficulty === 'easy';
}

function snippetDuration() {
  return DIFFICULTY[state.difficulty].duration;
}

function clearAllTimers() {
  clearInterval(timers.tick);
  clearTimeout(timers.nextRound);
  clearTimeout(timers.playTimeout);
  clearTimeout(timers.playRetry);
  timers.tick = null;
  timers.nextRound = null;
  timers.playTimeout = null;
  timers.playRetry = null;
}

// ── Restore Game ─────────────────────────

function restoreGame(saved) {
  clearAllTimers();

  if (embedController && state.embedIsPlaying) {
    try { embedController.togglePlay(); } catch (e) {}
  }

  state.difficulty = saved.difficulty;
  state.score = saved.score;
  state.roundSongs = saved.roundSongs;
  state.playedSongIds = saved.playedSongIds;
  state.roundResults = saved.roundResults || [];
  state.answered = false;
  state.isPlaying = false;
  state.hasPlayedSnippet = false;

  // If the saved round was already answered, advance past it
  state.round = Math.max(saved.round, state.roundResults.length);

  if (state.round >= TOTAL_ROUNDS) {
    showEndScreen();
    return;
  }

  // Sync difficulty picker UI
  $$('.diff-btn').forEach((b) => {
    b.classList.toggle('selected', b.dataset.mode === state.difficulty);
  });

  showScreen('game');
  showRound();
}

// ── Start Game ───────────────────────────

function resetToStart() {
  clearAllTimers();
  clearSavedGame();

  if (embedController && state.embedIsPlaying) {
    try { embedController.togglePlay(); } catch (e) {}
  }

  state.isPlaying = false;
  state.answered = false;
  showScreen('start');
}

function startGame() {
  pendingRestore = null;
  clearAllTimers();

  if (embedController && state.embedIsPlaying) {
    try { embedController.togglePlay(); } catch (e) {}
  }

  state.round = 0;
  state.score = 0;
  state.answered = false;
  state.isPlaying = false;
  state.hasPlayedSnippet = false;
  state.roundResults = [];

  state.roundSongs = pickRandomSongs(TOTAL_ROUNDS);

  showScreen('game');
  showRound();
}

function pickRandomSongs(count) {
  let available = SONGS.filter((s) => !state.playedSongIds.has(s.id));
  if (available.length < count) {
    state.playedSongIds.clear();
    available = [...SONGS];
  }
  const shuffled = available.sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);
  picked.forEach((s) => state.playedSongIds.add(s.id));
  return picked;
}

// ── Show Round ───────────────────────────

function showRound() {
  const song = state.roundSongs[state.round];
  state.answered = false;
  state.isPlaying = false;
  state.hasPlayedSnippet = false;
  state.playbackDetected = false;

  $('#round-num').textContent = state.round + 1;
  $('#score-display').textContent = state.score;
  updateProgress();
  saveGame();

  // Toggle answer UI based on mode
  if (isEasyMode()) {
    $('#options').classList.add('active');
    $('#guess-area').style.display = 'none';

    const options = generateOptions(song);
    state.currentOptions = options;
    state.correctIndex = options.findIndex((o) => o.id === song.id);
    renderOptions(options);
  } else {
    $('#options').classList.remove('active');
    $('#options').innerHTML = '';
    $('#guess-area').style.display = '';

    const input = $('#guess-input');
    input.value = '';
    input.disabled = false;
    input.className = 'guess-input';
    input.placeholder = 'Type the song name...';
    $('#guess-submit').disabled = false;
  }

  resetPlayerUI();

  // Load track
  const playerArea = $('.player-area');
  if (state.fallbackMode) {
    playerArea.classList.add('fallback-mode');
    createFallbackEmbed(song.id);
  } else {
    playerArea.classList.remove('fallback-mode');
    if (embedController && spotifyReady) {
      state.trackLoadedAt = Date.now();
      embedController.loadUri('spotify:track:' + song.id);
    }
  }

  $('.answer-reveal').classList.remove('visible');

  const nrBar = $('.next-round-bar');
  if (nrBar) {
    nrBar.classList.remove('visible');
    nrBar.querySelector('.next-round-fill').style.width = '100%';
  }

  // Focus input in text modes
  if (!isEasyMode()) {
    setTimeout(() => $('#guess-input').focus(), INPUT_FOCUS_DELAY_MS);
  }
}

function updateProgress() {
  const dots = $$('.round-dot');
  dots.forEach((dot, i) => {
    dot.className = 'round-dot';
    if (state.roundResults[i]) {
      dot.classList.add(state.roundResults[i]);
    } else if (i === state.round) {
      dot.classList.add('current');
    }
  });
}

// ── Options (Easy Mode) ─────────────────

function generateOptions(correctSong) {
  const options = [correctSong];
  const sameMember = SONGS.filter(
    (s) => s.member === correctSong.member && s.id !== correctSong.id
  );
  const other = SONGS.filter(
    (s) => s.member !== correctSong.member
  );

  const shuffledSame = sameMember.sort(() => Math.random() - 0.5);
  const shuffledOther = other.sort(() => Math.random() - 0.5);

  if (shuffledSame.length > 0) options.push(shuffledSame[0]);

  const pool = shuffledSame.length > 0 ? shuffledOther : [...shuffledSame, ...shuffledOther].sort(() => Math.random() - 0.5);
  let i = 0;
  while (options.length < 4 && i < pool.length) {
    if (!options.find((o) => o.id === pool[i].id)) options.push(pool[i]);
    i++;
  }

  if (options.length < 4) {
    const remaining = SONGS.filter((s) => !options.find((o) => o.id === s.id));
    for (const s of remaining) {
      if (options.length >= 4) break;
      options.push(s);
    }
  }

  return options.sort(() => Math.random() - 0.5);
}

function renderOptions(options) {
  const container = $('#options');
  const letters = ['A', 'B', 'C', 'D'];
  container.innerHTML = options
    .map(
      (opt, i) => `
    <button class="option-btn" data-index="${i}" onclick="handleAnswer(${i})">
      <div class="option-label">
        <span class="option-letter">${letters[i]}</span>
        <span class="option-title">${escapeHtml(opt.title)}</span>
      </div>
    </button>`
    )
    .join('');
}

function handleAnswer(index) {
  if (state.answered || !isEasyMode()) return;
  state.answered = true;

  if (state.isPlaying) stopSnippet();

  if (state.fallbackMode) {
    $('#spotify-layer').innerHTML = '';
  }

  const song = state.roundSongs[state.round];
  const isCorrect = state.currentOptions[index].id === song.id;

  if (isCorrect) {
    state.score++;
    $('#score-display').textContent = state.score;
    const scoreEl = $('#score-display');
    scoreEl.classList.add('bump');
    setTimeout(() => scoreEl.classList.remove('bump'), SCORE_BUMP_MS);
  }

  const buttons = $$('.option-btn');
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === state.correctIndex) {
      btn.classList.add('correct');
    } else if (i === index && !isCorrect) {
      btn.classList.add('wrong');
    } else {
      btn.classList.add('dimmed');
    }
  });

  $('#play-btn').disabled = true;

  state.roundResults[state.round] = isCorrect ? 'correct' : 'wrong';
  updateProgress();
  saveGame();

  showResultFlash(isCorrect);
  showAnswerReveal(song);
  advanceRound();
}

// ── Text Guess (Medium / Hard) ──────────

function submitGuess() {
  if (state.answered || isEasyMode()) return;

  const input = $('#guess-input');
  const guess = input.value.trim();
  if (!guess) { input.focus(); return; }

  state.answered = true;

  if (state.isPlaying) stopSnippet();

  if (state.fallbackMode) {
    $('#spotify-layer').innerHTML = '';
  }

  const song = state.roundSongs[state.round];
  const isCorrect = fuzzyMatch(guess, song.title);

  input.disabled = true;
  $('#guess-submit').disabled = true;
  input.classList.add(isCorrect ? 'correct' : 'wrong');

  if (isCorrect) {
    state.score++;
    $('#score-display').textContent = state.score;
    const scoreEl = $('#score-display');
    scoreEl.classList.add('bump');
    setTimeout(() => scoreEl.classList.remove('bump'), SCORE_BUMP_MS);
  }

  $('#play-btn').disabled = true;

  state.roundResults[state.round] = isCorrect ? 'correct' : 'wrong';
  updateProgress();
  saveGame();

  showResultFlash(isCorrect);
  showAnswerReveal(song);
  advanceRound();
}

// ── Advance Round ────────────────────────

function advanceRound() {
  state.answeredAt = Date.now();
  const nrBar = $('.next-round-bar');
  nrBar.classList.add('visible');
  requestAnimationFrame(() => {
    nrBar.querySelector('.next-round-fill').style.width = '0%';
  });

  timers.nextRound = setTimeout(() => {
    state.round++;
    if (state.round >= TOTAL_ROUNDS) {
      showEndScreen();
    } else {
      showRound();
    }
  }, NEXT_ROUND_DELAY_MS);
}

// ── Player Controls ──────────────────────

function resetPlayerUI() {
  const playBtn = $('#play-btn');
  playBtn.classList.remove('playing');
  playBtn.disabled = false;
  playBtn.innerHTML = playSvg();

  $('#waveform').classList.remove('active');
  $('#timer-fill').style.width = '100%';
  $('#timer-text').textContent = snippetDuration().toFixed(1) + 's';
  $('#player-label').textContent = 'TAP TO PLAY SNIPPET';
}

function playSnippet() {
  if (state.isPlaying || state.answered) return;

  if (state.fallbackMode) {
    showToast('Use the Spotify player to listen!');
    return;
  }

  if (!spotifyReady || !embedController) {
    activateFallbackMode();
    return;
  }

  state.isPlaying = true;
  state.playbackDetected = false;

  const playBtn = $('#play-btn');
  playBtn.classList.add('playing');
  playBtn.innerHTML = pauseSvg();

  $('#waveform').classList.add('active');
  $('#player-label').textContent = 'LOADING...';

  const song = state.roundSongs[state.round];
  const safeTime = song.safe
    ? song.safe[Math.floor(Math.random() * song.safe.length)]
    : 20;

  function attemptPlay() {
    if (!state.isPlaying) return;
    try {
      embedController.seek(safeTime);
      embedController.play();
    } catch (e) {
      showToast('Playback error — trying again...');
    }
  }

  // On replay, reload the URI first
  if (state.hasPlayedSnippet) {
    state.trackLoadedAt = Date.now();
    embedController.loadUri('spotify:track:' + song.id);
  }
  state.hasPlayedSnippet = true;

  // Wait at least TARGET_LOAD_DELAY_MS after loadUri before first play attempt
  const timeSinceLoad = Date.now() - state.trackLoadedAt;
  const initialDelay = Math.max(MIN_PLAY_DELAY_MS, TARGET_LOAD_DELAY_MS - timeSinceLoad);

  setTimeout(attemptPlay, initialDelay);

  // Retry if playback hasn't started
  clearTimeout(timers.playRetry);
  timers.playRetry = setTimeout(() => {
    if (!state.playbackDetected && state.isPlaying) {
      attemptPlay();
    }
  }, initialDelay + PLAY_RETRY_DELAY_MS);

  // Start the snippet timer only once playback is actually detected
  startTimerOnPlayback();

  // Ultimate fallback if Spotify never responds
  clearTimeout(timers.playTimeout);
  timers.playTimeout = setTimeout(() => {
    if (!state.playbackDetected && state.isPlaying) {
      stopSnippet();
      activateFallbackMode();
    }
  }, PLAY_TIMEOUT_MS);
}

function startTimerOnPlayback() {
  const duration = snippetDuration() * 1000;
  let timerStarted = false;

  clearInterval(timers.tick);
  timers.tick = setInterval(() => {
    if (!state.isPlaying) { clearInterval(timers.tick); return; }

    // Wait for actual playback before counting down
    if (!timerStarted) {
      if (state.playbackDetected) {
        timerStarted = true;
        $('#player-label').textContent = 'NOW PLAYING';
        state.timerStart = Date.now();
      }
      return;
    }

    const elapsed = Date.now() - state.timerStart;
    const remaining = Math.max(0, duration - elapsed);
    const pct = (remaining / duration) * 100;

    $('#timer-fill').style.width = pct + '%';
    $('#timer-text').textContent = (remaining / 1000).toFixed(1) + 's';

    if (remaining <= 0) stopSnippet();
  }, TIMER_TICK_MS);
}

function activateFallbackMode() {
  state.fallbackMode = true;
  state.isPlaying = false;
  clearInterval(timers.tick);

  const song = state.roundSongs[state.round];
  $('.player-area').classList.add('fallback-mode');
  createFallbackEmbed(song.id);
  showToast('Spotify couldn\'t connect — use the player below');
}

function stopSnippet() {
  if (!state.isPlaying) return;

  state.isPlaying = false;
  clearInterval(timers.tick);
  clearTimeout(timers.playTimeout);
  clearTimeout(timers.playRetry);

  if (embedController) {
    if (state.embedIsPlaying) {
      try { embedController.togglePlay(); } catch (e) {}
    }
    setTimeout(() => {
      if (state.embedIsPlaying) {
        try { embedController.togglePlay(); } catch (e) {}
      }
    }, STOP_RETRY_DELAY_MS);
  }

  const playBtn = $('#play-btn');
  playBtn.classList.remove('playing');
  playBtn.innerHTML = replaySvg();
  playBtn.disabled = state.answered;

  $('#waveform').classList.remove('active');
  $('#player-label').textContent = state.answered ? '' : 'TAP TO REPLAY';

  $('#timer-fill').style.width = '0%';
  $('#timer-text').textContent = '0.0s';
}

// ── Fuzzy Matching ───────────────────────

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[^a-z0-9' ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(guess, answer) {
  const g = normalize(guess);
  const a = normalize(answer);

  if (g === a) return true;
  if (a.includes(g) && g.length >= 3) return true;
  if (g.includes(a)) return true;

  const gWords = g.split(' ');
  const aWords = a.split(' ');
  if (aWords.every(w => g.includes(w))) return true;
  if (gWords.every(w => a.includes(w))) return true;

  const sim = similarity(g, a);
  if (sim >= FUZZY_THRESHOLD) return true;

  const strip = (s) => s.replace(/^(the|a|an) /, '');
  if (strip(g) === strip(a)) return true;
  if (similarity(strip(g), strip(a)) >= FUZZY_THRESHOLD) return true;

  return false;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ── Answer Reveal ────────────────────────

function showAnswerReveal(song) {
  const reveal = $('.answer-reveal');
  reveal.querySelector('.answer-artist').textContent = song.artist;
  reveal.querySelector('.answer-song').textContent = song.title;

  const tag = reveal.querySelector('.answer-member-tag');
  const memberLabels = {
    group: 'BLACKPINK',
    jennie: 'Jennie Solo',
    lisa: 'Lisa Solo',
    rose: 'Rosé Solo',
    jisoo: 'Jisoo Solo',
  };
  tag.textContent = memberLabels[song.member] || song.member;
  tag.className = 'answer-member-tag member-' + song.member;

  reveal.classList.add('visible');
}

function showResultFlash(isCorrect) {
  const flash = $('#result-flash');
  flash.querySelector('.icon').textContent = isCorrect ? '+1' : '✗';
  flash.style.color = isCorrect ? 'var(--correct)' : 'var(--wrong)';
  flash.classList.remove('show');
  void flash.offsetWidth;
  flash.classList.add('show');
}

// ── End Screen ───────────────────────────

function showEndScreen() {
  clearSavedGame();
  showScreen('end');

  const score = state.score;
  $('#final-score-num').textContent = score;

  const messages = [
    [10, "PERFECT! You're the ultimate BLINK!"],
    [8, "Amazing! You really know your BP!"],
    [6, 'Solid work, true BLINK energy!'],
    [4, 'Not bad! Keep streaming!'],
    [2, 'Time to revisit the discography!'],
    [0, "Don't give up, BLINK!"],
  ];
  const msg = messages.find(([threshold]) => score >= threshold);
  $('#score-message').textContent = msg[1];

  $('#correct-count').textContent = score;
  $('#wrong-count').textContent = TOTAL_ROUNDS - score;

  if (score >= 8) spawnConfetti();
}

// ── Confetti ─────────────────────────────

function spawnConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const colors = ['#FF006E', '#FF4D94', '#FFB6C1', '#FFF', '#FF69B4'];
  for (let i = 0; i < CONFETTI_PIECE_COUNT; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 2 + 's';
    piece.style.animationDuration = 2 + Math.random() * 2 + 's';
    piece.style.width = 6 + Math.random() * 8 + 'px';
    piece.style.height = 6 + Math.random() * 8 + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), CONFETTI_DURATION_MS);
}

// ── Utilities ────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message) {
  let toast = $('#toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), TOAST_DURATION_MS);
}

function playSvg() {
  return `<svg viewBox="0 0 24 24" fill="white"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
}

function pauseSvg() {
  return `<svg viewBox="0 0 24 24" fill="white"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>`;
}

function replaySvg() {
  return `<svg viewBox="0 0 24 24" fill="white"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>`;
}

// ── Boot ──────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
