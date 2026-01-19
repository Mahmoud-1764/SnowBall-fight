let board;
const RowCount = 21;
const ColumnCount = 19;
const tileSize = 32;
const boardWidth = ColumnCount * tileSize;
const boardHeight = RowCount * tileSize;
const targetFrameMs = 1000 / 60;
const baseSpeed = tileSize / 10;
const playerHitboxInset = 4;
const throwCooldownMs = 350;
const snowballRadius = 8;
const snowballSpeed = baseSpeed * 2;
const snowballLifetimeMs = 1200;
let context;
let lastFrameTime = 0;
let currentTimeMs = 0;

// Track which keys are currently pressed
const keysPressed = {};

const playerControls = [
  {
    up: ["w"],
    down: ["s"],
    left: ["a"],
    right: ["d"],
    throw: ["f"],
  },
  {
    up: ["ArrowUp", "i"],
    down: ["ArrowDown", "k"],
    left: ["ArrowLeft", "j"],
    right: ["ArrowRight", "l"],
    throw: ["Enter"],
  },
];

const directionVectors = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  "up-left": { x: -1, y: -1 },
  "up-right": { x: 1, y: -1 },
  "down-left": { x: -1, y: 1 },
  "down-right": { x: 1, y: 1 },
  none: { x: 0, y: 0 },
};

//images

let SnowWallUp;
let SnowWallDown;
let SnowWallLeft;
let SnowWallRight;
let SnowWallCornerLU;
let SnowWallCornerRU;
let SnowWallCornerLD;
let SnowWallCornerRD;
let SnowWallBlock;
let SnowWallHorizontalR;
let SnowWallHorizontalL;
let SnowWallHorizontalM;
let SnowWallVerticalU;
let SnowWallVerticalM;
let SnowWallVerticalD;
let SnowFloor;
let boxImg;
let BushesImg;
let SnowBallImg;
let Player1Img;
let Player1ImgUp;
let Player1ImgDown;
let Player1ImgLeft;
let Player1ImgRight;
let Player2Img;
let Player2ImgUp;
let Player2ImgDown;
let Player2ImgLeft;
let Player2ImgRight;
let controllerindex = 0;
let throwkey = false;
let uppreesed;
let downpreesed;
let leftpreesed;
let rightpreesed;

function normalizeKey(key) {
  return key.length === 1 ? key.toLowerCase() : key;
}

function isAnyPressed(keys) {
  return keys.some((key) => keysPressed[key]);
}

function getDirectionFromInput(controls) {
  const upPressed = isAnyPressed(controls.up);
  const downPressed = isAnyPressed(controls.down);
  const leftPressed = isAnyPressed(controls.left);
  const rightPressed = isAnyPressed(controls.right);

  const vertical = (downPressed ? 1 : 0) - (upPressed ? 1 : 0);
  const horizontal = (rightPressed ? 1 : 0) - (leftPressed ? 1 : 0);

  if (vertical === 0 && horizontal === 0) return "none";
  if (vertical < 0 && horizontal < 0) return "up-left";
  if (vertical < 0 && horizontal > 0) return "up-right";
  if (vertical > 0 && horizontal < 0) return "down-left";
  if (vertical > 0 && horizontal > 0) return "down-right";
  if (vertical < 0) return "up";
  if (vertical > 0) return "down";
  if (horizontal < 0) return "left";
  return "right";
}

function getDirectionUnitVector(direction) {
  const vector = directionVectors[direction] || directionVectors.none;
  if (vector.x === 0 && vector.y === 0) {
    return { x: 0, y: 0 };
  }
  const diagonal = vector.x !== 0 && vector.y !== 0;
  const scale = diagonal ? Math.SQRT1_2 : 1;
  return { x: vector.x * scale, y: vector.y * scale };
}

function getDirectionVelocity(direction, speed) {
  const unit = getDirectionUnitVector(direction);
  return { x: unit.x * speed, y: unit.y * speed };
}

window.onload = function () {
  board = document.getElementById("board");
  board.width = boardWidth;
  board.height = boardHeight;
  context = board.getContext("2d");

  loadImages();
  LoadMap();
  requestAnimationFrame(update);

  document.addEventListener("keydown", (e) => {
    const key = normalizeKey(e.key);
    if (key.startsWith("Arrow")) {
      e.preventDefault();
    }
    keysPressed[key] = true;
    if (!e.repeat) {
      handleThrowInput(key);
    }
    updatePlayerMovement();
  });
  document.addEventListener("keyup", (e) => {
    const key = normalizeKey(e.key);
    if (key.startsWith("Arrow")) {
      e.preventDefault();
    }
    keysPressed[key] = false;
    updatePlayerMovement();
  });

  window.addEventListener("gamepadconnected", (e) => {
    console.log(
      "Gamepad connected at index %d: %s. %d buttons, %d axes.",
      e.gamepad.index,
      e.gamepad.id,
      e.gamepad.buttons.length,
      e.gamepad.axes.length
    );
    controllerindex = e.gamepad.index;
  });

  window.addEventListener("gamepaddisconnected", (e) => {
    console.log(
      "Gamepad disconnected from index %d: %s",
      e.gamepad.index,
      e.gamepad.id
    );
    controllerindex = null;
  });
};

//U = SnowWallUp, D = SnowWallDown, L = SnowWallLeft, R = SnowWallRight, B = SnowWallBlock
//C = SnowWallCornerLU, E = SnowWallCornerRU, F = SnowWallCornerLD, G = SnowWallCornerRD, X = boximg, b = bushes
// ' ' = SnowFloor, M = SnowWallHorizontalM, r = SnowWallHorizontalR, l = SnowWallHorizontalL , V = SnowWallVerticalU, v = SnowWallVerticalD, m = SnowWallVerticalM

const tileMap = [
  "CUUUUUUUUUUUUUUUUUE",
  "L        m        R",
  "L lr lMr v lMr lr R",
  "L        2        R",
  "L lr V lMMMr V lr R",
  "L    m       m    R",
  "MMMr mMMr lMMm lMMM",
  "   b m       m b   ",
  "MMMr v lMMMr v lMMM",
  "                   ",
  "MMMr V lMMMr V lMMM",
  "   b m       m b   ",
  "MMMr v lMMMr v lMMM",
  "L                 R",
  "L XV lMr   lMr VX R",
  "L  m     1     m  R",
  "L  v V lMMMr V v  R",
  "L    m   m   m    R",
  "L lMMMMr v lMMMMr R",
  "L                 R",
  "FDDDDDDDDDDDDDDDDDG",
];

const SnowWalls = new Set();
const walls = []; // Only collidable walls, not floors
const boxes = [];
const players = [];
const snowballs = [];

function loadImages() {
  SnowWallUp = new Image();
  SnowWallUp.src = "assets/Pngs/Tiles/Tile_05.png";
  SnowWallDown = new Image();
  SnowWallDown.src = "assets/Pngs/Tiles/Tile_25.png";
  SnowWallLeft = new Image();
  SnowWallLeft.src = "assets/Pngs/Tiles/Tile_13.png";
  SnowWallRight = new Image();
  SnowWallRight.src = "assets/Pngs/Tiles/Tile_16.png";
  SnowWallCornerLU = new Image();
  SnowWallCornerLU.src = "assets/Pngs/Tiles/Tile_04.png";
  SnowWallCornerRU = new Image();
  SnowWallCornerRU.src = "assets/Pngs/Tiles/Tile_06.png";
  SnowWallCornerLD = new Image();
  SnowWallCornerLD.src = "assets/Pngs/Tiles/Tile_24.png";
  SnowWallCornerRD = new Image();
  SnowWallCornerRD.src = "assets/Pngs/Tiles/Tile_26.png";
  SnowFloor = new Image();
  SnowFloor.src = "assets/Pngs/Tiles/Tile_12.png";
  SnowWallBlock = new Image();
  SnowWallBlock.src = "assets/Pngs/Tiles/Tile_31.png";
  SnowWallHorizontalR = new Image();
  SnowWallHorizontalR.src = "assets/Pngs/Tiles/Tile_34.png";
  SnowWallHorizontalL = new Image();
  SnowWallHorizontalL.src = "assets/Pngs/Tiles/Tile_32.png";
  SnowWallHorizontalM = new Image();
  SnowWallHorizontalM.src = "assets/Pngs/Tiles/Tile_33.png";
  SnowWallVerticalU = new Image();
  SnowWallVerticalU.src = "assets/Pngs/Tiles/Tile_54.png";
  SnowWallVerticalM = new Image();
  SnowWallVerticalM.src = "assets/Pngs/Tiles/Tile_55.png";
  SnowWallVerticalD = new Image();
  SnowWallVerticalD.src = "assets/Pngs/Tiles/Tile_56.png";
  boxImg = new Image();
  boxImg.src = "assets/Pngs/Objects/Boxes/3.png";
  BushesImg = new Image();
  BushesImg.src = "assets/Pngs/Objects/Bushes/1.png";
  Player1Img = new Image();
  Player1Img.src = "assets/Pngs/Char/Character_1.png";
  Player1ImgUp = new Image();
  Player1ImgUp.src = "assets/Pngs/Char/Character_1_up.png";
  Player1ImgLeft = new Image();
  Player1ImgLeft.src = "assets/Pngs/Char/Character_1_left.png";
  Player1ImgRight = new Image();
  Player1ImgRight.src = "assets/Pngs/Char/Character_1_right.png";
  Player1ImgDown = new Image();
  Player1ImgDown.src = "assets/Pngs/Char/Character_1.png";
  Player2Img = new Image();
  Player2Img.src = "assets/Pngs/Char/Character_2.png";
  Player2ImgUp = new Image();
  Player2ImgUp.src = "assets/Pngs/Char/Character_2_up.png";
  Player2ImgDown = new Image();
  Player2ImgDown.src = "assets/Pngs/Char/Character_2.png";
  Player2ImgLeft = new Image();
  Player2ImgLeft.src = "assets/Pngs/Char/Character_2_left.png";
  Player2ImgRight = new Image();
  Player2ImgRight.src = "assets/Pngs/Char/Character_2_right.png";
  SnowBallImg = new Image();
  SnowBallImg.src = "assets/Pngs/Objects/Other/SnowBall.png";
}

function addWallTile(image, x, y) {
  const block = new Block(image, x, y, tileSize, tileSize);
  SnowWalls.add(block);
  walls.push(block);
}

function LoadMap() {
  SnowWalls.clear();
  walls.length = 0;
  boxes.length = 0;
  players.length = 0;
  for (let i = 0; i < RowCount; i++) {
    for (let j = 0; j < ColumnCount; j++) {
      const row = tileMap[i];
      const tileMapChar = row[j];
      const x = j * tileSize;
      const y = i * tileSize;

      if (tileMapChar === "U") {
        addWallTile(SnowWallUp, x, y);
      } else if (tileMapChar === "D") {
        addWallTile(SnowWallDown, x, y);
      } else if (tileMapChar === "L") {
        addWallTile(SnowWallLeft, x, y);
      } else if (tileMapChar === "R") {
        addWallTile(SnowWallRight, x, y);
      } else if (tileMapChar === "C") {
        addWallTile(SnowWallCornerLU, x, y);
      } else if (tileMapChar === "E") {
        addWallTile(SnowWallCornerRU, x, y);
      } else if (tileMapChar === "F") {
        addWallTile(SnowWallCornerLD, x, y);
      } else if (tileMapChar === "G") {
        addWallTile(SnowWallCornerRD, x, y);
      } else if (tileMapChar === " ") {
        SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
      } else if (tileMapChar === "B") {
        SnowWalls.add(new Block(SnowWallBlock, x, y, tileSize, tileSize));
      } else if (tileMapChar === "r") {
        addWallTile(SnowWallHorizontalR, x, y);
      } else if (tileMapChar === "l") {
        addWallTile(SnowWallHorizontalL, x, y);
      } else if (tileMapChar === "M") {
        addWallTile(SnowWallHorizontalM, x, y);
      } else if (tileMapChar === "V") {
        addWallTile(SnowWallVerticalU, x, y);
      } else if (tileMapChar === "m") {
        addWallTile(SnowWallVerticalM, x, y);
      } else if (tileMapChar === "v") {
        addWallTile(SnowWallVerticalD, x, y, tileSize, tileSize);
      } else if (tileMapChar === "X") {
        SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
        boxes.push(new Block(boxImg, x, y, tileSize, tileSize));
        walls.push(boxes[boxes.length - 1]);
      } else if (tileMapChar === "b") {
        SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
        SnowWalls.add(new Block(BushesImg, x, y, tileSize, tileSize));
        walls.push(new Block(BushesImg, x, y, tileSize, tileSize));
      } else if (tileMapChar === "1") {
        SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
        players.push(
          new Player(
            Player1Img,
            Player1ImgUp,
            Player1ImgDown,
            Player1ImgLeft,
            Player1ImgRight,
            x,
            y,
            tileSize,
            tileSize
          )
        );
      } else if (tileMapChar === "2") {
        SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
        players.push(
          new Player(
            Player2Img,
            Player2ImgUp,
            Player2ImgDown,
            Player2ImgLeft,
            Player2ImgRight,
            x,
            y,
            tileSize,
            tileSize
          )
        );
      }
    }
  }
}

function throwSnowball(player, nowMs) {
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;
  const direction = player.facingDirection;
  const unit = getDirectionUnitVector(direction);
  if (unit.x === 0 && unit.y === 0) {
    return;
  }
  const speedX = unit.x * snowballSpeed;
  const speedY = unit.y * snowballSpeed;
  const spawnOffset =
    Math.max(player.width, player.height) / 2 + snowballRadius + 2;

  const snowball = new SnowBall(
    SnowBallImg,
    centerX + unit.x * spawnOffset,
    centerY + unit.y * spawnOffset,
    snowballRadius,
    speedX,
    speedY,
    nowMs
  );
  snowballs.push(snowball);
}

function controllerInput() {
  if (controllerindex !== null) {
    const gamepads = navigator.getGamepads()[controllerindex];
    const buttons = gamepads.buttons;
    const axes = gamepads.axes;

    const deadzone = 0.2;

    for (let i = 0; i < axes.length; i++) {
      if (Math.abs(axes[i]) < deadzone) {
        axes[i] = 0;
      }
    }

    uppreesed = buttons[12].pressed || axes[1] < -0.5;
    downpreesed = buttons[13].pressed || axes[1] > 0.5;
    leftpreesed = buttons[14].pressed || axes[0] < -0.5;
    rightpreesed = buttons[15].pressed || axes[0] > 0.5;

    throwkey = buttons[0].pressed;
    console.log(gamepads);
  }
}

function updateControllerMovement() {
  if (controllerindex === null) return;

  const player = players[0]; // Assuming single player for controller
  let direction = "none";

  if (uppreesed && leftpreesed) {
    direction = "up-left";
  } else if (uppreesed && rightpreesed) {
    direction = "up-right";
  } else if (downpreesed && leftpreesed) {
    direction = "down-left";
  } else if (downpreesed && rightpreesed) {
    direction = "down-right";
  } else if (uppreesed) {
    direction = "up";
  } else if (downpreesed) {
    direction = "down";
  } else if (leftpreesed) {
    direction = "left";
  } else if (rightpreesed) {
    direction = "right";
  }

  player.updateDirection(direction);

  if (throwkey) {
    const nowMs = currentTimeMs || performance.now();
    tryThrow(player, nowMs);
  }
}

function update(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }
  const delta = timestamp - lastFrameTime;
  const deltaFactor = delta ? delta / targetFrameMs : 1;
  lastFrameTime = timestamp;
  currentTimeMs = timestamp;

  for (let player of players) {
    player.move(deltaFactor);
  }

  updateSnowballs(deltaFactor, timestamp);
  draw();
  requestAnimationFrame(update);
  controllerInput();
  updateControllerMovement();
}

function updateSnowballs(deltaFactor, nowMs) {
  for (let snowball of snowballs) {
    if (snowball.active) {
      snowball.move(deltaFactor, nowMs);
    }
  }

  for (let i = snowballs.length - 1; i >= 0; i--) {
    if (!snowballs[i].active) {
      snowballs.splice(i, 1);
    }
  }
}

function draw() {
  context.clearRect(0, 0, boardWidth, boardHeight);

  for (let wall of SnowWalls) {
    context.drawImage(wall.Image, wall.x, wall.y, wall.width, wall.height);
  }
  for (let box of boxes) {
    context.drawImage(box.Image, box.x, box.y, box.width, box.height);
  }
  for (let player of players) {
    context.drawImage(
      player.Image,
      player.x,
      player.y,
      player.width,
      player.height
    );
  }
  for (let snowball of snowballs) {
    if (snowball.active) {
      context.drawImage(
        snowball.Image,
        snowball.x - snowball.radius,
        snowball.y - snowball.radius,
        snowball.radius * 2,
        snowball.radius * 2
      );
    }
  }
}

function updatePlayerMovement() {
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const controls = playerControls[i];
    if (!controls || !player) {
      continue;
    }
    player.updateDirection(getDirectionFromInput(controls));
  }
}

function handleThrowInput(key) {
  const nowMs = currentTimeMs || performance.now();
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const controls = playerControls[i];
    if (!controls || !player) {
      continue;
    }
    if (controls.throw.includes(key)) {
      tryThrow(player, nowMs);
    }
  }
}

function tryThrow(player, nowMs) {
  if (!player.canThrow(nowMs)) {
    return;
  }
  throwSnowball(player, nowMs);
  player.recordThrow(nowMs);
}

function collision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

class Block {
  constructor(Image, x, y, width, height) {
    this.Image = Image;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.Startx = x;
    this.Starty = y;
  }
}

class Player {
  constructor(
    Image,
    Imageup,
    Imagedown,
    Imageleft,
    ImageRight,
    x,
    y,
    width,
    height
  ) {
    this.Image = Image;
    this.Imageup = Imageup;
    this.Imagedown = Imagedown;
    this.Imageleft = Imageleft;
    this.ImageRight = ImageRight;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.Startx = x;
    this.Starty = y;

    this.direction = "down";
    this.facingDirection = "down";
    this.velocityX = 0;
    this.velocityY = 0;
    this.lastThrowTime = -Infinity;
  }

  updateDirection(direction) {
    if (direction !== "none") {
      this.direction = direction;
      this.facingDirection = direction;
      this.updateImage();
    } else {
      this.direction = "none";
    }
    this.updateVelocity();
  }

  updateImage() {
    switch (this.facingDirection) {
      case "up":
        this.Image = this.Imageup;
        break;
      case "down":
        this.Image = this.Imagedown;
        break;
      case "left":
        this.Image = this.Imageleft;
        break;
      case "right":
        this.Image = this.ImageRight;
        break;
      default:
        break;
    }
  }

  updateVelocity() {
    const velocity = getDirectionVelocity(this.direction, baseSpeed);
    this.velocityX = velocity.x;
    this.velocityY = velocity.y;
  }

  canThrow(nowMs) {
    return nowMs - this.lastThrowTime >= throwCooldownMs;
  }

  recordThrow(nowMs) {
    this.lastThrowTime = nowMs;
  }

  getHitbox() {
    return {
      x: this.x + playerHitboxInset,
      y: this.y + playerHitboxInset,
      width: this.width - playerHitboxInset * 2,
      height: this.height - playerHitboxInset * 2,
    };
  }

  move(deltaFactor = 1) {
    const moveAxis = (axis, amount) => {
      if (!amount) {
        return;
      }

      const direction = Math.sign(amount);
      let remaining = Math.abs(amount);

      while (remaining > 0) {
        const step = Math.min(1, remaining);
        this[axis] += direction * step;
        let collided = false;

        for (let wall of walls) {
          if (collision(this.getHitbox(), wall)) {
            this[axis] -= direction * step;
            collided = true;
            break;
          }
        }

        if (collided) {
          break;
        }
        remaining -= step;
      }
    };

    moveAxis("x", this.velocityX * deltaFactor);
    moveAxis("y", this.velocityY * deltaFactor);
  }
}

class SnowBall {
  constructor(Image, x, y, radius, speedX, speedY, spawnTimeMs) {
    this.Image = Image;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speedX = speedX;
    this.speedY = speedY;
    this.spawnTimeMs = spawnTimeMs;
    this.lifetimeMs = snowballLifetimeMs;
    this.active = true;
  }

  move(deltaFactor = 1, nowMs = 0) {
    if (!this.active) return;

    if (nowMs - this.spawnTimeMs >= this.lifetimeMs) {
      this.active = false;
      return;
    }

    this.x += this.speedX * deltaFactor;
    this.y += this.speedY * deltaFactor;

    if (
      this.x < -this.radius ||
      this.x > boardWidth + this.radius ||
      this.y < -this.radius ||
      this.y > boardHeight + this.radius
    ) {
      this.active = false;
      return;
    }

    // Check for collisions with walls
    for (let wall of walls) {
      if (this.collidesWith(wall)) {
        this.active = false; // Deactivate the snowball on collision
        break;
      }
    }
  }

  collidesWith(block) {
    const distX = Math.abs(this.x - block.x - block.width / 2);
    const distY = Math.abs(this.y - block.y - block.height / 2);

    if (distX > block.width / 2 + this.radius) {
      return false;
    }
    if (distY > block.height / 2 + this.radius) {
      return false;
    }

    if (distX <= block.width / 2) {
      return true;
    }
    if (distY <= block.height / 2) {
      return true;
    }

    const dx = distX - block.width / 2;
    const dy = distY - block.height / 2;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }
}
