const game = document.getElementById("game");
const trail = document.getElementById("trail");
const ball = document.getElementById("ball");
const ground = document.getElementById("ground");

let gameHeight = game.clientHeight;
let gameWidth = game.clientWidth;
let groundHeight = ground.offsetHeight;
let ballHeight = ball.offsetHeight;
let ballWidth = ball.offsetWidth;
let groundTop = gameHeight - groundHeight;
let maxX = 0;

let y = 0;
let vy = 0;
let x = 0;
let vx = 0;

const g = 2500;
const moveSpeed = 300;
const moveAccelOn = 1600;
const moveDecelOff = 2000;
let firstBounceSpeed = 0;
const keys = { left: false, right: false };
const tctx = trail.getContext("2d");
const trailPoints = [];
const trailMax = 24;
let platformEls = [];
let hazardEls = [];
let goalEl = null;
let platforms = [];
let hazards = [];
let goalRect = null;
let dead = false;
let won = false;
let wallEls = [];
let walls = [];
let msgDead = null;
let msgWin = null;

let last = performance.now();

function layout() {
  gameHeight = game.clientHeight;
  gameWidth = game.clientWidth;
  groundHeight = ground.offsetHeight;
  ballHeight = ball.offsetHeight;
  ballWidth = ball.offsetWidth;
  groundTop = gameHeight - groundHeight;
  maxX = Math.max(0, (gameWidth - ballWidth) / 2);
  const available = Math.max(0, groundTop - ballHeight);
  const target = Math.min(gameHeight / 3, available);
  firstBounceSpeed = Math.sqrt(2 * g * target);
  trail.width = gameWidth;
  trail.height = gameHeight;
  tctx.clearRect(0, 0, trail.width, trail.height);
  trailPoints.length = 0;
  platformEls = Array.from(document.querySelectorAll('.platform'));
  hazardEls = Array.from(document.querySelectorAll('.hazard'));
  wallEls = Array.from(document.querySelectorAll('.wall'));
  goalEl = document.querySelector('.goal');
  msgDead = document.getElementById('msg-dead');
  msgWin = document.getElementById('msg-win');
  platforms = platformEls.map(el => ({
    x: el.offsetLeft,
    y: el.offsetTop,
    w: el.offsetWidth,
    h: el.offsetHeight
  }));
  hazards = hazardEls.map(el => ({
    x: el.offsetLeft,
    y: el.offsetTop,
    w: el.offsetWidth,
    h: el.offsetHeight
  }));
  walls = wallEls.map(el => ({
    x: el.offsetLeft,
    y: el.offsetTop,
    w: el.offsetWidth,
    h: el.offsetHeight
  }));
  goalRect = goalEl ? {
    x: goalEl.offsetLeft,
    y: goalEl.offsetTop,
    w: goalEl.offsetWidth,
    h: goalEl.offsetHeight
  } : null;
}

function step(now) {
  const dt = (now - last) / 1000;
  last = now;

  if (dead || won) {
    ball.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    return requestAnimationFrame(step);
  }

  vy += g * dt;
  y += vy * dt;
  const prevY = y - vy * dt;

  if (y + ballHeight >= groundTop) {
    y = groundTop - ballHeight;
    vy = -firstBounceSpeed;
  }

  const left = gameWidth / 2 - ballWidth / 2 + x;
  const right = left + ballWidth;
  const top = y;
  const bottom = y + ballHeight;

  for (const p of platforms) {
    const crossed = prevY + ballHeight <= p.y && bottom >= p.y;
    const overlapX = right > p.x && left < p.x + p.w;
    if (crossed && overlapX) {
      y = p.y - ballHeight;
      vy = -firstBounceSpeed;
    }
  }

  for (const h of hazards) {
    const hit = right > h.x && left < h.x + h.w && bottom > h.y && top < h.y + h.h;
    if (hit) {
      dead = true;
      if (msgDead) msgDead.style.display = 'block';
    }
  }

  for (const w of walls) {
    const hit = right > w.x && left < w.x + w.w && bottom > w.y && top < w.y + w.h;
    if (hit) {
      if (vx > 0) {
        // collide from left side of wall
        const targetRight = w.x;
        const newLeft = targetRight - ballWidth;
        x = newLeft - (gameWidth / 2 - ballWidth / 2);
      } else if (vx < 0) {
        // collide from right side of wall
        const targetLeft = w.x + w.w;
        x = targetLeft - (gameWidth / 2 - ballWidth / 2);
      }
      vx = 0;
    }
  }

  if (goalRect) {
    const hitGoal = right > goalRect.x && left < goalRect.x + goalRect.w && bottom > goalRect.y && top < goalRect.y + goalRect.h;
    if (hitGoal) {
      won = true;
      vx = 0;
      vy = 0;
      if (msgWin) msgWin.style.display = 'block';
    }
  }

  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const target = dir * moveSpeed;
  const accel = dir === 0 ? moveDecelOff : moveAccelOn;
  if (vx < target) {
    vx = Math.min(vx + accel * dt, target);
  } else if (vx > target) {
    vx = Math.max(vx - accel * dt, target);
  }
  x += vx * dt;
  if (x > maxX) x = maxX;
  if (x < -maxX) x = -maxX;

  const cx = gameWidth / 2 + x;
  const cy = y + ballHeight / 2;
  trailPoints.push({ cx, cy });
  if (trailPoints.length > trailMax) trailPoints.shift();
  tctx.globalCompositeOperation = "source-over";
  tctx.clearRect(0, 0, trail.width, trail.height);
  for (let i = 0; i < trailPoints.length; i++) {
    const p = trailPoints[i];
    const a = 0.1 + 0.35 * (i / (trailPoints.length - 1 || 1));
    tctx.beginPath();
    tctx.arc(p.cx, p.cy, ballWidth / 2, 0, Math.PI * 2);
    tctx.fillStyle = `rgba(250, 204, 21, ${a})`;
    tctx.fill();
  }

  ball.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  requestAnimationFrame(step);
}

window.addEventListener("resize", () => {
  const prevGroundTop = groundTop;
  layout();
  y = Math.min(y, groundTop - ballHeight);
  if (x > maxX) x = maxX;
  if (x < -maxX) x = -maxX;
  if (groundTop !== prevGroundTop) {
    ball.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") keys.left = true;
  if (e.key === "ArrowRight") keys.right = true;
  if (dead && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    dead = false;
    won = false;
    if (msgDead) msgDead.style.display = 'none';
    if (msgWin) msgWin.style.display = 'none';
    x = 0;
    y = 0;
    vy = 0;
    vx = 0;
    trailPoints.length = 0;
  }
  if (e.key === 'r' || e.key === 'R' || e.code === 'Space') {
    if (dead || won) {
      dead = false;
      won = false;
      if (msgDead) msgDead.style.display = 'none';
      if (msgWin) msgWin.style.display = 'none';
      x = 0;
      y = 0;
      vy = 0;
      vx = 0;
      trailPoints.length = 0;
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
});

layout();
requestAnimationFrame(step);
