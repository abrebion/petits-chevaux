class Game {
  constructor(players) {
    this.players = players;
    this.currentPlayer = 0;
    this.currentToken = 0;
    this.diceValue = null;
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
        const yardTop = this.getCellElement("yard-" + player.color + "-" + i).top;
        const yardLeft = this.getCellElement("yard-" + player.color + "-" + i).left;
        newTokenEl.style.top = `${yardTop + 12.5}px`;
        newTokenEl.style.left = `${yardLeft + 12.5}px`;
      }
      // Reset player score after end of game
      player.score = 0;
      // Reset number of active token on board
      player.activeTokens = 0;
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
      player.tokens = tokens;
      return player;
    });
  }

  rollDice() {
    this.diceValue = Math.floor(Math.random() * 6 + 1);
    if (!this.players[this.currentPlayer].activeTokens && this.diceValue !== 6) {
      console.log("You should get a 6 to enter the board");
      this.renderUserFeedback("red");
      window.setTimeout(() => {
        this.rotatePlayer();
      }, 3000);
      return;
    }
    this.renderUserFeedback();
    const tokens = this.getSelectableTokens(this.players[this.currentPlayer]);

    if (!this.players[this.currentPlayer].activeTokens && this.diceValue !== 6) {
      console.log("You should get a 6 to start");
      this.rotatePlayer();
      return;
    }
    // if (!token.canMove) {
    //   if (this.diceValue !== 6 && token.startAttempt > 0) {
    //     token.startAttempt -= 1;
    //     this.rollDice();
    //   }
    //   if (this.diceValue === 6) {
    //     token.canMove = true;
    //     token.isPlaying = true;
    //     token.initialPosition = true;
    //     this.getParentPlayer(token).activeTokens += 1;
    //     this.rotatePlayer();
    //     // this.renderMove(token, this.diceValue);
    //   }
    // }

    // if (!token.canMove) {
    //   token.startAttempt = 1;
    //   return;
    // }
    this.makeSelectable(tokens);
    return this.diceValue;
  }

  // Get all active tokens for a player
  getActiveTokens(player) {
    const activeTokens = player.tokens.filter(element => element.isPlaying);
    return activeTokens.length ? activeTokens : [];
  }

  // Get all tokens that can be selected
  getSelectableTokens(player) {
    if (player.activeTokens === 0) {
      return [player.tokens.filter(element => !element.isPlaying)[0]];
    } else if (player.activeTokens < 4) {
      const eligibleToken = this.diceValue === 6 ? player.tokens.filter(element => !element.isPlaying)[0] : [];
      const activeTokens = this.getActiveTokens(player);
      const selectableTokens = activeTokens.concat(eligibleToken);
      return selectableTokens;
    } else {
      return this.getActiveTokens(player);
    }
  }

  // Highlight selectable tokens
  makeSelectable(tokens) {
    tokens.forEach(token => {
      const tokenEl = this.getTokenElement(token);
      tokenEl.classList.add("selectable", "highlight");
      tokenEl.addEventListener("click", () => this.selectToken(token));
    });
  }

  // Select the token to move
  selectToken(token) {
    this.currentToken = token;

    this.getSelectableTokens(this.players[this.currentPlayer]).forEach(token => {
      const tokenEl = this.getTokenElement(token);
      tokenEl.classList.remove("selectable", "highlight");
      const newTokenEl = tokenEl.cloneNode(true);
      tokenEl.parentElement.replaceChild(newTokenEl, tokenEl);
    });

    const newPosition = this.calculateNextPosition(token, this.diceValue);
    if (token.isSaved) {
      this.incrementScore(this.getParentPlayer(token));
      this.tokenFeedback("save");
    } else {
      this.renderMove(token, newPosition);
    }

    if (token.isSafe) token.position = null;
    else token.position = newPosition;

    this.hitCompetitor(newPosition, this.tokenFeedback);
    if (token.canPlayAgain) {
      token.canPlayAgain = false;
      this.rollDice();
    } else {
      this.rotatePlayer();
    }

    const userFeedbackEl = document.getElementById("user-feedback");
    const newUserFeedbackEl = userFeedbackEl.cloneNode(true);
    userFeedbackEl.parentElement.replaceChild(newUserFeedbackEl, userFeedbackEl);
  }

  // Calculate next position
  calculateNextPosition(token, increment) {
    let nextPosition = 0;

    if (increment === 6) token.canPlayAgain = true;

    // Token has just entered the game, place him at starting location
    if (!token.isPlaying) {
      nextPosition = token.start;
      token.isPlaying = true;
      this.getParentPlayer(token).activeTokens += 1;
    }
    // Token is not on starting position
    else {
      const translatedStart = token.start || 40; // Special case if starting position is 0

      // Token is entering the safe zone
      if (token.position < translatedStart && token.position + increment >= translatedStart) {
        token.isSafe = true;
        token.safePosition = token.position + increment - (translatedStart - 1);
        if (token.safePosition > 4) {
          token.isSaved = true;
        }
        nextPosition = token.safePosition;
      }

      // Token is already in the safe zone but has not reach the end yet
      else if (token.safePosition) {
        nextPosition = token.safePosition + increment;
        token.safePosition = token.safePosition + increment;
        if (nextPosition > 4) {
          token.isSaved = true;
          document.getElementById("token-" + token.color + "-" + token.id).remove();
        }
      }

      // Default case
      else {
        nextPosition = token.position + increment <= 39 ? token.position + increment : token.position + increment - 40;
      }
    }

    return nextPosition;
  }

  // Retrieve DOM element for a token
  getTokenElement(token) {
    return document.getElementById("token-" + token.color + "-" + token.id);
  }

  // Get coordinates of a cell
  getCellElement(cell, color = null, safe = false) {
    if (safe) return document.querySelector(`.cell.${color}-safe-${cell}`).getBoundingClientRect();
    return document.getElementById("cell-" + cell).getBoundingClientRect();
  }

  // Perform a token move
  renderMove(token, targetPosition) {
    const tokenElement = this.getTokenElement(token);
    let targetCellElement = this.getCellElement(targetPosition, token.color, token.isSafe);
    tokenElement.style.top = `${targetCellElement.top + 10}px`;
    tokenElement.style.left = `${targetCellElement.left + 10}px`;
    console.log(`Player "token-${token.color}-${token.id}" is moving by ${this.diceValue}, from position ${token.position} to position ${targetPosition}`);
  }

  // Get all active tokens for all players
  getAllActiveTokens() {
    return this.players
      .reduce((acc, element) => {
        const token = element.tokens.filter(el => el.isPlaying);
        acc.push(token);
        return acc;
      }, [])
      .flat();
  }

  initToken(token) {
    token.isPlaying = false;
    token.isSafe = false;
    token.safePosition = null;
    token.isSaved = false;
    token.position = token.start;
    token.canMove = false;
    token.initialPosition = false;
    token.canPlayAgain = false;
    this.replaceTokenInYard(token);
    this.getParentPlayer(token).activeTokens -= 1;
    return token;
  }

  replaceTokenInYard(token) {
    const tokenEl = this.getTokenElement(token);
    tokenEl.style.top = `${this.getCellElement("yard-" + token.color + "-" + token.id).top + 12.5}px`;
    tokenEl.style.left = `${this.getCellElement("yard-" + token.color + "-" + token.id).left + 12.5}px`;
  }

  hitCompetitor(position, callback) {
    const activeTokens = this.getAllActiveTokens();
    activeTokens.forEach(token => {
      if (token.color !== this.players[this.currentPlayer].color && token.position === position) {
        this.initToken(token);
        callback("hit");
      }
    });
    return activeTokens;
  }

  renderUserFeedback(color = "black") {
    const diceValueEl = document.getElementById("dice-value");
    diceValueEl.textContent = this.diceValue;
    const userTipEl = document.getElementById("user-tip");
    let userTip = "";
    if (this.diceValue === 6 && !this.players[this.currentPlayer].activeTokens) userTip = `Great! You can enter the game<br>and play one more time.`;
    else if (this.diceValue !== 6 && !this.players[this.currentPlayer].activeTokens) userTip = `Ouch! You should get a 6 to enter the game.<br>Next player will automatically play in 3s.`;
    else if (this.diceValue === 6) userTip = `You can play again<br>or enroll a new token on the board.`;
    else userTip = `Select the token you want to move.`;
    userTipEl.innerHTML = userTip;
    userTipEl.style.color = color;
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

  // Get player name
  getPlayerName(player) {
    return player.name;
  }

  // Get parent player object
  getParentPlayer(token) {
    return this.players.filter(element => element.color === token.color)[0];
  }

  // Increment and render score
  incrementScore(player) {
    player.score += 1;
    const playerElement = document.querySelector("#player-" + player.color + " .player-name .score");
    playerElement.textContent = `${player.score}`;
    playerElement.classList.add("animated");
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
    const nextPlayer = document.getElementById("next-player");
    nextPlayer.textContent = `${this.getPlayerName(this.players[this.currentPlayer])}, you rolled the dice and got a...`;
    const newnextPlayer = nextPlayer.cloneNode(true);
    nextPlayer.parentElement.replaceChild(newnextPlayer, nextPlayer);
    this.rollDice();
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
    this.initialPosition = false;
    this.canPlayAgain = false;
  }
}
