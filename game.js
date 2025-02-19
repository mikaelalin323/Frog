class Game {
    constructor() {
        this.board = document.getElementById('game-board');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.highScoreElement = document.getElementById('highScore');
        this.timerElement = document.getElementById('timer');
        this.gameOverScreen = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');
        this.restartButton = document.getElementById('restart-button');

        this.gridSize = 13;
        this.cellSize = this.board.clientWidth / this.gridSize;
        this.score = 0;
        this.lives = 3;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.startTime = 0;
        this.timeBonus = 0;
        this.isGameOver = false;

        // Sound effects (temporarily disabled)
        this.sounds = {
            jump: { play: () => {} },
            collision: { play: () => {} },
            score: { play: () => {} }
        };

        // Initialize game elements
        this.createBoard();
        this.initializeFrog();
        this.initializeObstacles();
        this.setupEventListeners();
        this.startTimer();
        this.gameLoop();
    }

    createBoard() {
        this.board.innerHTML = '';
        for (let i = 0; i < this.gridSize; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            
            // Set row type
            if (i === 0 || i === this.gridSize - 1) {
                row.classList.add('safe');
            } else if (i < 6) {
                row.classList.add('water');
            } else {
                row.classList.add('road');
            }

            for (let j = 0; j < this.gridSize; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                row.appendChild(cell);
            }
            this.board.appendChild(row);
        }
    }

    initializeFrog() {
        this.frog = document.createElement('div');
        this.frog.className = 'frog';
        this.frogPosition = {
            x: Math.floor(this.gridSize / 2) * this.cellSize,
            y: (this.gridSize - 1) * this.cellSize
        };
        this.updateFrogPosition();
        this.board.appendChild(this.frog);
    }

    initializeObstacles() {
        this.obstacles = [];
        
        // Create cars
        for (let i = 7; i < this.gridSize - 1; i++) {
            const speed = (Math.random() * 2 + 1) * (i % 2 ? 1 : -1);
            for (let j = 0; j < 3; j++) {
                this.createObstacle('car', i, speed);
            }
        }

        // Create logs
        for (let i = 1; i < 6; i++) {
            const speed = (Math.random() * 1.5 + 0.5) * (i % 2 ? 1 : -1);
            for (let j = 0; j < 2; j++) {
                this.createObstacle('log', i, speed);
            }
        }
    }

    createObstacle(type, row, speed) {
        const obstacle = document.createElement('div');
        obstacle.className = type;
        const x = Math.random() * (this.board.clientWidth - 80);
        const y = row * this.cellSize;
        
        this.obstacles.push({
            element: obstacle,
            x: x,
            y: y,
            speed: speed,
            type: type,
            width: type === 'car' ? 80 : 120
        });

        obstacle.style.left = x + 'px';
        obstacle.style.top = y + 'px';
        this.board.appendChild(obstacle);
    }

    updateFrogPosition() {
        this.frog.style.left = this.frogPosition.x + 'px';
        this.frog.style.top = this.frogPosition.y + 'px';
    }

    moveObstacles() {
        this.obstacles.forEach(obstacle => {
            obstacle.x += obstacle.speed;
            
            // Wrap around
            if (obstacle.speed > 0 && obstacle.x > this.board.clientWidth) {
                obstacle.x = -obstacle.width;
            } else if (obstacle.speed < 0 && obstacle.x < -obstacle.width) {
                obstacle.x = this.board.clientWidth;
            }

            obstacle.element.style.left = obstacle.x + 'px';
        });
    }

    checkCollisions() {
        const frogRow = Math.floor(this.frogPosition.y / this.cellSize);
        let onLog = false;

        // Check if frog is in water
        if (frogRow > 0 && frogRow < 6) {
            const logsInRow = this.obstacles.filter(obs => 
                obs.type === 'log' && 
                Math.floor(obs.y / this.cellSize) === frogRow
            );

            onLog = logsInRow.some(log => 
                this.frogPosition.x + 20 >= log.x && 
                this.frogPosition.x + 20 <= log.x + log.width
            );

            if (!onLog) {
                this.handleCollision();
                return;
            }
        }

        // Check car collisions
        const carCollision = this.obstacles.some(obs => {
            if (obs.type !== 'car') return false;
            return this.frogPosition.x + 40 > obs.x &&
                   this.frogPosition.x < obs.x + obs.width &&
                   this.frogPosition.y + 40 > obs.y &&
                   this.frogPosition.y < obs.y + 40;
        });

        if (carCollision) {
            this.handleCollision();
        }

        // Check if frog reached the top
        if (this.frogPosition.y === 0) {
            this.handleSuccess();
        }
    }

    handleCollision() {
        this.sounds.collision.play();
        this.lives--;
        this.livesElement.textContent = this.lives;
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.resetFrog();
        }
    }

    handleSuccess() {
        this.sounds.score.play();
        this.score += 100;
        this.timeBonus = Math.max(0, Math.floor(2000 / (Date.now() - this.startTime)));
        this.score += this.timeBonus;
        this.scoreElement.textContent = this.score;
        this.resetFrog();
        this.startTimer();
    }

    resetFrog() {
        this.frogPosition = {
            x: Math.floor(this.gridSize / 2) * this.cellSize,
            y: (this.gridSize - 1) * this.cellSize
        };
        this.updateFrogPosition();
    }

    gameOver() {
        this.isGameOver = true;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
            this.highScoreElement.textContent = this.highScore;
        }
        this.finalScoreElement.textContent = this.score;
        this.gameOverScreen.classList.remove('hidden');
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.isGameOver) return;

            const oldX = this.frogPosition.x;
            const oldY = this.frogPosition.y;

            switch (e.key) {
                case 'ArrowUp':
                    if (this.frogPosition.y > 0) {
                        this.frogPosition.y -= this.cellSize;
                    }
                    break;
                case 'ArrowDown':
                    if (this.frogPosition.y < (this.gridSize - 1) * this.cellSize) {
                        this.frogPosition.y += this.cellSize;
                    }
                    break;
                case 'ArrowLeft':
                    if (this.frogPosition.x > 0) {
                        this.frogPosition.x -= this.cellSize;
                    }
                    break;
                case 'ArrowRight':
                    if (this.frogPosition.x < (this.gridSize - 1) * this.cellSize) {
                        this.frogPosition.x += this.cellSize;
                    }
                    break;
                default:
                    return;
            }

            if (oldX !== this.frogPosition.x || oldY !== this.frogPosition.y) {
                this.sounds.jump.play();
                this.updateFrogPosition();
            }
        });

        this.restartButton.addEventListener('click', () => {
            window.location.reload();
        });
    }

    startTimer() {
        this.startTime = Date.now();
    }

    updateTimer() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        this.timerElement.textContent = elapsed;
    }

    gameLoop() {
        if (!this.isGameOver) {
            this.moveObstacles();
            this.checkCollisions();
            this.updateTimer();
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});
