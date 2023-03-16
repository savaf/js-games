import gsap from "gsap";
import "./style.css";

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

interface Vector {
  x: number;
  y: number;
}

enum ColorOption {
  Red = "red",
  Blue = "blue",
  Green = "green",
  white = "white",
}

class Shape {
  x: number;
  y: number;
  radius: number;
  color: ColorOption;
  velocity?: Vector;

  constructor(
    x: number,
    y: number,
    radius: number,
    color: ColorOption,
    velocity?: Vector
  ) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;

    if (velocity) {
      this.velocity = velocity;
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
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

class Particle extends Shape {
  alpha: number;

  constructor(
    x: number,
    y: number,
    radius: number,
    color: ColorOption,
    velocity: Vector
  ) {
    super(x, y, radius, color, velocity);
    this.alpha = 1;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
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

function areCollided(obj1: Shape, obj2: Shape) {
  const distance = Math.hypot(obj1.x - obj2.x, obj1.y - obj2.y);
  return distance - obj1.radius - obj2.radius < 1;
}

function addScore(amount: number) {
  score += amount;
  scoreValEl.innerHTML = score.toString();
  if (score > highestScore) {
    highestScore = score;
    highestScoreEl.innerHTML = highestScore.toString();
  }
}

function removeShapeIndexFromList(list: Shape[], index: number) {
  setTimeout(() => {
    list.splice(index, 1);
  }, 0);
}

function isOutOfCanvas(obj: Shape) {
  return (
    obj.x + obj.radius < 0 ||
    obj.x - obj.radius > canvas.width ||
    obj.y + obj.radius < 0 ||
    obj.y - obj.radius > canvas.height
  );
}

function initGame() {
  score = 0;
  projectiles = [];
  enemies = [];
  particles = [];

  score = 0;
  scoreValEl.innerHTML = score.toString();
  highestScoreEl.innerHTML = highestScore.toString();

  spawnEnemies();
  animate();
  startGameModalEl.classList.add("hide");
  scoreEl.classList.remove("hide");
  restartGameModalEl.classList.add("hide");
}

function gameOverHandler() {
  cancelAnimationFrame(animationId);
  console.log("Game Over");
  restartGameModalEl.classList.remove("hide");
  restartGameModalScoreEl.innerHTML = score.toString();

  if (score > highestScore) {
    highestScore = score;
  }

  restartGameModalHighestScoreEl.innerHTML = highestScore.toString();
}

function shapeExplodeWithColor(shape: Shape, color ?: ColorOption) {
  for (let i = 0; i < shape.radius * 2; i++) {
    particles.push(
      new Particle(
        shape.x,
        shape.y,
        Math.random() * 2,
        color || shape.color,
        {
          x: (Math.random() - 0.5) * (Math.random() * 6),
          y: (Math.random() - 0.5) * (Math.random() * 6),
        }
      )
    );
  }
}

function spawnEnemies() {
  setInterval(() => {
    // enemies limit
    if (enemies.length > enemyLimit) {
      return;
    }

    const radius = Math.random() * (30 - 4) + 4;
    let x;
    let y;

    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
      y = Math.random() * canvas.height;
    } else {
      x = Math.random() * canvas.width;
      y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
    }

    const color = `hsl(${Math.random() * 360}, 50%, 50%)`;

    const angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x);

    const velocity = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };

    enemies.push(new Enemy(x, y, radius, color, velocity));
  }, enemySpawnRate);
}

function animate() {
  animationId = requestAnimationFrame(animate);
  ctx.beginPath();
  ctx.fillStyle = "rgba(0, 0, 0, .3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  player.draw();

  // Particles
  particles.forEach((particle, particleIndex) => {
    // Remove particles
    if (particle.alpha <= 0) {
      return removeShapeIndexFromList(particles, particleIndex);
    }
    particle.update();
  });

  // Projectiles
  projectiles.forEach((projectile, projectileIndex) => {
    projectile.update();

    // When projectiles exit screen
    if (isOutOfCanvas(projectile)) {
      removeShapeIndexFromList(projectiles, projectileIndex);
    }
  });

  // Enemies
  enemies.forEach((enemy, enemyIndex) => {
    enemy.update();

    // End game
    if (areCollided(player, enemy)) {
      gameOverHandler();
    }

    // When enemies out of screen
    if (isOutOfCanvas(enemy)) {
      removeShapeIndexFromList(enemies, enemyIndex);
    }

    projectiles.forEach((projectile, projectileIndex) => {
      // When projectiles touch enemy
      if (areCollided(projectile, enemy)) {
        // Explode particles
        // enemyExplode(enemy);
        shapeExplodeWithColor(projectile, enemy.color);


        // Shrink enemy or remove it
        if (enemy.radius - 10 > 5) {
          // Add score
          addScore(shotEnemyScore);

          // enemy.radius = enemy.radius - 10
          gsap.to(enemy, {
            radius: enemy.radius - 10,
          });
          removeShapeIndexFromList(projectiles, projectileIndex);
        } else {
          addScore(removeEnemyScore);
          removeShapeIndexFromList(enemies, enemyIndex);
          removeShapeIndexFromList(projectiles, projectileIndex);
        }
      }
    });
  });
}

canvas.addEventListener("click", (event) => {
  console.log("Projectile", projectiles.length, projectiles);
  console.log("Enemies", enemies.length, enemies);
  console.log("Particles", particles.length, particles);
  console.log("Score", score);
  console.log("Highest Score", highestScore);
  const angle = Math.atan2(
    event.clientY - canvas.height / 2,
    event.clientX - canvas.width / 2
  );

  const velocity = {
    x: Math.cos(angle) * 4,
    y: Math.sin(angle) * 4,
  };

  const projectile = new Projectile(
    canvas.width / 2,
    canvas.height / 2,
    5,
    "white",
    velocity
  );
  projectiles.push(projectile);
});

startGameBtn.addEventListener("click", () => {
  initGame();
});

restartGameBtn.addEventListener("click", () => {
  initGame();
});
