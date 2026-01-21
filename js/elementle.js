// Elementle Game Logic
const MAX_GUESSES = 8;
let gameState = {
  dailyElement: null,
  guesses: [],
  gameOver: false,
  won: false,
  isNewGame: false
};

// Get or create daily element
function getDailyElement() {
  if (typeof ELEMENTS === 'undefined' || !ELEMENTS || ELEMENTS.length === 0) {
    console.error('ELEMENTS array is not loaded');
    return null;
  }

  console.log('[elementle] getDailyElement called, ELEMENTS count:', ELEMENTS.length);
  try {
    const today = new Date().toDateString();
    let stored, storedGuesses, storedElement;

    // Try to access localStorage with error handling
    try {
      stored = localStorage.getItem('elementle_date');
      storedGuesses = localStorage.getItem('elementle_guesses');
      console.log('[elementle] localStorage - stored date:', stored, 'today:', today, 'storedGuesses exists:', !!storedGuesses);
    } catch (e) {
      console.warn('[elementle] localStorage not available, using memory only');
      stored = null;
      storedGuesses = null;
    }

    if (stored === today && storedGuesses && !gameState.isNewGame) {
      console.log('[elementle] Loading guesses from localStorage');
      gameState.guesses = JSON.parse(storedGuesses);
    } else if (gameState.guesses.length === 0) {
      // Only clear guesses if we don't already have any
      console.log('[elementle] No guesses, setting to empty array');
      try {
        localStorage.setItem('elementle_date', today);
      } catch (e) {
        console.warn('[elementle] Cannot write to localStorage');
      }
      gameState.guesses = [];
    } else {
      // We have guesses but the date doesn't match or storedGuesses is missing
      // This means we're starting a new day but have unsaved guesses from today
      console.log('[elementle] Have guesses but date mismatch or missing storedGuesses, saving current guesses');
      try {
        localStorage.setItem('elementle_date', today);
        localStorage.setItem('elementle_guesses', JSON.stringify(gameState.guesses));
      } catch (e) {
        console.warn('[elementle] Cannot write to localStorage:', e);
      }
    }

    try {
      storedElement = localStorage.getItem('elementle_element_' + today);
    } catch (e) {
      storedElement = null;
    }

    if (storedElement && !gameState.isNewGame) {
      gameState.dailyElement = JSON.parse(storedElement);
    } else {
      // Pick a random element (either for "Start New Game" or first time)
      const randomIndex = Math.floor(Math.random() * ELEMENTS.length);
      gameState.dailyElement = ELEMENTS[randomIndex];

      // Store it if not a new game click
      if (!gameState.isNewGame) {
        try {
          localStorage.setItem('elementle_element_' + today, JSON.stringify(gameState.dailyElement));
        } catch (e) {
          console.warn('Cannot write to localStorage');
        }
      }
      gameState.isNewGame = false;
    }

    return gameState.dailyElement;
  } catch (error) {
    console.error('Error in getDailyElement:', error);
    return null;
  }
}

// Initialize game
function initializeGame() {
  try {
    const element = getDailyElement();
    if (!element) {
      console.error('Failed to get daily element. Retrying in 500ms...');
      setTimeout(initializeGame, 500);
      return;
    }

    renderGuessGrid();
    updateCountdown();
    setInterval(updateCountdown, 1000);

    // Event listeners
    const guessBtn = document.querySelector('.js-guess-button');
    if (guessBtn) {
      guessBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('GUESS button clicked');
        makeGuess();
      });
    } else {
      console.error('GUESS button (.js-guess-button) not found');
    }

    const hintBtn = document.querySelector('.js-hint-button');
    if (hintBtn) {
      hintBtn.addEventListener('click', showHint);
    } else {
      console.warn('HINT button (.js-hint-button) not found');
    }

    const helpBtn = document.querySelector('.js-help-button');
    if (helpBtn) {
      helpBtn.addEventListener('click', showHelp);
    } else {
      console.warn('HELP button (.js-help-button) not found');
    }

    const statsBtn = document.querySelector('.js-stats-button');
    if (statsBtn) {
      statsBtn.addEventListener('click', showStats);
    } else {
      console.warn('STATS button (.js-stats-button) not found');
    }

    const changeModeBtn = document.querySelector('.js-change-mode-button');
    if (changeModeBtn) {
      changeModeBtn.addEventListener('click', toggleMode);
    } else {
      console.warn('CHANGE MODE button (.js-change-mode-button) not found');
    }

    const guessInput = document.querySelector('.js-guess-input');
    if (guessInput) {
      guessInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          makeGuess();
        }
      });
    } else {
      console.error('Guess input (.js-guess-input) not found');
    }

    // Autocomplete
    setupAutocomplete();
  } catch (error) {
    console.error('Error initializing game:', error);
    setTimeout(initializeGame, 500);
  }
}

// Setup autocomplete
function setupAutocomplete() {
  const input = document.querySelector('.js-guess-input');
  const wrapper = document.querySelector('.js-autocomplete-wrapper');

  if (!input || !wrapper) {
    console.warn('Autocomplete setup: input or wrapper element not found');
    return;
  }

  input.addEventListener('input', function() {
    const value = this.value.toLowerCase();
    removeAutocompleteList();
    
    if (value.length === 0) return;
    
    const matches = ELEMENTS.filter(el => 
      el.name.toLowerCase().startsWith(value) && 
      !gameState.guesses.some(g => g.number === el.number)
    ).slice(0, 5);
    
    if (matches.length === 0) return;
    
    const ul = document.createElement('ul');
    ul.className = 'autocomplete-list';
    
    matches.forEach(element => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.textContent = element.name;
      btn.onclick = (e) => {
        e.preventDefault();
        input.value = element.name;
        removeAutocompleteList();
        makeGuess();
      };
      li.appendChild(btn);
      ul.appendChild(li);
    });
    
    wrapper.appendChild(ul);
  });
  
  document.addEventListener('click', function(e) {
    if (e.target !== input) {
      removeAutocompleteList();
    }
  });
}

function removeAutocompleteList() {
  const list = document.querySelector('.autocomplete-list');
  if (list) list.remove();
}

// Make a guess
function makeGuess() {
  try {
    console.log('[elementle] makeGuess called');
    const input = document.querySelector('.js-guess-input');
    if (!input) {
      console.error('[elementle] Input element (.js-guess-input) not found');
      return;
    }

    const guess = input.value.trim();
    if (!guess) {
      return;
    }

    const element = getElementByName(guess);
    if (!element) {
      console.log('[elementle] Element not found for:', guess);
      showPopup('Element not found!');
      return;
    }

    if (gameState.guesses.some(g => g.number === element.number)) {
      console.log('[elementle] Element already guessed:', element.name);
      showPopup('Already guessed!');
      return;
    }

    console.log('[elementle] Adding guess:', element.name);
    console.log('[elementle] Guesses before push:', gameState.guesses.length);
    gameState.guesses.push(element);
    console.log('[elementle] Guesses after push:', gameState.guesses.length);

    // Try to save to localStorage with error handling
    try {
      localStorage.setItem('elementle_guesses', JSON.stringify(gameState.guesses));
      console.log('[elementle] Saved to localStorage, count:', gameState.guesses.length);
    } catch (e) {
      console.warn('[elementle] Cannot write to localStorage:', e);
    }

    input.value = '';
    removeAutocompleteList();

    console.log('[elementle] About to render grid, guesses count:', gameState.guesses.length);
    renderGuessGrid();
    console.log('[elementle] After render grid, guesses count:', gameState.guesses.length);

    if (element.number === gameState.dailyElement.number) {
      gameState.won = true;
      gameState.gameOver = true;
      showPopup('Correct! You won!');
      confetti();
      showShareButton();
    } else if (gameState.guesses.length >= MAX_GUESSES) {
      gameState.gameOver = true;
      showPopup('Game Over! Element: ' + gameState.dailyElement.name);
      showRevealAnswer();
    }

    disableGameIfOver();
  } catch (error) {
    console.error('Error in makeGuess:', error);
  }
}

// Show hint
function showHint() {
  const hintContainer = document.querySelector('.js-hint-container');
  if (!hintContainer) {
    console.warn('Hint container (.js-hint-container) not found');
    return;
  }

  if (gameState.guesses.length === 0) {
    hintContainer.textContent = 'Make a guess first!';
    return;
  }

  const lastGuess = gameState.guesses[gameState.guesses.length - 1];
  const target = gameState.dailyElement;

  let hint = '';
  if (lastGuess.number < target.number) {
    hint = `${target.name} has atomic number higher than ${lastGuess.number}`;
  } else {
    hint = `${target.name} has atomic number lower than ${lastGuess.number}`;
  }

  hintContainer.textContent = 'Hint: ' + hint;
  hintContainer.classList.add('fade-in-text');
}

// Helper function to get letter highlights for a guess symbol (Wordle-style)
function getSymbolLetterHighlights(guessSymbol, answerSymbol) {
  const guessUpper = guessSymbol.toUpperCase();
  const answerUpper = answerSymbol.toUpperCase();

  // Track which letters in answer have been matched
  const answerLetterCounts = {};
  for (let char of answerUpper) {
    answerLetterCounts[char] = (answerLetterCounts[char] || 0) + 1;
  }

  // First pass: mark correct positions
  const highlights = new Array(guessUpper.length).fill(null);
  for (let i = 0; i < guessUpper.length; i++) {
    if (guessUpper[i] === answerUpper[i]) {
      highlights[i] = 'green';
      answerLetterCounts[guessUpper[i]]--;
    }
  }

  // Second pass: mark wrong positions (yellow) or not in answer (gray)
  for (let i = 0; i < guessUpper.length; i++) {
    if (highlights[i] === null) {
      if (answerLetterCounts[guessUpper[i]] > 0) {
        highlights[i] = 'yellow';
        answerLetterCounts[guessUpper[i]]--;
      } else {
        highlights[i] = 'gray';
      }
    }
  }

  return highlights;
}

// Render guess grid
function renderGuessGrid() {
  console.log('[elementle] renderGuessGrid called, guesses:', gameState.guesses.length);
  console.log('[elementle] gameState.guesses content:', JSON.stringify(gameState.guesses.map(g => g.name)));

  // Check if grid exists
  const grid = document.querySelector('.element-grid');
  if (!grid) {
    console.error('[elementle] Element grid container not found in DOM!');
    return;
  }

  for (let i = 1; i <= MAX_GUESSES; i++) {
    let cell = document.querySelector('.js-' + i);

    // Fallback to grid children if querySelector doesn't find the cell
    if (!cell && grid && grid.children[i - 1]) {
      cell = grid.children[i - 1];
    }

    if (!cell) {
      console.warn('[elementle] Cell .js-' + i + ' not found');
      continue;
    }

    cell.innerHTML = '';
    cell.className = 'element';

    if (i <= gameState.guesses.length) {
      console.log('[elementle] Rendering guess', i, ':', gameState.guesses[i - 1].name);
      const guessedElement = gameState.guesses[i - 1];
      const target = gameState.dailyElement;
      const isCorrect = guessedElement.number === target.number;
      const isSameType = guessedElement.family === target.family;

      if (isCorrect) {
        cell.classList.add('guessed-element', 'correct-guess');
      } else {
        cell.classList.add('guessed-element');
      }

      // Apply element type highlighting (green if same family)
      if (isSameType && !isCorrect) {
        cell.classList.add('same-type');
      }

      const atomicNumber = document.createElement('div');
      atomicNumber.className = 'atomic-number';
      atomicNumber.textContent = guessedElement.number;

      const symbol = document.createElement('div');
      symbol.className = 'symbol';

      // Render symbol with per-letter highlighting (Wordle-style)
      const symbolHighlights = getSymbolLetterHighlights(guessedElement.symbol, target.symbol);
      for (let j = 0; j < guessedElement.symbol.length; j++) {
        const letterSpan = document.createElement('span');
        letterSpan.textContent = guessedElement.symbol[j];
        letterSpan.className = 'symbol-letter ' + symbolHighlights[j];
        symbol.appendChild(letterSpan);
      }

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = guessedElement.name;

      const family = document.createElement('div');
      family.className = 'family';
      family.textContent = guessedElement.family;

      // Apply family highlighting (green if same type)
      if (isSameType) {
        family.classList.add('same-type-family');
      }

      cell.appendChild(atomicNumber);
      cell.appendChild(symbol);
      cell.appendChild(name);
      cell.appendChild(family);
    }
  }
}

// Show share button
function showShareButton() {
  const container = document.querySelector('.js-share-button');
  if (!container) {
    console.warn('Share button container (.js-share-button) not found');
    return;
  }

  const btn = document.createElement('button');
  btn.className = 'share-button';
  btn.textContent = 'Share';
  btn.onclick = shareResult;
  container.appendChild(btn);

  const infoLink = document.createElement('a');
  infoLink.className = 'additional-info';
  infoLink.href = '#';
  infoLink.textContent = 'Learn More';
  infoLink.onclick = (e) => {
    e.preventDefault();
    window.open('https://en.wikipedia.org/wiki/' + gameState.dailyElement.name);
  };

  const infoContainer = document.querySelector('.js-additional-info');
  if (infoContainer) {
    infoContainer.appendChild(infoLink);
  }
}

// Show reveal answer
function showRevealAnswer() {
  const container = document.querySelector('.js-reveal-answer');
  if (!container) {
    console.warn('Reveal answer container (.js-reveal-answer) not found');
    return;
  }

  const div = document.createElement('div');
  div.className = 'reveal-answer';
  div.textContent = 'The element was: ' + gameState.dailyElement.name + ' (' + gameState.dailyElement.symbol + ')';
  container.appendChild(div);
}

// Disable game if over
function disableGameIfOver() {
  if (gameState.gameOver) {
    const input = document.querySelector('.js-guess-input');
    const guessBtn = document.querySelector('.js-guess-button');
    const hintBtn = document.querySelector('.js-hint-button');

    if (input) input.disabled = true;
    if (guessBtn) guessBtn.disabled = true;
    if (hintBtn) hintBtn.disabled = true;
  }
}

// Update countdown
function updateCountdown() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(0, 0, 0, 0);

  const timeLeft = tomorrow - now;
  const hours = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);

  const hoursEl = document.querySelector('.js-hours');
  const minutesEl = document.querySelector('.js-minutes');
  const secondsEl = document.querySelector('.js-seconds');

  if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
  if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
  if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
}

// Show popup message
function showPopup(message) {
  const popup = document.createElement('div');
  popup.className = 'popup';
  popup.textContent = message;
  document.body.appendChild(popup);

  // Show popup with animation
  setTimeout(() => {
    popup.style.opacity = '1';
  }, 10);

  // Remove popup after 3 seconds
  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => popup.remove(), 500);
  }, 3000);
}

// Show help
function showHelp() {
  alert('Welcome to Elementle!\n\nGuess the daily periodic table element.\n\nYou have 8 guesses.\n\nThe symbol color indicates:\n- Green: Correct element or very close atomic number\n- Yellow: Close atomic number\n\nGood luck!');
}

// Show stats
function showStats() {
  const stats = {
    gamesPlayed: parseInt(localStorage.getItem('elementle_games_played') || '0'),
    gamesWon: parseInt(localStorage.getItem('elementle_games_won') || '0')
  };
  
  const winRate = stats.gamesPlayed > 0 ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) : '0.0';
  
  alert('Games Played: ' + stats.gamesPlayed + '\nGames Won: ' + stats.gamesWon + '\nWin Rate: ' + winRate + '%');
}

// Toggle mode (dark/light)
function toggleMode() {
  const body = document.body;
  if (body.style.backgroundColor === 'rgb(25, 25, 25)') {
    body.style.backgroundColor = '#f5f5f5';
    body.style.color = '#000';
  } else {
    body.style.backgroundColor = 'rgb(25, 25, 25)';
    body.style.color = '#fff';
  }
}

// Share result
function shareResult() {
  const text = 'I solved Elementle #' + gameState.guesses.length + ' in ' + gameState.guesses.length + ' guesses!';
  if (navigator.share) {
    navigator.share({
      title: 'Elementle',
      text: text,
      url: window.location.href
    });
  } else {
    alert('Share this result:\n' + text);
  }
}

// Initialize when DOM is loaded and ELEMENTS is available
function tryInitialize() {
  if (typeof ELEMENTS !== 'undefined' && ELEMENTS && ELEMENTS.length > 0) {
    initializeGame();
  } else {
    // Wait a bit and try again
    setTimeout(tryInitialize, 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInitialize);
} else {
  tryInitialize();
}

// Start New Game button handler
document.addEventListener('DOMContentLoaded', function() {
  const startNewGameBtn = document.getElementById('start-new-game-btn');
  if (startNewGameBtn) {
    startNewGameBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('[elementle] Start new game clicked');

      // Reset game state
      gameState.guesses = [];
      gameState.gameOver = false;
      gameState.won = false;
      gameState.isNewGame = true;

      // Clear localStorage
      try {
        localStorage.removeItem('elementle_guesses');
      } catch (e) {
        console.warn('[elementle] Could not clear localStorage');
      }

      // Re-enable input and buttons
      const input = document.querySelector('.js-guess-input');
      const guessBtn = document.querySelector('.js-guess-button');
      const hintBtn = document.querySelector('.js-hint-button');

      if (input) input.disabled = false;
      if (guessBtn) guessBtn.disabled = false;
      if (hintBtn) hintBtn.disabled = false;

      // Clear any previous messages
      const revealContainer = document.querySelector('.js-reveal-answer');
      const shareContainer = document.querySelector('.js-share-button');
      const infoContainer = document.querySelector('.js-additional-info');

      if (revealContainer) revealContainer.innerHTML = '';
      if (shareContainer) shareContainer.innerHTML = '';
      if (infoContainer) infoContainer.innerHTML = '';

      // Re-initialize the game
      initializeGame();
    });
  }
});
