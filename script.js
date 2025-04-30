// --- DOM Element References ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const messageOverlay = document.getElementById('messageOverlay');
const messageText = document.getElementById('messageText');
const restartButton = document.getElementById('restartButton');

// --- Game Constants ---
const BIRD_WIDTH = 30;
const BIRD_HEIGHT = 30;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150; // Vertical gap between pipes
const GRAVITY = 0.4;
const FLAP_STRENGTH = -7; // Negative value for upward movement
const PIPE_SPEED = 3; // How fast pipes move left

// --- Game Variables ---
let birdX, birdY, birdVelocityY;
let pipes = []; // Array to hold pipe objects {x, y (top pipe bottom edge), passed}
let score;
let highScore;
let frameCount; // Counter for timing events like pipe generation
let gameStarted = false; // Flag to check if the game loop is active
let gameOver = false; // Flag to check if the game has ended
let animationFrameId = null; // To store the requestAnimationFrame ID

// --- High Score Handling ---
/**
 * Loads the high score from localStorage.
 */
function loadHighScore() {
    const savedScore = localStorage.getItem('flappyHighScore');
    highScore = savedScore ? parseInt(savedScore, 10) : 0;
    highScoreDisplay.textContent = highScore;
}

/**
 * Saves the current score as the high score if it's higher.
 */
function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore);
        highScoreDisplay.textContent = highScore;
    }
}

// --- Game Initialization and Reset ---
/**
 * Resets the game state to its initial values.
 */
function resetGame() {
    // Cancel any existing game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Set initial bird position and velocity
    birdX = canvas.width / 4;
    birdY = canvas.height / 2 - BIRD_HEIGHT / 2;
    birdVelocityY = 0;

    // Reset pipes, score, and frame count
    pipes = [];
    score = 0;
    frameCount = 0;
    scoreDisplay.textContent = score;

    // Reset game state flags
    gameStarted = false;
    gameOver = false;

    // Hide game over message
    messageOverlay.style.display = 'none';

    // Start the first pipe generation
    generatePipePair();

    // Load high score
    loadHighScore();

    // Draw initial state (start screen)
    draw(); // Draw the initial frame before starting the loop
}

// --- Pipe Generation ---
/**
 * Creates a new pair of pipes (top and bottom) and adds them to the pipes array.
 */
function generatePipePair() {
    // Calculate random height for the top pipe's bottom edge
    // Ensure the gap doesn't go off-screen
    const minTopPipeHeight = 50; // Minimum space from the top
    const maxTopPipeHeight = canvas.height - PIPE_GAP - 50; // 50px buffer from bottom
    const topPipeBottomY = Math.random() * (maxTopPipeHeight - minTopPipeHeight) + minTopPipeHeight;

    pipes.push({
        x: canvas.width, // Start pipe at the right edge
        y: topPipeBottomY, // Bottom edge of the top pipe
        passed: false // Flag to track if bird passed this pipe for scoring
    });
}

// --- Input Handling ---
/**
 * Makes the bird "flap" upwards. Starts the game if it hasn't begun.
 */
function flap() {
    if (gameOver) return; // Don't flap if game is over

    if (!gameStarted) {
        gameStarted = true; // Start the game on first flap
        if (!animationFrameId) { // Prevent multiple loops
             gameLoop(); // Start the main game loop
        }
    }
    birdVelocityY = FLAP_STRENGTH; // Apply upward velocity
}

// --- Event Listeners ---
// Listen for spacebar press
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
       if (gameOver) {
           resetGame(); // Restart on space if game over
       } else {
           flap();
       }
    }
});

// Listen for mouse click on the canvas
canvas.addEventListener('mousedown', () => {
     if (gameOver) {
         resetGame(); // Restart on click if game over
     } else {
         flap();
     }
});

// Listen for touch start on the canvas (for mobile)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default touch behavior (like scrolling or zooming)
     if (gameOver) {
         resetGame(); // Restart on tap if game over
     } else {
         flap();
     }
}, { passive: false }); // Use passive: false to allow preventDefault

// Listen for click on the restart button in the overlay
restartButton.addEventListener('click', resetGame);

// --- Collision Detection ---
/**
 * Checks if the bird has collided with the ground, ceiling, or pipes.
 * @returns {boolean} True if a collision occurred, false otherwise.
 */
function checkCollisions() {
    // Ground collision
    if (birdY + BIRD_HEIGHT > canvas.height - 20) { // Adjusted for ground height
        return true;
    }
    // Ceiling collision
    if (birdY < 0) {
        return true;
    }

    // Pipe collision
    for (let pipe of pipes) {
        const topPipeBottomY = pipe.y;
        const bottomPipeTopY = pipe.y + PIPE_GAP;

        // Check if bird is horizontally aligned with the current pipe's collision box
        if (birdX + BIRD_WIDTH > pipe.x && birdX < pipe.x + PIPE_WIDTH) {
            // Check if bird hits the top OR bottom pipe vertically
            if (birdY < topPipeBottomY || birdY + BIRD_HEIGHT > bottomPipeTopY) {
                return true; // Collision detected
            }
        }
    }
    return false; // No collision
}

// --- Game Over ---
/**
 * Handles the game over sequence: stops the loop, saves score, shows message.
 */
function triggerGameOver() {
    gameOver = true;
    gameStarted = false; // Stop game logic updates
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId); // Stop the drawing loop
        animationFrameId = null;
    }
    saveHighScore(); // Save score if it's a new high score
    messageText.textContent = `Game Over! Score: ${score}`;
    messageOverlay.style.display = 'flex'; // Show the overlay using flex for centering
}

// --- Drawing Functions ---
/**
 * Draws the bird on the canvas.
 */
function drawBird() {
    ctx.fillStyle = '#FFD700'; // Yellow bird color
    // Draw bird body
    ctx.fillRect(birdX, birdY, BIRD_WIDTH, BIRD_HEIGHT);

    // Simple eye for direction/detail
    ctx.fillStyle = '#000'; // Black eye
    ctx.fillRect(birdX + BIRD_WIDTH * 0.6, birdY + BIRD_HEIGHT * 0.3, 5, 5); // Position the eye
}

/**
 * Draws all the pipes currently in the pipes array.
 */
function drawPipes() {
    ctx.fillStyle = '#228B22'; // Green pipe color
    for (let pipe of pipes) {
        // Draw top pipe (rectangle from top edge to the calculated gap start)
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.y);

        // Calculate the top Y coordinate of the bottom pipe
        const bottomPipeTopY = pipe.y + PIPE_GAP;
        // Draw bottom pipe (rectangle from the gap end to the canvas bottom)
        ctx.fillRect(pipe.x, bottomPipeTopY, PIPE_WIDTH, canvas.height - bottomPipeTopY);
    }
}

/**
 * Clears the canvas and draws the background elements (sky, ground).
 */
function drawBackground() {
    // Clear canvas with sky blue color
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw a simple ground rectangle
    ctx.fillStyle = '#8B4513'; // Brown ground color
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20); // Ground height of 20px
}

/**
 * Draws the "Click to Start" message when the game hasn't started.
 */
 function drawStartMessage() {
    // Only draw if the game hasn't started and isn't over
    if (!gameStarted && !gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Semi-transparent black text
        // Use responsive font size based on canvas width
        ctx.font = `${Math.max(12, canvas.width * 0.05)}px 'Press Start 2P'`;
        ctx.textAlign = 'center'; // Center the text horizontally
        // Position text near the center of the canvas
        ctx.fillText('Click or Tap', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText('to Start', canvas.width / 2, canvas.height / 2 + 20);
    }
}


// --- Update Game State ---
/**
 * Updates the positions and states of game elements (bird, pipes).
 */
function update() {
    if (gameOver || !gameStarted) return; // Don't update if game isn't running

    // --- Bird Physics ---
    birdVelocityY += GRAVITY; // Apply gravity
    birdY += birdVelocityY; // Update bird's vertical position

    // --- Pipe Movement and Generation ---
    frameCount++; // Increment frame counter for timing

    // Generate new pipes at regular intervals
    // Difficulty scaling: generate pipes slightly faster as score increases
    const pipeGenerationInterval = Math.max(70, 110 - Math.floor(score / 5)); // Min interval 70 frames
    if (frameCount % pipeGenerationInterval === 0) {
        generatePipePair();
    }

    // Move existing pipes to the left and check for scoring
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= PIPE_SPEED; // Move pipe left

        // Check if the bird has successfully passed the pipe
        if (!pipes[i].passed && pipes[i].x + PIPE_WIDTH < birdX) {
            pipes[i].passed = true; // Mark pipe as passed
            score++; // Increment score
            scoreDisplay.textContent = score; // Update score display
            // Optional: Add sound effect here using Tone.js if desired
            // Example: synth.triggerAttackRelease("C5", "8n");
        }

        // Remove pipes that have moved completely off-screen to the left
        if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1); // Remove the pipe from the array
        }
    }

    // --- Collision Check ---
    if (checkCollisions()) {
        triggerGameOver(); // End the game if a collision occurs
    }
}

// --- Main Drawing Function ---
/**
 * Clears the canvas and redraws all game elements in their current state.
 */
function draw() {
    drawBackground(); // Draw sky and ground first
    drawPipes();      // Draw pipes
    drawBird();       // Draw the bird on top
    drawStartMessage(); // Draw start message if applicable
}

// --- Game Loop ---
/**
 * The main loop that runs the game, updating state and redrawing each frame.
 */
function gameLoop() {
    if (gameOver) return; // Stop the loop if game over

    update(); // Update game state (physics, positions, scoring)
    draw();   // Draw the current frame

    // Request the next frame, storing the ID
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Canvas Resizing ---
/**
 * Adjusts the canvas size to fit the window while maintaining aspect ratio.
 * Resets the game if it's not currently running.
 */
function resizeCanvas() {
    // Get available space (window dimensions minus some padding/margins)
    const container = document.body;
    const availableWidth = container.clientWidth - 20; // Account for body padding
    // Calculate available height, leaving space for info text below
    const availableHeight = container.clientHeight - (document.querySelector('.info-container').offsetHeight + 40); // 40px extra margin

    // Define the desired aspect ratio
    const aspectRatio = 4 / 3;

    // Calculate potential width/height based on available space and aspect ratio
    let newWidth = availableWidth;
    let newHeight = newWidth / aspectRatio;

    // If calculated height exceeds available height, recalculate based on height
    if (newHeight > availableHeight) {
        newHeight = availableHeight;
        newWidth = newHeight * aspectRatio;
    }

    // Ensure minimum dimensions for playability
    newWidth = Math.max(300, newWidth); // Minimum width 300px
    newHeight = Math.max(225, newHeight); // Minimum height based on aspect ratio (300 / (4/3))

    // Apply the calculated dimensions to the canvas
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Important: Reset the game after resizing to adjust element positions
    // Only reset fully if the game wasn't actively running to avoid disrupting gameplay
    // If the game was running, a more sophisticated approach might try to reposition elements,
    // but a full reset is simpler and often acceptable for resizes.
    resetGame(); // Re-initialize positions and redraw based on new size
}


// --- Initial Setup ---
// Add event listener for window resize events
window.addEventListener('resize', resizeCanvas);

// Perform initial setup when the window loads
window.onload = () => {
    resizeCanvas(); // Set initial canvas size and reset the game
    // Note: resetGame() is called within resizeCanvas(), so no need to call it twice.
};
