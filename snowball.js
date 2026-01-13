let board; 
const RowCount = 21;
const ColumnCount = 19;
const tileSize = 32;
const boardWidth = ColumnCount * tileSize;
const boardHeight = RowCount * tileSize;
let context;


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
let SnowBallImg;
let PlayerImg;


window.onload = function() {
    board = document.getElementById("board");
    board.width = boardWidth;
    board.height = boardHeight;
    context = board.getContext("2d");

    loadImages();
    LoadMap();
    update();
}


//U = SnowWallUp, D = SnowWallDown, L = SnowWallLeft, R = SnowWallRight, B = SnowWallBlock 
//C = SnowWallCornerLU, E = SnowWallCornerRU, F = SnowWallCornerLD, G = SnowWallCornerRD
// ' ' = SnowFloor, M = SnowWallHorizontalM, r = SnowWallHorizontalR, l = SnowWallHorizontalL , V = SnowWallVerticalU, v = SnowWallVerticalD, m = SnowWallVerticalM


const tileMap = [
    "CUUUUUUUUUUUUUUUUUE",
    "L        m        R",
    "L lr lMr v lMr lr R",
    "L                 R",
    "L lr V lMMMr V lr R",
    "L    m       m    R",
    "MMMr mMMr lMMm lMMM",
    "   B m       m B   ",
    "MMMr v lMMMr v lMMM",
    "                   ",
    "MMMr V lMMMr V lMMM",
    "   B m       m B   ",
    "MMMr v lMMMr v lMMM",
    "L        m        R",
    "L BV lMr v lMr VB R",
    "L  m           m  R",
    "L  v V lMMMr V v  R",
    "L    m   m   m    R",
    "L lMMMMr v lMMMMr R",
    "L                 R",
    "FDDDDDDDDDDDDDDDDDG" 
];

const SnowWalls = new Set();


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
    // SnowBallImg = new Image();
    // SnowBallImg.src = "assets\\Pngs\\Items and Blocks\\Snowball.png";
    // PlayerImg = new Image();
    // PlayerImg.src = "assets/Pngs/Characters/Player.png";
}

function LoadMap() {

    SnowWalls.clear();
    for (let i = 0; i < RowCount; i++) {
        for (let j = 0; j < ColumnCount; j++) {
            const row = tileMap[i];
            const tileMapChar = row[j];
            const x = j * tileSize;
            const y = i * tileSize;

            if (tileMapChar === 'U') {
                SnowWalls.add(new Block(SnowWallUp, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'D') {
                SnowWalls.add(new Block(SnowWallDown, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'L') {
                SnowWalls.add(new Block(SnowWallLeft, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'R') {
                SnowWalls.add(new Block(SnowWallRight, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'C') {
                SnowWalls.add(new Block(SnowWallCornerLU, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'E') {
                SnowWalls.add(new Block(SnowWallCornerRU, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'F') {
                SnowWalls.add(new Block(SnowWallCornerLD, x, y, tileSize, tileSize));
            } else if (tileMapChar === 'G') {
                SnowWalls.add(new Block(SnowWallCornerRD, x, y, tileSize, tileSize));
            }else if (tileMapChar === ' ') {
                SnowWalls.add(new Block(SnowFloor, x, y, tileSize, tileSize));
            }else if (tileMapChar === 'B') {
                SnowWalls.add(new Block(SnowWallBlock, x, y, tileSize, tileSize));
            }else if (tileMapChar === 'r') {
                SnowWalls.add(new Block(SnowWallHorizontalR, x, y, tileSize, tileSize));
            }else if (tileMapChar === 'l') {
                SnowWalls.add(new Block(SnowWallHorizontalL, x, y, tileSize, tileSize));
            }else if (tileMapChar === 'M') {
                SnowWalls.add(new Block(SnowWallHorizontalM, x, y, tileSize, tileSize));   
            }else if (tileMapChar === 'V') {
                SnowWalls.add(new Block(SnowWallVerticalU, x, y, tileSize, tileSize));   
            }else if (tileMapChar === 'm') {
                SnowWalls.add(new Block(SnowWallVerticalM, x, y, tileSize, tileSize));   
            }else if (tileMapChar === 'v') {
                SnowWalls.add(new Block(SnowWallVerticalD, x, y, tileSize, tileSize));
            }

        }
    }
}


function update() {
    draw();
    setTimeout(update, 1000 / 60);
}

function draw() {
    context.clearRect(0, 0, boardWidth, boardHeight);

    for (let wall of SnowWalls) {
        context.drawImage(wall.Image, wall.x, wall.y, wall.width, wall.height);
    };
}






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
