class Game {
  constructor(players) {
    this.players = players;
    this.currentPlayer = 0;
    this.currentToken = 0;
    this.initPlayers();
  }

  // Set the starting position based on color
  getStartingPosition(color) {
    if (color === "green") return 0;
    if (color === "yellow") return 10;
    if (color === "red") return 20;
    if (color === "blue") return 30;
  }

  // Initialize token positions on board
  initPlayers() {
    // Reset current player and current token property
    this.currentPlayer = 0;
    this.currentToken = 0;

    return this.players.map(player => {
      const tokens = [];
      for (let i = 1; i <= 4; i++) {
        tokens.push(new Token(player.color, i, this.getStartingPosition(player.color)));
        const newTokenEl = document.createElement("div");
        newTokenEl.id = `token-${player.color}-${i}`;
        newTokenEl.className = `token ${player.color}`;
        document.body.appendChild(newTokenEl);
        const yardTop = getCellCoordinates("yard-" + player.color + "-" + i).top;
        const yardLeft = getCellCoordinates("yard-" + player.color + "-" + i).left;
        newTokenEl.style.top = `${yardTop + 12.5}px`;
        newTokenEl.style.left = `${yardLeft + 12.5}px`;
      }
      // Reset player score after end of game
      player.score = 0;
      // Render player's names on board
      const playerName = document.createElement("span");
      playerName.textContent = player.name;
      document.querySelector("#player-" + player.color + " .player-name").appendChild(playerName);
      const playerScoreLabel = document.createElement("span");
      playerScoreLabel.textContent = ", score: ";
      document.querySelector("#player-" + player.color + " .player-name").appendChild(playerScoreLabel);
      const playerScoreValue = document.createElement("span");
      playerScoreValue.className = "score";
      playerScoreValue.textContent = "0";
      document.querySelector("#player-" + player.color + " .player-name").appendChild(playerScoreValue);
      document.getElementById("roll-dice-btn").textContent = `${this.getPlayerName(this.players[this.currentPlayer])} rolls the dice`;
      player.tokens = tokens;
      return player;
    });
  }

  // Get player name
  getPlayerName(player) {
    return player.name;
  }

  // Increment and render score
  incrementScore(player) {
    player.score += 1;
    document.querySelector("#player-" + player.color + " .player-name .score").textContent = `${player.score}`;
    document.querySelector("#player-" + player.color + " .player-name .score").classList.add("animated");
  }

  // Display winner
  getWinner() {
    const winner = this.players.filter(element => element.score === 4);
    if (winner.length > 0) return winner[0].name;
  }

  // Rotate through players
  rotatePlayer() {
    if (this.currentPlayer < this.players.length - 1) this.currentPlayer += 1;
    else this.currentPlayer = 0;
    document.getElementById("roll-dice-btn").textContent = `${this.getPlayerName(this.players[this.currentPlayer])} rolls the dice`;
  }

  getActiveTokens() {
    return this.players
      .reduce((acc, element) => {
        const token = element.tokens.filter(el => el.isPlaying);
        acc.push(token);
        return acc;
      }, [])
      .flat();
  }

  // Select token to play with
  selectToken(player) {
    this.currentToken = player.tokens.filter(element => !element.isSaved)[0];
    console.log("Result of select token:", this.currentToken);
    return this.currentToken;
  }

  // Main function to rotate players
  play(token) {
    return e => {
      token.move();
      if (token.isSaved) {
        this.incrementScore(this.players[this.currentPlayer]);
        token.tokenFeedback("save");
      }
      if (token.initialPosition) {
        // console.log("Player plays again because he's just entered the board");
        token.initialPosition = false;
      } else if (token.canPlayAgain) {
        // console.log("Player plays again because he got a 6.");
        token.canPlayAgain = false;
      } else {
        this.rotatePlayer();
      }
      document.getElementById("roll-dice-btn").onclick = this.play(this.selectToken(this.players[this.currentPlayer]));
    };
  }
}

class Token {
  constructor(color, id, start) {
    this.id = id;
    this.color = color;
    this.start = start;
    this.position = this.start;
    this.isPlaying = false;
    this.isSafe = false;
    this.safePosition = 0;
    this.isSaved = false;
    this.canMove = false;
    this.startAttempt = 3;
    this.initialPosition = false;
    this.canPlayAgain = false;
  }

  move() {
    const increment = this.rollDice();

    if (!this.canMove) {
      if (increment !== 6 && this.startAttempt > 0) {
        this.startAttempt -= 1;
        this.move();
        return;
      }
      if (increment === 6) {
        this.canMove = true;
        this.isPlaying = true;
        this.initialPosition = true;
        this.getCellCoordinates = 3;
      }
    }

    if (!this.canMove) {
      this.renderUserFeedback(increment);
      this.startAttempt = 3;
      return;
    }

    console.log(this);
    if (increment === 6 && !this.initialPosition) {
      this.canPlayAgain = true;
    }

    // Set the next position to reach
    const currentPosition = this.position; // Used for logging purpose
    let nextPosition = 0;

    // Token has just entered the game, place him at starting location
    if (this.initialPosition === true) {
      nextPosition = this.start;
    }
    // Token is not on starting position
    else {
      const translatedStart = this.start || 40; // Special case if starting position is 0

      // Token is entering the safe zone
      if (this.position < translatedStart && this.position + increment >= translatedStart) {
        this.isSafe = true;
        this.safePosition = this.position + increment - (translatedStart - 1);
        this.position = null;
        if (this.safePosition > 4) {
          this.isSaved = true;
          // game.incrementScore();
          return;
        }
        nextPosition = this.safePosition;
      }

      // Token is already in the safe zone but has not reach the end yet
      else if (this.safePosition) {
        nextPosition = this.safePosition + increment;
        this.safePosition = this.safePosition + increment;
        if (nextPosition > 4) {
          this.isSaved = true;
          // alert(`Token ${this.color} is saved`);
          document.getElementById("token-" + this.color + "-" + this.id).remove();
          // game.incrementScore();
          return;
        }
      }

      // Default case
      else {
        nextPosition = this.position + increment <= 39 ? this.position + increment : this.position + increment - 40;
        this.position = nextPosition;
      }
    }
    // Perform the move
    const newTop = getCellCoordinates(nextPosition, this.color, this.isSafe).top;
    const newLeft = getCellCoordinates(nextPosition, this.color, this.isSafe).left;
    console.log(`Player "token-${this.color}-${this.id}" is moving by ${increment}, from position ${currentPosition} to position ${nextPosition}`);
    document.getElementById("token-" + this.color + "-" + this.id).style.top = `${newTop + 10}px`;
    document.getElementById("token-" + this.color + "-" + this.id).style.left = `${newLeft + 10}px`;

    // Perform post move actions
    this.hitCompetitor(nextPosition, this.tokenFeedback);
    this.renderUserFeedback(increment);
  }

  renderUserFeedback(increment) {
    const userMessageEl = document.getElementById("dice-value");
    let userMessage;
    if (increment === 6 && this.initialPosition) userMessage = `Great! You got a ${increment} to enter the game.<br>You can play again.`;
    else if (!this.canMove) userMessage = `Ouch! You should get a 6 to enter the game.<br>Try the next round.`;
    else if (increment === 6) userMessage = `Lucky you! You got a ${increment}.<br>You can roll the dice one more time.`;
    else userMessage = `You got a ${increment}.`;
    userMessageEl.innerHTML = userMessage;
  }

  hitCompetitor(nextPosition, callback) {
    const activeTokens = game.getActiveTokens();
    activeTokens.forEach(token => {
      if (token.color !== this.color && token.position === nextPosition) {
        this.initToken(token);
        callback("hit");
      }
    });
    return activeTokens;
  }

  tokenFeedback(action) {
    const tokenFeedback = document.createElement("div");
    tokenFeedback.className = `feedback-token ${action}`;
    document.getElementById("board").appendChild(tokenFeedback);
    document.getElementById(`sound-${action}`).play();

    setTimeout(() => {
      tokenFeedback.remove();
      if (game.getWinner()) {
        alert(`${game.getWinner()} wins the game! Congratulations.`);
        resetPlayerSettings();
        return;
      }
    }, 1000);
  }

  initToken(token) {
    token.isPlaying = false;
    token.isSafe = false;
    token.safePosition = null;
    token.isSaved = false;
    token.position = token.start;
    token.canMove = false;
    token.startAttempt = 3;
    token.initialPosition = false;
    token.canPlayAgain = false;
    this.replaceTokenInYard(token);
    return token;
  }

  replaceTokenInYard(token) {
    const tokenEl = document.getElementById(`token-${token.color}-${token.id}`);
    const yardTop = getCellCoordinates("yard-" + token.color + "-" + token.id).top;
    const yardLeft = getCellCoordinates("yard-" + token.color + "-" + token.id).left;
    tokenEl.style.top = `${yardTop + 12.5}px`;
    tokenEl.style.left = `${yardLeft + 12.5}px`;
  }

  rollDice() {
    return Math.floor(Math.random() * 6 + 1);
  }
}

// Get token current position
function getCellCoordinates(cell, color = null, safe = false) {
  if (safe) return document.querySelector(`.cell.${color}-safe-${cell}`).getBoundingClientRect();
  return document.getElementById("cell-" + cell).getBoundingClientRect();
}
