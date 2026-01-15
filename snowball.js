let board; 
const RowCount = 21;
const ColumnCount = 19;
const tileSize = 32;
const boardWidth = ColumnCount * tileSize;
const boardHeight = RowCount * tileSize;
let context;

// Track which keys are currently pressed
const keysPressed = {};


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
let Player2Img;


window.onload = function() {
    board = document.getElementById("board");
    board.width = boardWidth;
    board.height = boardHeight;
    context = board.getContext("2d");

    loadImages();
    LoadMap();
    update();

    document.addEventListener("keydown", (e) => {
        keysPressed[e.key] = true;
        updatePlayerMovement();
    });
    document.addEventListener("keyup", (e) => {
        keysPressed[e.key] = false;
        updatePlayerMovement();
    });
   
}


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
    "L XV lMr B lMr VX R",
    "L  m     1     m  R",
    "L  v V lMMMr V v  R",
    "L    m   m   m    R",
    "L lMMMMr v lMMMMr R",
    "L                 R",
    "FDDDDDDDDDDDDDDDDDG" 
];

const SnowWalls = new Set();
const walls = []; // Only collidable walls, not floors
const boxes = [];
const players = [];


function loadImages() {
    SnowWallUp = new Image();
    SnowWallUp.src = "assets\\Pngs\\Tiles\\Tile_05.png";
    SnowWallDown = new Image();
    SnowWallDown.src = "assets\\Pngs\\Tiles\\Tile_25.png";
    SnowWallLeft = new Image();
    SnowWallLeft.src = "assets\\Pngs\\Tiles\\Tile_13.png";
    SnowWallRight = new Image();
    SnowWallRight.src = "assets\\Pngs\\Tiles\\Tile_16.png";
    SnowWallCornerLU = new Image();
    SnowWallCornerLU.src = "assets\\Pngs\\Tiles\\Tile_04.png";
    SnowWallCornerRU = new Image();
    SnowWallCornerRU.src = "assets\\Pngs\\Tiles\\Tile_06.png";
    SnowWallCornerLD = new Image();
    SnowWallCornerLD.src = "assets\\Pngs\\Tiles\\Tile_24.png";
    SnowWallCornerRD = new Image();
    SnowWallCornerRD.src = "assets\\Pngs\\Tiles\\Tile_26.png";
    SnowFloor = new Image();
    SnowFloor.src = "assets\\Pngs\\Tiles\\Tile_12.png";
    SnowWallBlock = new Image();
    SnowWallBlock.src = "assets\\Pngs\\Tiles\\Tile_31.png";
    SnowWallHorizontalR = new Image();
    SnowWallHorizontalR.src = "assets\\Pngs\\Tiles\\Tile_34.png";
    SnowWallHorizontalL = new Image();
    SnowWallHorizontalL.src = "assets\\Pngs\\Tiles\\Tile_32.png";
    SnowWallHorizontalM = new Image();
    SnowWallHorizontalM.src = "assets\\Pngs\\Tiles\\Tile_33.png";
    SnowWallVerticalU = new Image();
    SnowWallVerticalU.src = "assets\\Pngs\\Tiles\\Tile_54.png";
    SnowWallVerticalM = new Image();
    SnowWallVerticalM.src = "assets\\Pngs\\Tiles\\Tile_55.png";
    SnowWallVerticalD = new Image();
    SnowWallVerticalD.src = "assets\\Pngs\\Tiles\\Tile_56.png";
    boxImg = new Image();
    boxImg.src = "assets\\Pngs\\Objects\\Boxes\\3.png";
    BushesImg1 = new Image();
    BushesImg1.src = "assets\\Pngs\\Objects\\Bushes\\1.png";
    Player1Img = new Image();
    Player1Img.src = "assets\\Pngs\\Char\\Character_1.png";
    Player2Img = new Image();
    Player2Img.src = "assets\\Pngs\\Char\\Character_2.png";
}

function LoadMap() {

    SnowWalls.clear();
    walls.length = 0;
    for (let i = 0; i < RowCount; i++) {
        for (let j = 0; j < ColumnCount; j++) {
            const row = tileMap[i];
            const tileMapChar = row[j];
            const x = j * tileSize;
            const y = i * tileSize;

            if (tileMapChar === 'U') {
                SnowWalls.add(new Block(SnowWallUp, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallUp, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'D') {
                SnowWalls.add(new Block(SnowWallDown, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallDown, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'L') {
                SnowWalls.add(new Block(SnowWallLeft, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallLeft, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'R') {
                SnowWalls.add(new Block(SnowWallRight, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallRight, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'C') {
                SnowWalls.add(new Block(SnowWallCornerLU, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallCornerLU, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'E') {
                SnowWalls.add(new Block(SnowWallCornerRU, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallCornerRU, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'F') {
                SnowWalls.add(new Block(SnowWallCornerLD, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallCornerLD, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'G') {
                SnowWalls.add(new Block(SnowWallCornerRD, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallCornerRD, x, y, tileSize, tileSize));
            }else if (tileMapChar === ' ') {
                SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
            }else if (tileMapChar === 'B') {
                SnowWalls.add(new Block(SnowWallBlock, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallBlock, x, y, tileSize, tileSize));
            }else if (tileMapChar === 'r') {
                SnowWalls.add(new Block(SnowWallHorizontalR, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallHorizontalR, x, y, tileSize, tileSize));
            }else if (tileMapChar === 'l') {
                SnowWalls.add(new Block(SnowWallHorizontalL, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallHorizontalL, x, y, tileSize, tileSize));
            }else if (tileMapChar === 'M') {
                SnowWalls.add(new Block(SnowWallHorizontalM, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallHorizontalM, x, y, tileSize, tileSize));
            }else if (tileMapChar === 'V') {
                SnowWalls.add(new Block(SnowWallVerticalU, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallVerticalU, x, y, tileSize, tileSize));
            }else if (tileMapChar === 'm') {
                SnowWalls.add(new Block(SnowWallVerticalM, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallVerticalM, x, y, tileSize, tileSize));
            }else if (tileMapChar === 'v') {
                SnowWalls.add(new Block(SnowWallVerticalD, x, y, tileSize, tileSize));
                walls.push(new Block(SnowWallVerticalD, x, y, tileSize, tileSize));
            }else if (tileMapChar === 'X') {
                SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
                boxes.push(new Block(boxImg, x, y, tileSize, tileSize));
                walls.push(boxes[boxes.length - 1]);
            }else if (tileMapChar === 'b') {
                SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
                SnowWalls.add(new Block(BushesImg1, x, y, tileSize, tileSize));
                walls.push(new Block(BushesImg1, x, y, tileSize, tileSize));
            }else if (tileMapChar === '1') {
                SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
                players.push(new Player(Player1Img, x, y, tileSize, tileSize));
            }else if (tileMapChar === '2') {
                SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
                players.push(new Player(Player2Img, x, y, tileSize, tileSize));
            }

        }
    }
}


function update() {
       for (let player of players) {
        player.move();
    }
    draw();
    setTimeout(update, 1000 / 60);
}

function draw() {
    context.clearRect(0, 0, boardWidth, boardHeight);

    for (let wall of SnowWalls) {
        context.drawImage(wall.Image, wall.x, wall.y, wall.width, wall.height);
    };
    for (let box of boxes) {
        context.drawImage(box.Image, box.x, box.y, box.width, box.height);
    }
    for (let player of players) {
        context.drawImage(player.Image, player.x, player.y, player.width, player.height);
    }
}

function updatePlayerMovement() {
    // Player 1 (WASD)
    if (keysPressed['w']) {
        players[0].updateDirection('up');
    } else if (keysPressed['w'] && keysPressed['a']) {
        players[0].updateDirection('up-left');
    } else if (keysPressed['w'] && keysPressed['d']) {
        players[0].updateDirection('up-right');
    } else if (keysPressed['s']) {
        players[0].updateDirection('down');
    } else if (keysPressed['s'] && keysPressed['a']) {
        players[0].updateDirection('down-left');
    } else if (keysPressed['s'] && keysPressed['d']) {
        players[0].updateDirection('down-right');
    } else if (keysPressed['a']) {
        players[0].updateDirection('left');
    } else if (keysPressed['d']) {
        players[0].updateDirection('right');
    } else {
        players[0].updateDirection('none');
    }

   
    if (keysPressed['ArrowUp'] || keysPressed['i']) {
        players[1].updateDirection('up');
    } else if (keysPressed['ArrowDown'] || keysPressed['k']) {
        players[1].updateDirection('down');
    } else if (keysPressed['ArrowLeft'] || keysPressed['j']) {
        players[1].updateDirection('left');
    } else if (keysPressed['ArrowRight'] || keysPressed['l']) {
        players[1].updateDirection('right');
    } else {
        players[1].updateDirection('none');
    }
}


function collision(a, b) {
    return  a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
};


class Block {
    constructor(Image, x, y, width, height,) {
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
    constructor(Image, x, y, width, height) {
        this.Image = Image;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.Startx = x;
        this.Starty = y;

        this.direction = 'down';
        this.velocityX = 0;
        this.velocityY = 0;
    }

    updateDirection(direction) {
        this.direction = direction;
        this.updateVelocity();
    }

    updateVelocity() {
        if (this.direction === 'up') {
            this.velocityX = 0;
            this.velocityY = -tileSize / 10;
        } else if (this.direction === 'up-left') {
            this.velocityX = -tileSize / 10;
            this.velocityY = -tileSize / 10;
        } else if (this.direction === 'up-right') {
            this.velocityX = tileSize / 10;
            this.velocityY = -tileSize / 10;
        } else if (this.direction === 'down-left') {
            this.velocityX = -tileSize / 10;
            this.velocityY = tileSize / 10;
        } else if (this.direction === 'down-right') {
            this.velocityX = tileSize / 10;
            this.velocityY = tileSize / 10;
        } else if (this.direction === 'down') {
            this.velocityX = 0;
            this.velocityY = tileSize / 10;
        } else if (this.direction === 'left') {
            this.velocityX = -tileSize / 10;
            this.velocityY = 0;
        } else if (this.direction === 'right') {
            this.velocityX = tileSize / 10;
            this.velocityY = 0;
        } else if (this.direction === 'none') {
            this.velocityX = 0;
            this.velocityY = 0;
        }
    }

    move() {
        const stepSize = 1; // Smaller steps for smoother collision
        const stepsX = Math.abs(this.velocityX);
        const stepsY = Math.abs(this.velocityY);
        
        // Move X with smaller steps for better collision detection
        const dirX = this.velocityX > 0 ? 1 : -1;
        for (let i = 0; i < stepsX; i++) {
            this.x += dirX;
            let collided = false;
            for (let wall of walls) {
                if (collision(this, wall)) {
                    this.x -= dirX;
                    collided = true;
                    break;
                }
            }
            if (collided) break;
        }
        
        // Move Y with smaller steps for better collision detection
        const dirY = this.velocityY > 0 ? 1 : -1;
        for (let i = 0; i < stepsY; i++) {
            this.y += dirY;
            let collided = false;
            for (let wall of walls) {
                if (collision(this, wall)) {
                    this.y -= dirY;
                    collided = true;
                    break;
                }
            }
            if (collided) break;
        }
    }
}
