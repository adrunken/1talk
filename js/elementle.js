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

  const today = new Date().toDateString();
  const stored = localStorage.getItem('elementle_date');
  const storedGuesses = localStorage.getItem('elementle_guesses');

  if (stored === today && storedGuesses) {
    gameState.guesses = JSON.parse(storedGuesses);
  } else {
    localStorage.setItem('elementle_date', today);
    gameState.guesses = [];
  }

  const storedElement = localStorage.getItem('elementle_element_' + today);
  if (storedElement) {
    gameState.dailyElement = JSON.parse(storedElement);
  } else {
    const seed = new Date(today).getTime();
    const randomIndex = Math.floor((seed / 1000) % ELEMENTS.length);
    gameState.dailyElement = ELEMENTS[randomIndex];
    localStorage.setItem('elementle_element_' + today, JSON.stringify(gameState.dailyElement));
  }

  return gameState.dailyElement;
}

// Initialize game
function initializeGame() {
  getDailyElement();
  renderGuessGrid();
  updateCountdown();
  setInterval(updateCountdown, 1000);
  
  // Event listeners
  document.querySelector('.js-guess-button').addEventListener('click', makeGuess);
  document.querySelector('.js-hint-button').addEventListener('click', showHint);
  document.querySelector('.js-help-button').addEventListener('click', showHelp);
  document.querySelector('.js-stats-button').addEventListener('click', showStats);
  document.querySelector('.js-change-mode-button').addEventListener('click', toggleMode);
  document.querySelector('.js-guess-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      makeGuess();
    }
  });
  
  // Autocomplete
  setupAutocomplete();
}

// Setup autocomplete
function setupAutocomplete() {
  const input = document.querySelector('.js-guess-input');
  const wrapper = document.querySelector('.js-autocomplete-wrapper');
  
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
  const input = document.querySelector('.js-guess-input');
  const guess = input.value.trim();
  
  if (!guess) return;
  
  const element = getElementByName(guess);
  if (!element) {
    showPopup('Element not found!');
    return;
  }
  
  if (gameState.guesses.some(g => g.number === element.number)) {
    showPopup('Already guessed!');
    return;
  }
  
  gameState.guesses.push(element);
  localStorage.setItem('elementle_guesses', JSON.stringify(gameState.guesses));
  input.value = '';
  removeAutocompleteList();
  
  renderGuessGrid();
  
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
}

// Show hint
function showHint() {
  const hintContainer = document.querySelector('.js-hint-container');
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
  for (let i = 1; i <= MAX_GUESSES; i++) {
    const cell = document.querySelector('.js-' + i);
    cell.innerHTML = '';
    cell.className = 'element';
    
    if (i <= gameState.guesses.length) {
      const guessedElement = gameState.guesses[i - 1];
      const isCorrect = guessedElement.number === gameState.dailyElement.number;
      
      if (isCorrect) {
        cell.classList.add('guessed-element', 'correct-guess');
      } else {
        cell.classList.add('guessed-element');
      }
      
      const atomicNumber = document.createElement('div');
      atomicNumber.className = 'atomic-number';
      atomicNumber.textContent = guessedElement.number;
      
      const symbol = document.createElement('div');
      symbol.className = 'symbol';
      symbol.textContent = guessedElement.symbol;
      
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = guessedElement.name;
      
      const family = document.createElement('div');
      family.className = 'family';
      family.textContent = guessedElement.family;
      
      cell.appendChild(atomicNumber);
      cell.appendChild(symbol);
      cell.appendChild(name);
      cell.appendChild(family);
      
      // Color code by accuracy
      const target = gameState.dailyElement;
      const guessNum = guessedElement.number;
      const targetNum = target.number;
      const difference = Math.abs(guessNum - targetNum);

      if (isCorrect) {
        symbol.classList.add('green');
      } else if (difference <= 5) {
        symbol.classList.add('yellow');
      } else {
        symbol.classList.add('red');
      }
    }
  }
}

// Show share button
function showShareButton() {
  const container = document.querySelector('.js-share-button');
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
  infoContainer.appendChild(infoLink);
}

// Show reveal answer
function showRevealAnswer() {
  const container = document.querySelector('.js-reveal-answer');
  const div = document.createElement('div');
  div.className = 'reveal-answer';
  div.textContent = 'The element was: ' + gameState.dailyElement.name + ' (' + gameState.dailyElement.symbol + ')';
  container.appendChild(div);
}

// Disable game if over
function disableGameIfOver() {
  if (gameState.gameOver) {
    document.querySelector('.js-guess-input').disabled = true;
    document.querySelector('.js-guess-button').disabled = true;
    document.querySelector('.js-hint-button').disabled = true;
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
  
  document.querySelector('.js-hours').textContent = String(hours).padStart(2, '0');
  document.querySelector('.js-minutes').textContent = String(minutes).padStart(2, '0');
  document.querySelector('.js-seconds').textContent = String(seconds).padStart(2, '0');
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

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGame);
} else {
  initializeGame();
}
