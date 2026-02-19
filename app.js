/* ═══════════════════════════════════════════
   BLINK TRIVIA — Game Logic
   ═══════════════════════════════════════════ */

const TOTAL_ROUNDS = 10;
const NEXT_ROUND_DELAY = 3000;
const PLAY_TIMEOUT_MS = 3000;
const FUZZY_THRESHOLD = 0.55;

const DIFFICULTY = {
  easy:   { duration: 10 },
  medium: { duration: 6 },
  hard:   { duration: 3 },
};

let selectedMode = 'medium';

// ── State ────────────────────────────────

let playedSongIds = new Set();

let state = {
  screen: 'start',
  round: 0,
  score: 0,
  roundSongs: [],
  currentOptions: [],
  correctIndex: -1,
  answered: false,
  isPlaying: false,
  hasPlayedSnippet: false,
  fallbackMode: false,
};

let embedController = null;
let spotifyReady = false;
let tickInterval = null;
let nextRoundTimeout = null;
let playbackDetected = false;
let playTimeoutId = null;

// ── DOM Refs ─────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let screens = {};

// ── Init ─────────────────────────────────

function init() {
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
  $('#total-rounds').textContent = TOTAL_ROUNDS;

  // Difficulty picker
  $$('.diff-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.diff-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMode = btn.dataset.mode;
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
  for (let i = 0; i < 32; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.setProperty('--max-h', (12 + Math.random() * 36) + 'px');
    bar.style.animationDelay = (i * 0.04) + 's';
    wf.appendChild(bar);
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (state.screen === 'start' && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      if (!$('#start-btn').disabled) startGame();
    } else if (state.screen === 'end' && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      startGame();
    } else if (state.screen === 'game' && e.key === ' ' && document.activeElement !== $('#guess-input')) {
      e.preventDefault();
      playSnippet();
    } else if (state.screen === 'game' && selectedMode === 'easy' && e.key >= '1' && e.key <= '4') {
      handleAnswer(parseInt(e.key) - 1);
    }
  });

  initSpotifyEmbed();

  setTimeout(() => {
    if (!spotifyReady) {
      $('#start-btn').disabled = false;
      $('#loading-text').textContent = 'Using Spotify player fallback';
      state.fallbackMode = true;
    }
  }, 6000);
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
        if (e && e.data && !e.data.isPaused) {
          playbackDetected = true;
        }
      });
    });
  };
}

function createFallbackEmbed(trackId) {
  const layer = $('#spotify-layer');
  layer.innerHTML = `<iframe
    src="https://open.spotify.com/embed/track/${trackId}?theme=0&utm_source=generator"
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
  return selectedMode === 'easy';
}

function snippetDuration() {
  return DIFFICULTY[selectedMode].duration;
}

// ── Start Game ───────────────────────────

function startGame() {
  clearInterval(tickInterval);
  clearTimeout(nextRoundTimeout);
  clearTimeout(playTimeoutId);

  if (embedController && state.isPlaying) {
    try { embedController.togglePlay(); } catch (e) {}
  }

  state.round = 0;
  state.score = 0;
  state.answered = false;
  state.isPlaying = false;
  state.hasPlayedSnippet = false;

  state.roundSongs = pickRandomSongs(TOTAL_ROUNDS);

  showScreen('game');
  showRound();
}

function pickRandomSongs(count) {
  let available = SONGS.filter((s) => !playedSongIds.has(s.id));
  if (available.length < count) {
    playedSongIds.clear();
    available = [...SONGS];
  }
  const shuffled = available.sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);
  picked.forEach((s) => playedSongIds.add(s.id));
  return picked;
}

// ── Show Round ───────────────────────────

function showRound() {
  const song = state.roundSongs[state.round];
  state.answered = false;
  state.isPlaying = false;
  state.hasPlayedSnippet = false;
  playbackDetected = false;

  $('#round-num').textContent = state.round + 1;
  $('#score-display').textContent = state.score;

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
    setTimeout(() => $('#guess-input').focus(), 100);
  }
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
    setTimeout(() => scoreEl.classList.remove('bump'), 400);
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
    setTimeout(() => scoreEl.classList.remove('bump'), 400);
  }

  $('#play-btn').disabled = true;

  showResultFlash(isCorrect);
  showAnswerReveal(song);
  advanceRound();
}

// ── Advance Round ────────────────────────

function advanceRound() {
  const nrBar = $('.next-round-bar');
  nrBar.classList.add('visible');
  requestAnimationFrame(() => {
    nrBar.querySelector('.next-round-fill').style.width = '0%';
  });

  nextRoundTimeout = setTimeout(() => {
    state.round++;
    if (state.round >= TOTAL_ROUNDS) {
      showEndScreen();
    } else {
      showRound();
    }
  }, NEXT_ROUND_DELAY);
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
  playbackDetected = false;

  const playBtn = $('#play-btn');
  playBtn.classList.add('playing');
  playBtn.innerHTML = pauseSvg();

  $('#waveform').classList.add('active');
  $('#player-label').textContent = 'NOW PLAYING';

  const song = state.roundSongs[state.round];
  const safeTime = song.safe
    ? song.safe[Math.floor(Math.random() * song.safe.length)]
    : 20;

  if (state.hasPlayedSnippet) {
    embedController.loadUri('spotify:track:' + song.id);
    setTimeout(() => {
      try { embedController.seek(safeTime); embedController.play(); } catch (e) {}
    }, 500);
  } else {
    try { embedController.seek(safeTime); embedController.play(); } catch (e) {}
  }
  state.hasPlayedSnippet = true;

  const startTime = Date.now();
  const duration = snippetDuration() * 1000;

  clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration - elapsed);
    const pct = (remaining / duration) * 100;

    $('#timer-fill').style.width = pct + '%';
    $('#timer-text').textContent = (remaining / 1000).toFixed(1) + 's';

    if (remaining <= 0) stopSnippet();
  }, 50);

  clearTimeout(playTimeoutId);
  playTimeoutId = setTimeout(() => {
    if (!playbackDetected && state.isPlaying) {
      stopSnippet();
      activateFallbackMode();
    }
  }, PLAY_TIMEOUT_MS);
}

function activateFallbackMode() {
  state.fallbackMode = true;
  state.isPlaying = false;
  clearInterval(tickInterval);

  const song = state.roundSongs[state.round];
  $('.player-area').classList.add('fallback-mode');
  createFallbackEmbed(song.id);
  showToast('Click play on the Spotify player to listen!');
}

function stopSnippet() {
  if (!state.isPlaying) return;

  state.isPlaying = false;
  clearInterval(tickInterval);
  clearTimeout(playTimeoutId);

  if (embedController) {
    try { embedController.togglePlay(); } catch (e) {}
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
  for (let i = 0; i < 60; i++) {
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
  setTimeout(() => container.remove(), 5000);
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
  setTimeout(() => toast.classList.remove('show'), 3000);
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
