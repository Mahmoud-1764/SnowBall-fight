let board;
const RowCount = 21;
const ColumnCount = 19;
const tileSize = 32;
const boardWidth = ColumnCount * tileSize;
const boardHeight = RowCount * tileSize;
const targetFrameMs = 1000 / 60;
const maxDeltaMs = targetFrameMs * 3;
const baseSpeed = tileSize / 10;
const playerHitboxInset = 4;
const throwCooldownMs = 350;
const maxPlayerHp = 100;
const snowballDamage = Math.round(maxPlayerHp * 0.25);
const roundResetDelayMs = 2000;
const baseHazardIntervalMs = 1600;
const minHazardIntervalMs = 350;
const hazardIntervalDecay = 0.82;
const baseHazardSpeed = baseSpeed * 2.6;
const hazardSpeedPerRound = baseSpeed * 0.7;
const hazardExtraEveryRounds = 3;
const maxHazardsPerSpawn = 3;
const hazardLifetimeMs = 4000;
const snowballRadius = 8;
const snowballSpeed = baseSpeed * 2;
const snowballLifetimeMs = 1200;
const countdownDurationMs = 3000;
const fightFlashMs = 650;
const hudFont = 'bold 18px "Lucida Console", monospace';
const hudSmallFont = 'bold 14px "Lucida Console", monospace';
let context;
let lastFrameTime = 0;
let currentTimeMs = 0;
let roundNumber = 1;
let roundEnding = false;
let roundResetAtMs = 0;
let nextHazardAtMs = 0;
let roundWinnerId = null;
let playerScores = [0, 0];
let mapInput;
let mapStatus;
let mapMetrics;
let imagesReady = false;
let gameState = "title";
let countdownStartMs = 0;
let fightFlashUntilMs = 0;
let pausedByVisibility = false;
let staticLayer = null;
let staticLayerContext = null;
let shakeRemainingMs = 0;
let shakeDurationMs = 0;
let shakeIntensity = 0;

// Track which keys are currently pressed
const keysPressed = {};
const loadedImages = [];

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
const maxControllers = 2;
const controllerSlots = new Array(maxControllers).fill(null);
const controllerInputState = Array.from({ length: maxControllers }, () => ({
  up: false,
  down: false,
  left: false,
  right: false,
  throw: false,
}));
const snowballPool = [];
const particles = [];
const particlePool = [];
const maxParticles = 120;
let collisionGrid = [];

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

function registerImage(src) {
  const image = new Image();
  image.src = src;
  loadedImages.push(image);
  return image;
}

function waitForImages(callback) {
  let remaining = loadedImages.length;
  if (remaining === 0) {
    callback();
    return;
  }
  const onDone = () => {
    remaining -= 1;
    if (remaining <= 0) {
      callback();
    }
  };
  loadedImages.forEach((image) => {
    if (image.complete) {
      onDone();
    } else {
      image.addEventListener("load", onDone, { once: true });
      image.addEventListener("error", onDone, { once: true });
    }
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

window.onload = function () {
  board = document.getElementById("board");
  board.width = boardWidth;
  board.height = boardHeight;
  context = board.getContext("2d");
  context.imageSmoothingEnabled = false;

  loadImages();
  waitForImages(() => {
    imagesReady = true;
    LoadMap();
    resetRoundState(performance.now());
    requestAnimationFrame(update);
  });

  mapInput = document.getElementById("mapInput");
  mapStatus = document.getElementById("mapStatus");
  mapMetrics = document.getElementById("mapMetrics");
  const applyMapButton = document.getElementById("applyMap");
  const resetMapButton = document.getElementById("resetMap");
  if (mapInput) {
    mapInput.value = defaultTileMap.join("\n");
    mapInput.addEventListener("input", () => {
      updateMapMetrics(mapInput.value);
    });
  }
  if (applyMapButton) {
    applyMapButton.addEventListener("click", () => {
      const nowMs = currentTimeMs || performance.now();
      applyCustomMap(mapInput ? mapInput.value : "", nowMs);
    });
  }
  if (resetMapButton) {
    resetMapButton.addEventListener("click", () => {
      const nowMs = currentTimeMs || performance.now();
      resetToDefaultMap(nowMs);
    });
  }
  if (mapInput) {
    updateMapMetrics(mapInput.value);
  }

  document.addEventListener("keydown", (e) => {
    const key = normalizeKey(e.key);
    if (key.startsWith("Arrow")) {
      e.preventDefault();
    }
    keysPressed[key] = true;
    if (key === "p") {
      togglePause();
      return;
    }
    if (gameState === "title") {
      startGame(performance.now());
    }
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

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (gameState === "playing") {
        pausedByVisibility = true;
        pauseGame();
      }
    } else if (pausedByVisibility) {
      pausedByVisibility = false;
      resumeGame();
    }
  });

  window.addEventListener("gamepadconnected", (e) => {
    console.log(
      "Gamepad connected at index %d: %s. %d buttons, %d axes.",
      e.gamepad.index,
      e.gamepad.id,
      e.gamepad.buttons.length,
      e.gamepad.axes.length
    );
    if (!controllerSlots.includes(e.gamepad.index)) {
      const slot = controllerSlots.indexOf(null);
      if (slot !== -1) {
        controllerSlots[slot] = e.gamepad.index;
        console.log("Assigned controller %d to player %d.", e.gamepad.index, slot + 1);
      }
    }
  });

  window.addEventListener("gamepaddisconnected", (e) => {
    console.log(
      "Gamepad disconnected from index %d: %s",
      e.gamepad.index,
      e.gamepad.id
    );
    const slot = controllerSlots.indexOf(e.gamepad.index);
    if (slot !== -1) {
      controllerSlots[slot] = null;
      controllerInputState[slot] = {
        up: false,
        down: false,
        left: false,
        right: false,
        throw: false,
      };
    }
  });
};

//U = SnowWallUp, D = SnowWallDown, L = SnowWallLeft, R = SnowWallRight, B = SnowWallBlock
//C = SnowWallCornerLU, E = SnowWallCornerRU, F = SnowWallCornerLD, G = SnowWallCornerRD, X = boximg, b = bushes
// ' ' = SnowFloor, M = SnowWallHorizontalM, r = SnowWallHorizontalR, l = SnowWallHorizontalL , V = SnowWallVerticalU, v = SnowWallVerticalD, m = SnowWallVerticalM

const defaultTileMap = [
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

let activeTileMap = defaultTileMap.slice();
const allowedTileChars = new Set([
  "U",
  "D",
  "L",
  "R",
  "C",
  "E",
  "F",
  "G",
  "B",
  "r",
  "l",
  "M",
  "V",
  "m",
  "v",
  "X",
  "b",
  "1",
  "2",
  " ",
]);

const SnowWalls = new Set();
const walls = []; // Only collidable walls, not floors
const boxes = [];
const players = [];
const snowballs = [];

function loadImages() {
  SnowWallUp = registerImage("assets/Pngs/Tiles/Tile_05.png");
  SnowWallDown = registerImage("assets/Pngs/Tiles/Tile_25.png");
  SnowWallLeft = registerImage("assets/Pngs/Tiles/Tile_13.png");
  SnowWallRight = registerImage("assets/Pngs/Tiles/Tile_16.png");
  SnowWallCornerLU = registerImage("assets/Pngs/Tiles/Tile_04.png");
  SnowWallCornerRU = registerImage("assets/Pngs/Tiles/Tile_06.png");
  SnowWallCornerLD = registerImage("assets/Pngs/Tiles/Tile_24.png");
  SnowWallCornerRD = registerImage("assets/Pngs/Tiles/Tile_26.png");
  SnowFloor = registerImage("assets/Pngs/Tiles/Tile_12.png");
  SnowWallBlock = registerImage("assets/Pngs/Tiles/Tile_31.png");
  SnowWallHorizontalR = registerImage("assets/Pngs/Tiles/Tile_34.png");
  SnowWallHorizontalL = registerImage("assets/Pngs/Tiles/Tile_32.png");
  SnowWallHorizontalM = registerImage("assets/Pngs/Tiles/Tile_33.png");
  SnowWallVerticalU = registerImage("assets/Pngs/Tiles/Tile_54.png");
  SnowWallVerticalM = registerImage("assets/Pngs/Tiles/Tile_55.png");
  SnowWallVerticalD = registerImage("assets/Pngs/Tiles/Tile_56.png");
  boxImg = registerImage("assets/Pngs/Objects/Boxes/3.png");
  BushesImg = registerImage("assets/Pngs/Objects/Bushes/1.png");
  Player1Img = registerImage("assets/Pngs/Char/Character_1.png");
  Player1ImgUp = registerImage("assets/Pngs/Char/Character_1_up.png");
  Player1ImgLeft = registerImage("assets/Pngs/Char/Character_1_left.png");
  Player1ImgRight = registerImage("assets/Pngs/Char/Character_1_right.png");
  Player1ImgDown = registerImage("assets/Pngs/Char/Character_1.png");
  Player2Img = registerImage("assets/Pngs/Char/Character_2.png");
  Player2ImgUp = registerImage("assets/Pngs/Char/Character_2_up.png");
  Player2ImgDown = registerImage("assets/Pngs/Char/Character_2.png");
  Player2ImgLeft = registerImage("assets/Pngs/Char/Character_2_left.png");
  Player2ImgRight = registerImage("assets/Pngs/Char/Character_2_right.png");
  SnowBallImg = registerImage("assets/Pngs/Objects/Other/SnowBall.png");
}

function addWallTile(image, col, row) {
  const x = col * tileSize;
  const y = row * tileSize;
  const block = new Block(image, x, y, tileSize, tileSize);
  SnowWalls.add(block);
  walls.push(block);
  if (collisionGrid[row]) {
    collisionGrid[row][col] = block;
  }
  return block;
}

function LoadMap() {
  SnowWalls.clear();
  walls.length = 0;
  boxes.length = 0;
  players.length = 0;
  collisionGrid = Array.from({ length: RowCount }, () =>
    Array(ColumnCount).fill(null)
  );
  for (let i = 0; i < RowCount; i++) {
    for (let j = 0; j < ColumnCount; j++) {
      const row = activeTileMap[i];
      const tileMapChar = row[j];
      const x = j * tileSize;
      const y = i * tileSize;

      if (tileMapChar === "U") {
        addWallTile(SnowWallUp, j, i);
      } else if (tileMapChar === "D") {
        addWallTile(SnowWallDown, j, i);
      } else if (tileMapChar === "L") {
        addWallTile(SnowWallLeft, j, i);
      } else if (tileMapChar === "R") {
        addWallTile(SnowWallRight, j, i);
      } else if (tileMapChar === "C") {
        addWallTile(SnowWallCornerLU, j, i);
      } else if (tileMapChar === "E") {
        addWallTile(SnowWallCornerRU, j, i);
      } else if (tileMapChar === "F") {
        addWallTile(SnowWallCornerLD, j, i);
      } else if (tileMapChar === "G") {
        addWallTile(SnowWallCornerRD, j, i);
      } else if (tileMapChar === " ") {
        SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
      } else if (tileMapChar === "B") {
        addWallTile(SnowWallBlock, j, i);
      } else if (tileMapChar === "r") {
        addWallTile(SnowWallHorizontalR, j, i);
      } else if (tileMapChar === "l") {
        addWallTile(SnowWallHorizontalL, j, i);
      } else if (tileMapChar === "M") {
        addWallTile(SnowWallHorizontalM, j, i);
      } else if (tileMapChar === "V") {
        addWallTile(SnowWallVerticalU, j, i);
      } else if (tileMapChar === "m") {
        addWallTile(SnowWallVerticalM, j, i);
      } else if (tileMapChar === "v") {
        addWallTile(SnowWallVerticalD, j, i);
      } else if (tileMapChar === "X") {
        SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
        const boxBlock = new Block(boxImg, x, y, tileSize, tileSize);
        boxes.push(boxBlock);
        walls.push(boxBlock);
        collisionGrid[i][j] = boxBlock;
      } else if (tileMapChar === "b") {
        SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
        const bushBlock = new Block(BushesImg, x, y, tileSize, tileSize);
        SnowWalls.add(bushBlock);
        walls.push(bushBlock);
        collisionGrid[i][j] = bushBlock;
      } else if (tileMapChar === "1") {
        SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
        players.push(
          new Player(
            Player1Img,
            Player1ImgUp,
            Player1ImgDown,
            Player1ImgLeft,
            Player1ImgRight,
            0,
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
            1,
            x,
            y,
            tileSize,
            tileSize
          )
        );
      }
    }
  }

  // Keep player order consistent with their id (P1 = 0, P2 = 1).
  players.sort((a, b) => a.id - b.id);
  rebuildStaticLayer();
}

function rebuildStaticLayer() {
  if (!imagesReady) {
    return;
  }
  staticLayer = document.createElement("canvas");
  staticLayer.width = boardWidth;
  staticLayer.height = boardHeight;
  staticLayerContext = staticLayer.getContext("2d");
  staticLayerContext.imageSmoothingEnabled = false;
  staticLayerContext.clearRect(0, 0, boardWidth, boardHeight);
  for (let wall of SnowWalls) {
    staticLayerContext.drawImage(
      wall.Image,
      wall.x,
      wall.y,
      wall.width,
      wall.height
    );
  }
  for (let box of boxes) {
    staticLayerContext.drawImage(
      box.Image,
      box.x,
      box.y,
      box.width,
      box.height
    );
  }
}

function normalizeMapLines(lines) {
  if (lines.length > RowCount) {
    return { ok: false, error: `Map has ${lines.length} rows, needs ${RowCount}.` };
  }

  const normalized = lines.slice(0, RowCount);
  while (normalized.length < RowCount) {
    normalized.push("");
  }

  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i].length > ColumnCount) {
      return {
        ok: false,
        error: `Row ${i + 1} has ${normalized[i].length} columns, needs ${ColumnCount}.`,
      };
    }
    normalized[i] = normalized[i].padEnd(ColumnCount, " ");
  }

  return { ok: true, map: normalized };
}

function parseCustomMap(text) {
  const rawLines = text.replace(/\r/g, "").split("\n");
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") {
    rawLines.pop();
  }
  if (rawLines.length === 0) {
    return { ok: false, error: "Map is empty." };
  }

  const normalizedResult = normalizeMapLines(rawLines);
  if (!normalizedResult.ok) {
    return normalizedResult;
  }

  let player1Count = 0;
  let player2Count = 0;
  for (let rowIndex = 0; rowIndex < normalizedResult.map.length; rowIndex++) {
    const row = normalizedResult.map[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const char = row[colIndex];
      if (!allowedTileChars.has(char)) {
        return {
          ok: false,
          error: `Invalid tile '${char}' at row ${rowIndex + 1}, col ${colIndex + 1}.`,
        };
      }
      if (char === "1") player1Count += 1;
      if (char === "2") player2Count += 1;
    }
  }

  if (player1Count === 0 || player2Count === 0) {
    return { ok: false, error: "Map must include both player tiles: 1 and 2." };
  }

  return { ok: true, map: normalizedResult.map };
}

function setMapStatus(message, isError) {
  if (!mapStatus) {
    return;
  }
  mapStatus.textContent = message;
  mapStatus.style.color = isError ? "#f88" : "#9f9";
}

function updateMapMetrics(text) {
  if (!mapMetrics) {
    return;
  }
  const rawLines = text.replace(/\r/g, "").split("\n");
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") {
    rawLines.pop();
  }
  const rowCount = rawLines.length;
  let maxColumns = 0;
  for (const line of rawLines) {
    maxColumns = Math.max(maxColumns, line.length);
  }
  mapMetrics.textContent = `Rows: ${rowCount}/${RowCount} · Max columns: ${maxColumns}/${ColumnCount}`;
}

function applyCustomMap(text, nowMs) {
  const result = parseCustomMap(text);
  if (!result.ok) {
    setMapStatus(result.error, true);
    return;
  }

  activeTileMap = result.map;
  LoadMap();
  snowballs.length = 0;
  roundNumber = 1;
  playerScores = [0, 0];
  resetRoundState(nowMs);
  startCountdown(nowMs);
  setMapStatus("Custom map loaded.", false);
  updateMapMetrics(text);
}

function resetToDefaultMap(nowMs) {
  activeTileMap = defaultTileMap.slice();
  LoadMap();
  snowballs.length = 0;
  roundNumber = 1;
  playerScores = [0, 0];
  resetRoundState(nowMs);
  if (mapInput) {
    mapInput.value = defaultTileMap.join("\n");
  }
  setMapStatus("Default map loaded.", false);
  updateMapMetrics(mapInput ? mapInput.value : "");
  startCountdown(nowMs);
}

function startGame(nowMs) {
  roundNumber = 1;
  playerScores = [0, 0];
  roundEnding = false;
  roundWinnerId = null;
  snowballs.length = 0;
  for (let player of players) {
    if (player) {
      player.resetForRound();
    }
  }
  resetRoundState(nowMs);
  startCountdown(nowMs);
}

function startCountdown(nowMs) {
  gameState = "countdown";
  countdownStartMs = nowMs;
  fightFlashUntilMs = 0;
}

function pauseGame() {
  if (gameState === "playing") {
    gameState = "paused";
  }
}

function resumeGame() {
  if (gameState === "paused") {
    gameState = "playing";
    lastFrameTime = 0;
  }
}

function togglePause() {
  if (gameState === "playing") {
    pauseGame();
  } else if (gameState === "paused") {
    resumeGame();
  }
}

function collidesWithWalls(rect) {
  if (!collisionGrid.length) {
    return false;
  }
  const left = Math.max(0, Math.floor(rect.x / tileSize));
  const right = Math.min(
    ColumnCount - 1,
    Math.floor((rect.x + rect.width - 0.001) / tileSize)
  );
  const top = Math.max(0, Math.floor(rect.y / tileSize));
  const bottom = Math.min(
    RowCount - 1,
    Math.floor((rect.y + rect.height - 0.001) / tileSize)
  );

  for (let row = top; row <= bottom; row++) {
    const rowData = collisionGrid[row];
    for (let col = left; col <= right; col++) {
      if (rowData[col]) {
        return true;
      }
    }
  }
  return false;
}

function circleIntersectsRect(cx, cy, radius, rect) {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function circleCollidesWithWalls(circle) {
  if (!collisionGrid.length) {
    return false;
  }
  const left = Math.max(0, Math.floor((circle.x - circle.radius) / tileSize));
  const right = Math.min(
    ColumnCount - 1,
    Math.floor((circle.x + circle.radius) / tileSize)
  );
  const top = Math.max(0, Math.floor((circle.y - circle.radius) / tileSize));
  const bottom = Math.min(
    RowCount - 1,
    Math.floor((circle.y + circle.radius) / tileSize)
  );

  for (let row = top; row <= bottom; row++) {
    const rowData = collisionGrid[row];
    for (let col = left; col <= right; col++) {
      const block = rowData[col];
      if (block && circleIntersectsRect(circle.x, circle.y, circle.radius, block)) {
        return true;
      }
    }
  }
  return false;
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

  const snowball = obtainSnowball();
  snowball.reset(
    SnowBallImg,
    centerX + unit.x * spawnOffset,
    centerY + unit.y * spawnOffset,
    snowballRadius,
    speedX,
    speedY,
    nowMs,
    player.id,
    snowballLifetimeMs,
    false
  );
  snowballs.push(snowball);
}

function getHazardIntervalMs() {
  const scaled = baseHazardIntervalMs * Math.pow(hazardIntervalDecay, roundNumber - 1);
  const jitter = 0.85 + Math.random() * 0.3;
  return Math.max(minHazardIntervalMs, scaled * jitter);
}

function getHazardSpeed() {
  return baseHazardSpeed + (roundNumber - 1) * hazardSpeedPerRound;
}

function spawnHazardSnowball(nowMs) {
  const x = snowballRadius + Math.random() * (boardWidth - snowballRadius * 2);
  const y = -snowballRadius;
  const speedY = getHazardSpeed();
  const hazard = obtainSnowball();
  hazard.reset(
    SnowBallImg,
    x,
    y,
    snowballRadius,
    0,
    speedY,
    nowMs,
    null,
    hazardLifetimeMs,
    true
  );
  snowballs.push(hazard);
}

function obtainSnowball() {
  return snowballPool.pop() || new SnowBall();
}

function updateHazardSpawns(nowMs) {
  if (roundEnding || gameState !== "playing") {
    return;
  }
  if (nowMs >= nextHazardAtMs) {
    const extraHazards = Math.min(
      maxHazardsPerSpawn - 1,
      Math.floor((roundNumber - 1) / hazardExtraEveryRounds)
    );
    const count = 1 + extraHazards;
    for (let i = 0; i < count; i++) {
      spawnHazardSnowball(nowMs);
    }
    nextHazardAtMs = nowMs + getHazardIntervalMs();
  }
}

function resetRoundState(nowMs) {
  roundEnding = false;
  roundResetAtMs = 0;
  roundWinnerId = null;
  nextHazardAtMs = nowMs + getHazardIntervalMs();
}

function applyDeadzone(value, deadzone) {
  return Math.abs(value) < deadzone ? 0 : value;
}

function controllerInput() {
  const gamepads = navigator.getGamepads();
  const deadzone = 0.2;

  for (let i = 0; i < controllerSlots.length; i++) {
    const index = controllerSlots[i];
    if (index === null) {
      continue;
    }
    const gamepad = gamepads[index];
    if (!gamepad) {
      continue;
    }

    const axes = gamepad.axes || [];
    const buttons = gamepad.buttons || [];
    const axisX = applyDeadzone(axes[0] || 0, deadzone);
    const axisY = applyDeadzone(axes[1] || 0, deadzone);

    controllerInputState[i] = {
      up: (buttons[12] && buttons[12].pressed) || axisY < -0.5,
      down: (buttons[13] && buttons[13].pressed) || axisY > 0.5,
      left: (buttons[14] && buttons[14].pressed) || axisX < -0.5,
      right: (buttons[15] && buttons[15].pressed) || axisX > 0.5,
      throw: (buttons[0] && buttons[0].pressed) || false,
    };
  }
}

function updateControllerMovement() {
  const nowMs = currentTimeMs || performance.now();

  for (let i = 0; i < controllerSlots.length; i++) {
    const index = controllerSlots[i];
    const player = players[i];
    if (index === null || !player) {
      continue;
    }

    const input = controllerInputState[i];
    if (gameState === "title") {
      if (input.up || input.down || input.left || input.right || input.throw) {
        startGame(nowMs);
      }
    }
    if (gameState !== "playing") {
      continue;
    }
    let direction = "none";

    if (input.up && input.left) {
      direction = "up-left";
    } else if (input.up && input.right) {
      direction = "up-right";
    } else if (input.down && input.left) {
      direction = "down-left";
    } else if (input.down && input.right) {
      direction = "down-right";
    } else if (input.up) {
      direction = "up";
    } else if (input.down) {
      direction = "down";
    } else if (input.left) {
      direction = "left";
    } else if (input.right) {
      direction = "right";
    }

    player.updateDirection(direction);

    if (input.throw) {
      tryThrow(player, nowMs);
    }
  }
}

function update(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }
  const rawDelta = timestamp - lastFrameTime;
  const deltaMs = Math.min(rawDelta, maxDeltaMs);
  const deltaFactor = deltaMs ? deltaMs / targetFrameMs : 1;
  lastFrameTime = timestamp;
  currentTimeMs = timestamp;

  controllerInput();
  updateControllerMovement();

  if (gameState === "countdown") {
    const elapsed = timestamp - countdownStartMs;
    if (elapsed >= countdownDurationMs) {
      gameState = "playing";
      fightFlashUntilMs = timestamp + fightFlashMs;
      lastFrameTime = 0;
    }
  }

  if (gameState === "playing") {
    if (!roundEnding) {
      updatePlayerMovement();
      for (let player of players) {
        player.move(deltaFactor);
      }

      updateSnowballs(deltaFactor, timestamp);
      updateHazardSpawns(timestamp);
    }
    checkRoundEnd(timestamp);
    updateParticles(deltaMs);
    updateScreenShake(deltaMs);
  } else {
    for (let player of players) {
      player.updateDirection("none");
    }
  }

  draw();
  requestAnimationFrame(update);
}

function updateSnowballs(deltaFactor, nowMs) {
  for (let snowball of snowballs) {
    if (snowball.active) {
      snowball.move(deltaFactor, nowMs);
    }
    if (!snowball.active) {
      continue;
    }
    for (let player of players) {
      if (!player || !player.isAlive()) {
        continue;
      }
      if (player.id === snowball.ownerId) {
        continue;
      }
      if (snowball.collidesWith(player.getHitbox())) {
        player.takeDamage(snowballDamage);
        snowball.active = false;
        spawnHitEffect(snowball.x, snowball.y, false);
        addScreenShake(5, 140);
        break;
      }
    }
  }

  for (let i = snowballs.length - 1; i >= 0; i--) {
    if (!snowballs[i].active) {
      snowballPool.push(snowballs[i]);
      snowballs.splice(i, 1);
    }
  }
}

function spawnHitEffect(x, y, isWallHit) {
  const count = isWallHit ? 6 : 10;
  const baseSpeed = isWallHit ? 1.6 : 2.4;
  const color = isWallHit ? "rgba(200, 220, 255, 0.9)" : "rgba(255, 255, 255, 0.95)";

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = baseSpeed * (0.6 + Math.random() * 0.8);
    const particle = particlePool.pop() || new Particle();
    particle.reset(
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      1.5 + Math.random() * 2.5,
      260 + Math.random() * 120,
      color
    );
    particles.push(particle);
  }

  while (particles.length > maxParticles) {
    particlePool.push(particles.shift());
  }
}

function updateParticles(deltaMs) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.update(deltaMs);
    if (!particle.active) {
      particlePool.push(particle);
      particles.splice(i, 1);
    }
  }
}

function addScreenShake(intensity, durationMs) {
  shakeIntensity = Math.max(shakeIntensity, intensity);
  shakeDurationMs = Math.max(shakeDurationMs, durationMs);
  shakeRemainingMs = Math.max(shakeRemainingMs, durationMs);
}

function updateScreenShake(deltaMs) {
  if (shakeRemainingMs <= 0) {
    shakeRemainingMs = 0;
    shakeDurationMs = 0;
    return;
  }
  shakeRemainingMs = Math.max(0, shakeRemainingMs - deltaMs);
  if (shakeRemainingMs === 0) {
    shakeDurationMs = 0;
  }
}

function draw() {
  context.clearRect(0, 0, boardWidth, boardHeight);

  context.save();
  if (shakeRemainingMs > 0 && shakeDurationMs > 0) {
    const progress = shakeRemainingMs / shakeDurationMs;
    const magnitude = shakeIntensity * progress;
    const offsetX = (Math.random() * 2 - 1) * magnitude;
    const offsetY = (Math.random() * 2 - 1) * magnitude;
    context.translate(offsetX, offsetY);
  }

  if (staticLayer) {
    context.drawImage(staticLayer, 0, 0);
  } else {
    for (let wall of SnowWalls) {
      context.drawImage(wall.Image, wall.x, wall.y, wall.width, wall.height);
    }
    for (let box of boxes) {
      context.drawImage(box.Image, box.x, box.y, box.width, box.height);
    }
  }

  for (let player of players) {
    drawShadow(player.x + player.width / 2, player.y + player.height - 2, 18, 5);
  }
  for (let snowball of snowballs) {
    if (snowball.active) {
      drawShadow(snowball.x, snowball.y + 6, 10, 3);
    }
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

  drawParticles();
  context.restore();

  drawHud();
  drawOverlay();
}

function drawShadow(cx, cy, width, height) {
  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.35)";
  context.beginPath();
  context.ellipse(cx, cy, width / 2, height / 2, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawParticles() {
  for (let particle of particles) {
    const alpha = particle.opacity;
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function drawHud() {
  context.save();
  context.font = hudFont;
  context.textBaseline = "top";

  drawHudText(`Round ${roundNumber}`, boardWidth / 2, 8, "center");

  if (players[0]) {
    drawPlayerHud(players[0], 8, 32, "left", playerScores[0]);
  }
  if (players[1]) {
    drawPlayerHud(players[1], boardWidth - 8, 32, "right", playerScores[1]);
  }
  if (roundEnding) {
    const winnerText =
      roundWinnerId === null
        ? "Round draw!"
        : `Player ${roundWinnerId + 1} scores!`;
    drawHudText(winnerText, boardWidth / 2, 56, "center");
    context.font = hudSmallFont;
    drawHudText("Next round...", boardWidth / 2, 78, "center");
  }
  if (fightFlashUntilMs && currentTimeMs < fightFlashUntilMs) {
    drawHudText("FIGHT!", boardWidth / 2, 56, "center");
  }

  context.restore();
}

function drawPlayerHud(player, x, y, align, score) {
  const iconSize = 26;
  const barWidth = 150;
  const barHeight = 12;
  const padding = 6;
  const healthRatio = clamp(player.health / maxPlayerHp, 0, 1);
  const hue = Math.round(healthRatio * 120);
  const fillColor = `hsl(${hue}, 80%, 45%)`;

  let iconX = x;
  let barX = x + iconSize + padding;
  let textAlign = "left";
  if (align === "right") {
    iconX = x - iconSize;
    barX = x - iconSize - padding - barWidth;
    textAlign = "right";
  }

  context.save();
  context.drawImage(player.Image, iconX, y, iconSize, iconSize);

  // Cooldown ring
  const cooldownProgress = clamp(
    (currentTimeMs - player.lastThrowTime) / throwCooldownMs,
    0,
    1
  );
  if (cooldownProgress < 1) {
    const centerX = iconX + iconSize / 2;
    const centerY = y + iconSize / 2;
    context.strokeStyle = "rgba(255, 255, 255, 0.7)";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(
      centerX,
      centerY,
      iconSize / 2 + 2,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * cooldownProgress
    );
    context.stroke();
  }

  context.fillStyle = "rgba(0, 0, 0, 0.65)";
  context.fillRect(barX, y + 4, barWidth, barHeight);
  context.fillStyle = fillColor;
  context.fillRect(barX, y + 4, barWidth * healthRatio, barHeight);
  context.strokeStyle = "rgba(255, 255, 255, 0.4)";
  context.strokeRect(barX, y + 4, barWidth, barHeight);

  context.font = hudSmallFont;
  context.textAlign = textAlign;
  context.fillStyle = "#fff";
  const scoreText = `Score ${score}`;
  context.fillText(scoreText, align === "right" ? x : barX, y + 22);
  context.restore();
}

function drawHudText(text, x, y, align = "left") {
  context.textAlign = align;
  const metrics = context.measureText(text);
  const paddingX = 6;
  const boxHeight = 22;
  let boxX = x - paddingX;
  if (align === "center") {
    boxX = x - metrics.width / 2 - paddingX;
  } else if (align === "right") {
    boxX = x - metrics.width - paddingX;
  }
  const boxY = y - 2;

  context.fillStyle = "rgba(0, 0, 0, 0.65)";
  context.fillRect(boxX, boxY, metrics.width + paddingX * 2, boxHeight);
  context.strokeStyle = "rgba(255, 255, 255, 0.25)";
  context.strokeRect(boxX, boxY, metrics.width + paddingX * 2, boxHeight);

  context.lineWidth = 3;
  context.strokeStyle = "#000";
  context.strokeText(text, x, y);
  context.fillStyle = "#fff";
  context.fillText(text, x, y);
}

function drawOverlay() {
  if (gameState === "title") {
    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.7)";
    context.fillRect(0, 0, boardWidth, boardHeight);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.font = 'bold 28px "Lucida Console", monospace';
    context.fillText("SNOWBALL FIGHT", boardWidth / 2, boardHeight / 2 - 60);
    context.font = hudSmallFont;
    context.fillText("Press any key or gamepad to start", boardWidth / 2, boardHeight / 2 - 18);
    context.fillText("P to pause · F (P1) / Enter (P2) to throw", boardWidth / 2, boardHeight / 2 + 8);
    context.fillText("WASD vs Arrows · Hazards fall each round", boardWidth / 2, boardHeight / 2 + 34);
    context.restore();
  } else if (gameState === "paused") {
    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.6)";
    context.fillRect(0, 0, boardWidth, boardHeight);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.font = 'bold 26px "Lucida Console", monospace';
    context.fillText("PAUSED", boardWidth / 2, boardHeight / 2 - 10);
    context.font = hudSmallFont;
    context.fillText("Press P to resume", boardWidth / 2, boardHeight / 2 + 18);
    context.restore();
  } else if (gameState === "countdown") {
    const remaining = countdownDurationMs - (currentTimeMs - countdownStartMs);
    const number = Math.max(1, Math.ceil(remaining / 1000));
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "rgba(0, 0, 0, 0.35)";
    context.fillRect(0, 0, boardWidth, boardHeight);
    context.fillStyle = "#fff";
    context.font = 'bold 64px "Lucida Console", monospace';
    context.fillText(String(number), boardWidth / 2, boardHeight / 2 - 8);
    context.font = hudSmallFont;
    context.fillText("Get ready!", boardWidth / 2, boardHeight / 2 + 36);
    context.restore();
  }
}

function updatePlayerMovement() {
  if (gameState !== "playing") {
    return;
  }
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
  if (gameState !== "playing") {
    return;
  }
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
  if (gameState !== "playing") {
    return;
  }
  if (!player.isAlive()) {
    return;
  }
  if (!player.canThrow(nowMs)) {
    return;
  }
  throwSnowball(player, nowMs);
  player.recordThrow(nowMs);
}

function checkRoundEnd(nowMs) {
  if (roundEnding) {
    if (nowMs >= roundResetAtMs) {
      advanceRound(nowMs);
    }
    return;
  }

  const someoneDown = players.some((player) => player && !player.isAlive());
  if (someoneDown) {
    roundEnding = true;
    roundResetAtMs = nowMs + roundResetDelayMs;
    const livingPlayers = players.filter((player) => player && player.isAlive());
    if (livingPlayers.length === 1) {
      const winnerId = livingPlayers[0].id;
      playerScores[winnerId] += 1;
      roundWinnerId = winnerId;
    } else {
      roundWinnerId = null;
    }
  }
}

function advanceRound(nowMs) {
  roundNumber += 1;
  for (let player of players) {
    if (player) {
      player.resetForRound();
    }
  }
  snowballs.length = 0;
  resetRoundState(nowMs);
  startCountdown(nowMs);
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
    id,
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
    this.id = id;
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
    this.health = maxPlayerHp;
  }

  updateDirection(direction) {
    if (!this.isAlive()) {
      this.direction = "none";
      this.updateVelocity();
      return;
    }
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

  resetForRound() {
    this.x = this.Startx;
    this.y = this.Starty;
    this.direction = "down";
    this.facingDirection = "down";
    this.velocityX = 0;
    this.velocityY = 0;
    this.health = maxPlayerHp;
    this.updateImage();
  }

  isAlive() {
    return this.health > 0;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    if (!this.isAlive()) {
      this.direction = "none";
      this.velocityX = 0;
      this.velocityY = 0;
    }
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

        if (collidesWithWalls(this.getHitbox())) {
          this[axis] -= direction * step;
          collided = true;
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
  constructor() {
    this.active = false;
  }

  reset(
    Image,
    x,
    y,
    radius,
    speedX,
    speedY,
    spawnTimeMs,
    ownerId,
    lifetimeMs = snowballLifetimeMs,
    ignoresWalls = false
  ) {
    this.Image = Image;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speedX = speedX;
    this.speedY = speedY;
    this.spawnTimeMs = spawnTimeMs;
    this.lifetimeMs = lifetimeMs;
    this.active = true;
    this.ownerId = ownerId;
    this.ignoresWalls = ignoresWalls;
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
    if (!this.ignoresWalls) {
      if (circleCollidesWithWalls(this)) {
        this.active = false;
        spawnHitEffect(this.x, this.y, true);
        addScreenShake(3, 110);
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

class Particle {
  constructor() {
    this.active = false;
  }

  reset(x, y, vx, vy, radius, lifetimeMs, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.lifetimeMs = lifetimeMs;
    this.elapsedMs = 0;
    this.color = color;
    this.active = true;
  }

  update(deltaMs) {
    if (!this.active) {
      return;
    }
    this.elapsedMs += deltaMs;
    if (this.elapsedMs >= this.lifetimeMs) {
      this.active = false;
      return;
    }
    const deltaFactor = deltaMs / targetFrameMs;
    this.x += this.vx * deltaFactor;
    this.y += this.vy * deltaFactor;
  }

  get opacity() {
    if (!this.active) {
      return 0;
    }
    return 1 - this.elapsedMs / this.lifetimeMs;
  }
}
