import gsap from "gsap";
import "./style.scss";

const gameEl = document.getElementById("game") as HTMLDivElement;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;

const scoreEl = document.getElementById("score") as HTMLDivElement;
const scoreValEl = document.getElementById("score-value") as HTMLSpanElement;
const highestScoreEl = document.getElementById(
  "highest-score-value"
) as HTMLSpanElement;

const startGameBtn = document.getElementById(
  "start-game-btn"
) as HTMLButtonElement;
const startGameModalEl = document.getElementById(
  "start-game-modal"
) as HTMLDivElement;

const restartGameBtn = document.getElementById(
  "restart-game-btn"
) as HTMLButtonElement;
const restartGameModalEl = document.getElementById(
  "game-over-modal"
) as HTMLDivElement;
const restartGameModalScoreEl = document.getElementById(
  "restart-game-modal-score"
) as HTMLSpanElement;
const restartGameModalHighestScoreEl = document.getElementById(
  "restart-game-modal-highest-score"
) as HTMLSpanElement;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

type Color = "red" | "blue" | "green" | "white";

interface IVector {
  x: number;
  y: number;
}

interface IShape {
  x: number;
  y: number;
  radius: number;
  color: Color;
  velocity?: IVector;
  draw(): void;
  update(): void;
}

interface IParticle extends IShape {
  alpha: number;
}

class Shape implements IShape {
  constructor(
    public x: number,
    public y: number,
    public radius: number,
    public color: Color,
    public velocity?: IVector
  ) {}

  draw() {
    const { x, y, radius, color } = this;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, false);
    ctx.fillStyle = color;
    ctx.fill();
  }

  update() {
    this.draw();
    if (this.velocity) {
      this.x = this.x + this.velocity.x;
      this.y = this.y + this.velocity.y;
    }
  }
}

class Player extends Shape {}

class Projectile extends Shape {}

class Enemy extends Shape {}

class Particle implements IParticle {
  constructor(
    public x: number,
    public y: number,
    public radius: number,
    public color: Color,
    public velocity?: IVector,
    public alpha: number = 1
  ) {}

  draw() {
    const { x, y, radius, color, alpha } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  update() {
    this.draw();
    this.velocity.x *= friction;
    this.velocity.y *= friction;
    this.x = this.x + this.velocity.x;
    this.y = this.y + this.velocity.y;
    this.alpha -= 0.01;
  }
}

const x = canvas.width / 2;
const y = canvas.height / 2;

const player = new Player(x, y, 15, "white");
let projectiles: Projectile[] = [];
let enemies: Enemy[] = [];
let particles: Particle[] = [];
const friction = 0.99;
const enemyLimit = 10;
const enemySpawnRate = 1000;
let score = 0;
let highestScore = 0;
const removeEnemyScore = 250;
const shotEnemyScore = 100;
let animationId: number;

function areCollided(shape1: Shape, shape2: Shape) {
  // This function calculates the distance between two shapes.
  const distance = Math.hypot(shape1.x - shape2.x, shape1.y - shape2.y);

  // This function checks if two shapes are in collision.
  return distance - shape1.radius - shape2.radius < 1;
}

// Add the amount to the score and update the score display
function addScore(amount: number) {
  score += amount;
  scoreValEl.innerHTML = score.toString();

  // Update the highest score if necessary
  if (score > highestScore) {
    highestScore = score;
    highestScoreEl.innerHTML = highestScore.toString();
  }
}

function removeShapeAtIndex(list: Shape[], index: number) {
  list.splice(index, 1);
}

function isOutOfCanvas(obj: Shape) {
  const { x, y, radius } = obj;
  return (
    x + radius < 0 ||
    x - radius > canvas.width ||
    y + radius < 0 ||
    y - radius > canvas.height
  );
}

function resetVariables() {
  score = 0;
  projectiles = [];
  enemies = [];
  particles = [];
  scoreValEl.innerHTML = score.toString();
  highestScoreEl.innerHTML = highestScore.toString();

  ctx.beginPath();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function showScoreEl() {
  scoreEl.classList.remove("hidden");
  startGameModalEl.classList.add("hidden");
  restartGameModalEl.classList.add("hidden");
}

function initGame() {
  resetVariables();
  spawnEnemies();
  animate();
  showScoreEl();
}

function gameOverHandler() {
  cancelAnimationFrame(animationId);
  console.log("Game Over");
  scoreEl.classList.add("hidden");
  restartGameModalEl.classList.remove("hidden");
  restartGameModalScoreEl.innerHTML = score.toString();

  if (score > highestScore) {
    highestScore = score;
  }

  restartGameModalHighestScoreEl.innerHTML = highestScore.toString();
}

function shapeExplodeWithColor(
  x: number,
  y: number,
  radius: number,
  color: Color
) {
  // create a number of particles based on the radius of the shape
  const numParticles = Math.floor(radius * 2);
  for (let i = 0; i < numParticles; i++) {
    const size: number = Math.random() * 2;
    const velocity: IVector = {
      // give each particle a random velocity
      x: (Math.random() - 0.5) * (Math.random() * 6),
      y: (Math.random() - 0.5) * (Math.random() * 6),
    };
    particles.push(new Particle(x, y, size, color, velocity));
  }
}

function spawnEnemies() {
  if (enemies.length < enemyLimit) {
    const radius = Math.random() * (30 - 4) + 4;
    let x;
    let y;

    if (Math.random() < 0.5) {
      if (Math.random() < 0.5) {
        x = 0 - radius;
      } else {
        x = canvas.width + radius;
      }
      y = Math.random() * canvas.height;
    } else {
      x = Math.random() * canvas.width;
      if (Math.random() < 0.5) {
        y = 0 - radius;
      } else {
        y = canvas.height + radius;
      }
    }

    const color = `hsl(${Math.random() * 360}, 50%, 50%)`;

    const angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x);

    const velocity = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };

    enemies.push(new Enemy(x, y, radius, color, velocity));
  }

  setTimeout(() => {
    spawnEnemies();
  }, enemySpawnRate);
}

function shotProjectile(x, y) {
  const angle = Math.atan2(
    y - player.y,
    x - player.x
  );

  const velocity = {
    x: Math.cos(angle) * 4,
    y: Math.sin(angle) * 4,
  };

  const projectile = new Projectile(
    player.x,
    player.y,
    5,
    player.color,
    velocity
  );
  projectiles.push(projectile);
}

function animate() {
  animationId = requestAnimationFrame(animate);
  ctx.beginPath();
  ctx.fillStyle = "rgba(0, 0, 0, .1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  player.draw();

  // Particles
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    // Remove particles
    if (particle.alpha <= 0) {
      removeShapeAtIndex(particles, i);
    } else {
      particle.update();
    }
  }

  // Projectiles
  for (let i = 0; i < projectiles.length; i++) {
    const projectile = projectiles[i];
    projectile.update();

    // When projectiles exit screen
    if (isOutOfCanvas(projectile)) {
      removeShapeAtIndex(projectiles, i);
    }
  }

  // Enemies
  for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex++) {
    const enemy = enemies[enemyIndex];
    enemy.update();

    // End game
    if (areCollided(player, enemy)) {
      gameOverHandler();
    }

    // When enemies out of screen
    if (isOutOfCanvas(enemy)) {
      removeShapeAtIndex(enemies, enemyIndex);
    }

    for (
      let projectileIndex = 0;
      projectileIndex < projectiles.length;
      projectileIndex++
    ) {
      const projectile = projectiles[projectileIndex];
      // When projectiles touch enemy
      if (areCollided(projectile, enemy)) {
        // Explode particles
        shapeExplodeWithColor(
          projectile.x,
          projectile.y,
          enemy.radius,
          enemy.color
        );

        // Shrink enemy or remove it
        if (enemy.radius - 10 > 5) {
          // Add score
          addScore(shotEnemyScore);

          gsap.to(enemy, {
            radius: enemy.radius - 10,
          });
          removeShapeAtIndex(projectiles, projectileIndex);
        } else {
          addScore(removeEnemyScore);
          removeShapeAtIndex(enemies, enemyIndex);
          removeShapeAtIndex(projectiles, projectileIndex);
        }
      }
    }
  }
}

canvas.addEventListener("click", (event) => {
  shotProjectile(event.clientX, event.clientY);
});

startGameBtn.addEventListener("click", () => {
  initGame();
});
// initGame();

restartGameBtn.addEventListener("click", () => {
  initGame();
});
