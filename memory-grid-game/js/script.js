/*
Title: Memory Grid Game
Author: Angad Bains
Description: A memory-based pattern game where the player must replicate
an increasingly long sequence of highlighted tiles. The game tracks score,
stores high score and recent history using localStorage, and includes
audio feedback and an animated splash screen.
*/

window.addEventListener("load", () => {

    // -------------------------
    // CANVAS SETUP (SPLASH SCREEN)
    // -------------------------
    const canvas = document.getElementById("splash-canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Keep canvas responsive to window size
    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // -------------------------
    // AUDIO SYSTEM
    // -------------------------
    let audioCtx;

    // Initializes audio context (must be triggered by user interaction)
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Plays a short tone based on tile index
    function playTone(index) {
        if (!audioCtx) return;

        const frequencies = [261, 293, 329, 349, 392, 440, 493, 523, 587];

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.frequency.value = frequencies[index];
        osc.type = "sine";

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }

    // -------------------------
    // SPLASH ANIMATION
    // -------------------------

    // Create floating particle objects
    let particles = [];
    for (let i = 0; i < 25; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            dx: (Math.random() - 0.5) * 0.5,
            dy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1
        });
    }

    // Index of currently flashing tile in splash grid
    let flashIndex = -1;

    // Continuously animates splash screen
    function animateSplash() {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw moving particles
        ctx.fillStyle = "#00c6ff";
        particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;

            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw animated mini grid
        const gridSize = 3;
        const tileSize = 30;
        const gap = 5;

        const startX = canvas.width / 2 - (gridSize * tileSize + gap * 2) / 2;
        const startY = canvas.height * 0.45;

        for (let i = 0; i < 9; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;

            const x = startX + col * (tileSize + gap);
            const y = startY + row * (tileSize + gap);

            ctx.fillStyle = (i === flashIndex) ? "#f1c40f" : "#333";
            ctx.fillRect(x, y, tileSize, tileSize);
        }

        // Draw title text
        ctx.fillStyle = "white";
        ctx.font = "bold 26px Arial";
        ctx.textAlign = "center";
        ctx.fillText("MEMORY GRID GAME", canvas.width / 2, canvas.height * 0.2);

        requestAnimationFrame(animateSplash);
    }

    // Randomly flash tiles on splash screen
    setInterval(() => {
        flashIndex = Math.floor(Math.random() * 9);
    }, 600);

    animateSplash();

    // -------------------------
    // DOM ELEMENT REFERENCES
    // -------------------------
    const splashScreen = document.getElementById("splash-screen");
    const gameScreen = document.getElementById("game-screen");
    const startBtn = document.getElementById("start-btn");
    const restartBtn = document.getElementById("restart-btn");
    const menuBtn = document.getElementById("menu-btn");
    const helpBtn = document.getElementById("help-btn");
    const helpSection = document.getElementById("help-section");
    const tiles = document.querySelectorAll(".tile");
    const scoreDisplay = document.getElementById("score");
    const statusMessage = document.getElementById("status-message");
    const highScoreDisplay = document.getElementById("high-score");

    // -------------------------
    // LOCAL STORAGE (DATA PERSISTENCE)
    // -------------------------
    let highScore = localStorage.getItem("memoryHighScore") || 0;
    let history = JSON.parse(localStorage.getItem("memoryHistory")) || [];

    // Updates UI with high score and recent scores
    function updateHistoryDisplay() {
        highScoreDisplay.textContent =
            "High Score: " + highScore +
            " | Recent Scores: " + (history.length ? history.join(", ") : "None");
    }

    updateHistoryDisplay();

    // -------------------------
    // GAME CLASS (MODEL + LOGIC)
    // -------------------------

    // Handles all game state, logic, and progression
    class Game {
        constructor() {
            this.pattern = [];
            this.userPattern = [];
            this.round = 0;
            this.isUserTurn = false;
        }

        // Starts or resets the game
        startGame() {
            this.pattern = [];
            this.round = 0;
            statusMessage.textContent = "Starting...";
            this.nextRound();
        }

        // Advances to next round
        nextRound() {
            this.userPattern = [];
            this.round++;
            scoreDisplay.textContent = "Score: " + (this.round - 1);
            statusMessage.textContent = "Watch the pattern...";

            this.addToPattern();
            this.playPattern();
        }

        // Adds a random tile to the sequence
        addToPattern() {
            const randomIndex = Math.floor(Math.random() * tiles.length);
            this.pattern.push(randomIndex);
        }

        // Plays back the pattern visually and with sound
        playPattern() {
            this.isUserTurn = false;

            let i = 0;
            const interval = setInterval(() => {
                this.flashTile(this.pattern[i]);
                this.playSound(this.pattern[i]);
                i++;

                if (i >= this.pattern.length) {
                    clearInterval(interval);
                    this.isUserTurn = true;
                    statusMessage.textContent = "Your turn!";
                }
            }, 600);
        }

        // Visually flashes a tile and plays sound
        flashTile(index) {
            const tile = tiles[index];
            tile.classList.add("active");

            this.playSound(index);

            setTimeout(() => {
                tile.classList.remove("active");
            }, 300);
        }

        // Wrapper for sound playback
        playSound(index) {
            playTone(index);
        }

        // Handles user input and checks correctness
        handleUserClick(index) {
            if (!this.isUserTurn) return;

            this.userPattern.push(index);

            const currentStep = this.userPattern.length - 1;

            if (this.userPattern[currentStep] !== this.pattern[currentStep]) {
                this.gameOver();
                return;
            }

            if (this.userPattern.length === this.pattern.length) {
                this.isUserTurn = false;
                statusMessage.textContent = "Correct!";
                setTimeout(() => this.nextRound(), 800);
            }
        }

        // Ends the game and updates score/history
        gameOver() {
            const finalScore = this.round - 1;

            if (finalScore > highScore) {
                highScore = finalScore;
                localStorage.setItem("memoryHighScore", highScore);
            }

            history.push(finalScore);
            if (history.length > 5) {
                history.shift();
            }

            localStorage.setItem("memoryHistory", JSON.stringify(history));

            updateHistoryDisplay();

            statusMessage.textContent = "Game Over! Final Score: " + finalScore;
            this.isUserTurn = false;
        }
    }

    const game = new Game();

    // -------------------------
    // EVENT LISTENERS
    // -------------------------

    // Start game button
    startBtn.addEventListener("click", () => {
        initAudio();
        splashScreen.style.display = "none";
        gameScreen.style.display = "block";
        game.startGame();
    });

    // Restart game
    restartBtn.addEventListener("click", () => {
        game.startGame();
    });

    // Return to main menu
    menuBtn.addEventListener("click", () => {
        gameScreen.style.display = "none";
        splashScreen.style.display = "flex";
    });

    // Toggle help section
    helpBtn.addEventListener("click", () => {
        helpSection.style.display =
            helpSection.style.display === "none" ? "block" : "none";
    });

    // Tile click handling
    tiles.forEach(tile => {
        tile.addEventListener("click", () => {
            const index = parseInt(tile.dataset.id);
            game.flashTile(index);
            game.handleUserClick(index);
        });
    });

});