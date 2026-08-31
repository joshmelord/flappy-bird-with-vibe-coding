import { useState, useEffect, useRef } from 'react'

const GRAVITY = 0.4
const FLAP_STRENGTH = -10
const PIPE_WIDTH = 80
const PIPE_GAP = 150
const PIPE_SPEED = 5
const PIPE_SPACING = 300
const BIRD_SIZE = 30
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

export function Game() {
  const canvasRef = useRef(null)
  const [gameState, setGameState] = useState('start') // 'start', 'playing', 'gameOver'
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('flappyBirdHighScore') || '0')
  )

  const gameRef = useRef({
    birdY: CANVAS_HEIGHT / 2,
    birdVelocity: 0,
    pipes: [],
    score: 0,
    passedPipes: new Set(),
    nextPipeId: 0,
  })

  // Handle flap input
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (gameState === 'start') {
          startGame()
        } else if (gameState === 'playing') {
          gameRef.current.birdVelocity = FLAP_STRENGTH
        } else if (gameState === 'gameOver') {
          restartGame()
        }
      }
    }

    const handleClick = () => {
      if (gameState === 'start') {
        startGame()
      } else if (gameState === 'playing') {
        gameRef.current.birdVelocity = FLAP_STRENGTH
      } else if (gameState === 'gameOver') {
        restartGame()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    window.addEventListener('click', handleClick)

    return () => {
      window.removeEventListener('keydown', handleKeyPress)
      window.removeEventListener('click', handleClick)
    }
  }, [gameState])

  const startGame = () => {
    gameRef.current = {
      birdY: CANVAS_HEIGHT / 2,
      birdVelocity: 0,
      pipes: [{ x: CANVAS_WIDTH, id: 0, gapY: Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50 }],
      score: 0,
      passedPipes: new Set(),
      nextPipeId: 1,
    }
    setScore(0)
    setGameState('playing')
  }

  const restartGame = () => {
    startGame()
  }

  // Game loop with rendering
  useEffect(() => {
    if (gameState !== 'playing') return

    let animationId
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let gameRunning = true

    const gameLoop = () => {
      if (!gameRunning) return

      const game = gameRef.current

      // Update bird physics
      game.birdVelocity += GRAVITY
      game.birdY += game.birdVelocity

      // Boundary check
      if (game.birdY - BIRD_SIZE / 2 < 0 || game.birdY + BIRD_SIZE / 2 > CANVAS_HEIGHT) {
        gameRunning = false
        endGame()
        return
      }

      // Move pipes
      game.pipes = game.pipes.filter((pipe) => pipe.x > -PIPE_WIDTH)

      game.pipes.forEach((pipe) => {
        pipe.x -= PIPE_SPEED

        // Check if bird passed pipe
        if (pipe.x + PIPE_WIDTH < CANVAS_WIDTH / 2 && !game.passedPipes.has(pipe.id)) {
          game.passedPipes.add(pipe.id)
          game.score += 1
          setScore(game.score)
        }

        // Collision detection
        const birdLeft = CANVAS_WIDTH / 2 - BIRD_SIZE / 2
        const birdRight = CANVAS_WIDTH / 2 + BIRD_SIZE / 2
        const birdTop = game.birdY - BIRD_SIZE / 2
        const birdBottom = game.birdY + BIRD_SIZE / 2

        const pipeLeft = pipe.x
        const pipeRight = pipe.x + PIPE_WIDTH
        const gapTop = pipe.gapY
        const gapBottom = pipe.gapY + PIPE_GAP

        if (
          birdRight > pipeLeft &&
          birdLeft < pipeRight &&
          (birdTop < gapTop || birdBottom > gapBottom)
        ) {
          gameRunning = false
          endGame()
        }
      })

      // Generate new pipe
      if (game.pipes.length === 0 || game.pipes[game.pipes.length - 1].x < CANVAS_WIDTH - PIPE_SPACING) {
        const gapY = Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50
        game.pipes.push({
          x: CANVAS_WIDTH,
          id: game.nextPipeId++,
          gapY,
        })
      }

      // Render frame
      // Clear canvas
      ctx.fillStyle = '#87CEEB'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Draw ground
      ctx.fillStyle = '#8B7355'
      ctx.fillRect(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 60)

      // Draw grass line
      ctx.fillStyle = '#228B22'
      ctx.fillRect(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 8)

      // Draw pipes
      ctx.fillStyle = '#228B22'
      game.pipes.forEach((pipe) => {
        // Top pipe
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY)
        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.gapY + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT - pipe.gapY - PIPE_GAP - 60)
      })

      // Draw bird
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.arc(CANVAS_WIDTH / 2, game.birdY, BIRD_SIZE / 2, 0, Math.PI * 2)
      ctx.fill()

      // Draw bird eye
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(CANVAS_WIDTH / 2 + 7, game.birdY - 5, 4, 0, Math.PI * 2)
      ctx.fill()

      // Draw UI
      ctx.fillStyle = '#000'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(`Score: ${game.score}`, 20, 40)
      ctx.fillText(`High Score: ${highScore}`, 20, 75)

      animationId = requestAnimationFrame(gameLoop)
    }

    animationId = requestAnimationFrame(gameLoop)

    return () => {
      gameRunning = false
      cancelAnimationFrame(animationId)
    }
  }, [gameState, highScore])

  const endGame = () => {
    setGameState('gameOver')
    if (gameRef.current.score > highScore) {
      setHighScore(gameRef.current.score)
      localStorage.setItem('flappyBirdHighScore', gameRef.current.score.toString())
    }
  }

  // Render start and game over screens
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || gameState === 'playing') return

    const ctx = canvas.getContext('2d')

    if (gameState === 'start') {
      // Clear canvas
      ctx.fillStyle = '#87CEEB'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Draw ground
      ctx.fillStyle = '#8B7355'
      ctx.fillRect(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 60)

      // Draw grass line
      ctx.fillStyle = '#228B22'
      ctx.fillRect(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 8)

      // Draw bird at start position
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, BIRD_SIZE / 2, 0, Math.PI * 2)
      ctx.fill()

      // Draw bird eye
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(CANVAS_WIDTH / 2 + 7, CANVAS_HEIGHT / 2 - 5, 4, 0, Math.PI * 2)
      ctx.fill()

      // Draw start message
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('FLAPPY BIRD', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60)
      ctx.font = '24px Arial'
      ctx.fillText('Press SPACE or Click to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40)
    } else if (gameState === 'gameOver') {
      // Clear canvas
      ctx.fillStyle = '#87CEEB'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Draw ground
      ctx.fillStyle = '#8B7355'
      ctx.fillRect(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 60)

      // Draw grass line
      ctx.fillStyle = '#228B22'
      ctx.fillRect(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 8)

      // Draw pipes at final position
      ctx.fillStyle = '#228B22'
      gameRef.current.pipes.forEach((pipe) => {
        // Top pipe
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY)
        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.gapY + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT - pipe.gapY - PIPE_GAP - 60)
      })

      // Draw bird at final position
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.arc(CANVAS_WIDTH / 2, gameRef.current.birdY, BIRD_SIZE / 2, 0, Math.PI * 2)
      ctx.fill()

      // Draw bird eye
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(CANVAS_WIDTH / 2 + 7, gameRef.current.birdY - 5, 4, 0, Math.PI * 2)
      ctx.fill()

      // Draw UI
      ctx.fillStyle = '#000'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(`Score: ${score}`, 20, 40)
      ctx.fillText(`High Score: ${highScore}`, 20, 75)

      // Draw game over message
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60)
      ctx.font = '32px Arial'
      ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20)
      ctx.font = '24px Arial'
      ctx.fillText('Press SPACE or Click to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80)
    }
  }, [gameState, score, highScore])

  return (
    <div className="game-container">
      <h1>🐦 Flappy Bird</h1>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
      />
      <div className="game-instructions">
        <p>Press <strong>SPACE</strong> or <strong>Click</strong> to make the bird flap</p>
        <p>Avoid the pipes and survive as long as you can!</p>
      </div>
    </div>
  )
}
