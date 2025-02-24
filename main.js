const { createCanvas } = require('canvas');
const { randomInt } = require('crypto');
const fs = require('fs');
const readline = require('readline');

const directions = [
  [0, 1],  // right
  [1, 0],  // down
  [1, 1],  // down-right
  [-1, 1], // up-right
];

function createEmptyGrid(size) {
  return Array(size).fill(null).map(() => Array(size).fill(''));
}

function isValidPosition(grid, word, row, col, direction) {
  const [dx, dy] = direction;
  for (let i = 0; i < word.length; i++) {
    const newRow = row + i * dx;
    const newCol = col + i * dy;
    if (newRow < 0 || newRow >= grid.length || newCol < 0 || newCol >= grid[0].length || grid[newRow][newCol] !== '') {
      return false;
    }
  }
  return true;
}

function placeWordInGrid(grid, word, row, col, direction) {
  const [dx, dy] = direction;
  const positions = [];
  for (let i = 0; i < word.length; i++) {
    const newRow = row + i * dx;
    const newCol = col + i * dy;
    grid[newRow][newCol] = word[i];
    positions.push([newRow, newCol]);
  }
  return positions;
}

function fillEmptySpaces(grid) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === '') {
        grid[row][col] = letters.charAt(randomInt(letters.length));
      }
    }
  }
}

function generateWordSearch(words, gridSize) {
  const grid = createEmptyGrid(gridSize);
  const wordPositions = {};
  words.forEach(word => {
    let placed = false;
    while (!placed) {
      const direction = directions[randomInt(directions.length)];
      const row = randomInt(gridSize);
      const col = randomInt(gridSize);
      if (isValidPosition(grid, word, row, col, direction)) {
        wordPositions[word] = placeWordInGrid(grid, word, row, col, direction);
        placed = true;
      }
    }
  });
  fillEmptySpaces(grid);
  return { grid, wordPositions };
}

function drawGrid(grid, wordPositions = {}, highlightWords = false) {
  const size = 50; // cell size
  const canvasSize = grid.length * size;
  const canvas = createCanvas(canvasSize, canvasSize);
  const ctx = canvas.getContext('2d');
  ctx.font = `${size * 0.8}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const colors = ['rgba(255, 0, 0, 0.3)', 'rgba(0, 255, 0, 0.3)', 'rgba(0, 0, 255, 0.3)', 'rgba(255, 255, 0, 0.3)', 'rgba(255, 0, 255, 0.3)'];

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const x = col * size + size / 2;
      const y = row * size + size / 2;
      ctx.fillStyle = 'black';
      ctx.fillText(grid[row][col], x, y);
    }
  }

  // Draw the outer border
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2; // Adjust the border width as needed
  ctx.strokeRect(0, 0, canvasSize, canvasSize);

  if (highlightWords) {
    let colorIndex = 0;
    for (const word in wordPositions) {
      const color = colors[colorIndex % colors.length];
      const positions = wordPositions[word];
      positions.forEach(([wordRow, wordCol]) => {
        ctx.fillStyle = color;
        ctx.fillRect(wordCol * size, wordRow * size, size, size);
      });
      colorIndex++;
    }
  }

  return canvas.toBuffer('image/png');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateImagesFromCSV(csvFilePath) {
  const rl = readline.createInterface({
    input: fs.createReadStream(csvFilePath),
    output: process.stdout,
    terminal: false
  });

  let gridSize = 0;
  let words = [];
  let puzzleIndex = 1;

  for await (const line of rl) {
    if (line.startsWith('gridSize')) {
      if (words.length > 0) {
        try {
          console.log(`Generating image for puzzle ${puzzleIndex}...`);
          const { grid, wordPositions } = generateWordSearch(words, gridSize);
          fs.writeFileSync(`images/${puzzleIndex}.png`, drawGrid(grid));
          fs.writeFileSync(`resolved/${puzzleIndex}-resolved.png`, drawGrid(grid, wordPositions, true));
          puzzleIndex++;
          words = [];
        } catch (err) {
          console.error(`Error generating image for puzzle ${puzzleIndex}: ${err.message}`);
        }
        await sleep(5000); // Wait for 1 second between generations
      }
      gridSize = parseInt(line.split(',')[1], 10);
    } else if (line.trim()) {
      words.push(line.trim());
    }
  }

  if (words.length > 0) {
    try {
      console.log(`Generating image for puzzle ${puzzleIndex}...`);
      const { grid, wordPositions } = generateWordSearch(words, gridSize);
      fs.writeFileSync(`images/${puzzleIndex}.png`, drawGrid(grid));
      fs.writeFileSync(`resolved/${puzzleIndex}-resolved.png`, drawGrid(grid, wordPositions, true));
    } catch (err) {
      console.error(`Error generating image for puzzle ${puzzleIndex}: ${err.message}`);
    }
  }

  console.log('All images generated.');
}

generateImagesFromCSV('words.csv');