// Elementle Game Logic
const MAX_GUESSES = 8;
let gameState = {
  dailyElement: null,
  guesses: [],
  gameOver: false,
  won: false
};

// Get or create daily element
function getDailyElement() {
  if (typeof ELEMENTS === 'undefined' || !ELEMENTS || ELEMENTS.length === 0) {
    console.error('ELEMENTS array is not loaded');
    return null;
  }

  console.log('getDailyElement called, ELEMENTS count:', ELEMENTS.length);
  try {
    const today = new Date().toDateString();
    let stored, storedGuesses, storedElement;

    // Try to access localStorage with error handling
    try {
      stored = localStorage.getItem('elementle_date');
      storedGuesses = localStorage.getItem('elementle_guesses');
    } catch (e) {
      console.warn('localStorage not available, using memory only');
      stored = null;
      storedGuesses = null;
    }

    if (stored === today && storedGuesses) {
      gameState.guesses = JSON.parse(storedGuesses);
    } else {
      try {
        localStorage.setItem('elementle_date', today);
      } catch (e) {
        console.warn('Cannot write to localStorage');
      }
      gameState.guesses = [];
    }

    try {
      storedElement = localStorage.getItem('elementle_element_' + today);
    } catch (e) {
      storedElement = null;
    }

    if (storedElement) {
      gameState.dailyElement = JSON.parse(storedElement);
    } else {
      const seed = new Date(today).getTime();
      const randomIndex = Math.floor((seed / 1000) % ELEMENTS.length);
      gameState.dailyElement = ELEMENTS[randomIndex];
      try {
        localStorage.setItem('elementle_element_' + today, JSON.stringify(gameState.dailyElement));
      } catch (e) {
        console.warn('Cannot write to localStorage');
      }
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
    console.log('makeGuess called');
    const input = document.querySelector('.js-guess-input');
    if (!input) {
      console.error('Input element (.js-guess-input) not found');
      return;
    }

    const guess = input.value.trim();
    console.log('Guess value:', guess);

    if (!guess) {
      console.log('Empty guess, returning');
      return;
    }

    const element = getElementByName(guess);
    console.log('Element found:', element);
    if (!element) {
      console.log('Element not found for:', guess);
      showPopup('Element not found!');
      return;
    }

    if (gameState.guesses.some(g => g.number === element.number)) {
      console.log('Element already guessed');
      showPopup('Already guessed!');
      return;
    }

    console.log('Adding guess:', element);
    gameState.guesses.push(element);
    console.log('Current guesses:', gameState.guesses);
    console.log('Daily element:', gameState.dailyElement);
    console.log('Total guesses count:', gameState.guesses.length);

    // Try to save to localStorage with error handling
    try {
      localStorage.setItem('elementle_guesses', JSON.stringify(gameState.guesses));
      console.log('Saved guesses to localStorage');
    } catch (e) {
      console.warn('Cannot write to localStorage:', e);
    }

    input.value = '';
    removeAutocompleteList();

    console.log('About to render guess grid, current guesses length:', gameState.guesses.length);
    renderGuessGrid();
    console.log('Rendered guess grid');

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

// Render guess grid
function renderGuessGrid() {
  console.log('renderGuessGrid called, guesses:', gameState.guesses.length);
  console.log('Daily element:', gameState.dailyElement);

  for (let i = 1; i <= MAX_GUESSES; i++) {
    const cell = document.querySelector('.js-' + i);
    if (!cell) {
      console.warn('Cell .js-' + i + ' not found in DOM');
      continue;
    }
    cell.innerHTML = '';
    cell.className = 'element';

    if (i <= gameState.guesses.length) {
      console.log('Rendering guess', i, ':', gameState.guesses[i - 1]);
      const guessedElement = gameState.guesses[i - 1];
      const isCorrect = guessedElement.number === gameState.dailyElement.number;
      console.log('Guess element:', guessedElement.name, 'Symbol:', guessedElement.symbol, 'isCorrect:', isCorrect);

      if (isCorrect) {
        cell.classList.add('guessed-element', 'correct-guess');
      } else {
        cell.classList.add('guessed-element');
      }

      const atomicNumber = document.createElement('div');
      atomicNumber.className = 'atomic-number';
      atomicNumber.textContent = guessedElement.number;
      console.log('Created atomic number div:', atomicNumber.textContent);

      const symbol = document.createElement('div');
      symbol.className = 'symbol';
      symbol.textContent = guessedElement.symbol;
      console.log('Created symbol div:', symbol.textContent);

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = guessedElement.name;
      console.log('Created name div:', name.textContent);

      const family = document.createElement('div');
      family.className = 'family';
      family.textContent = guessedElement.family;
      console.log('Created family div:', family.textContent);

      cell.appendChild(atomicNumber);
      console.log('Appended atomic number');
      cell.appendChild(symbol);
      console.log('Appended symbol');
      cell.appendChild(name);
      console.log('Appended name');
      cell.appendChild(family);
      console.log('Appended family');

      // Color code by accuracy
      const target = gameState.dailyElement;
      const guessNum = guessedElement.number;
      const targetNum = target.number;
      const difference = Math.abs(guessNum - targetNum);
      console.log('Color coding: guessNum:', guessNum, 'targetNum:', targetNum, 'difference:', difference);

      if (isCorrect) {
        symbol.classList.add('green');
        console.log('Added green class to symbol');
      } else if (difference <= 5) {
        symbol.classList.add('yellow');
        console.log('Added yellow class to symbol');
      } else {
        symbol.classList.add('red');
        console.log('Added red class to symbol');
      }
      console.log('Cell rendered, final innerHTML:', cell.innerHTML);
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
