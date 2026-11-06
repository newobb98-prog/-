import * as THREE from 'three';
import { SAFE_TRACK_INDICES, TRACK_COORDINATES } from '../game/ludoLogic';

/**
 * Creates high-resolution procedural canvas textures for the 15x15 Ludo board.
 * Zero external image dependencies.
 */
export function createBoardTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cellSize = size / 15;

  // Background: Rich ivory marble texture with subtle grain
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, size, size);

  // Subtle marble / linen noise pattern
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.7);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Draw 15x15 subtle grid lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 15; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(size, i * cellSize);
    ctx.stroke();
  }

  // Draw 4 Quadrant Bases (6x6 cells each)
  const drawBaseYard = (colStart: number, rowStart: number, colorHex: string, lightHex: string, borderHex: string) => {
    const x = colStart * cellSize;
    const y = rowStart * cellSize;
    const w = 6 * cellSize;
    const h = 6 * cellSize;

    // Outer colored block with rounded inset
    ctx.fillStyle = colorHex;
    ctx.fillRect(x, y, w, h);

    // Inner white circular/rounded tray
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 15;
    const pad = cellSize * 0.6;
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, w - pad * 2, h - pad * 2, cellSize * 0.4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4 Token Yard Wells
    const wellSlots = [
      { cx: x + cellSize * 1.8, cy: y + cellSize * 1.8 },
      { cx: x + cellSize * 4.2, cy: y + cellSize * 1.8 },
      { cx: x + cellSize * 1.8, cy: y + cellSize * 4.2 },
      { cx: x + cellSize * 4.2, cy: y + cellSize * 4.2 },
    ];

    wellSlots.forEach(slot => {
      // Golden outer rim
      ctx.beginPath();
      ctx.arc(slot.cx, slot.cy, cellSize * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();

      // Colored well interior
      ctx.beginPath();
      ctx.arc(slot.cx, slot.cy, cellSize * 0.68, 0, Math.PI * 2);
      ctx.fillStyle = lightHex;
      ctx.fill();

      // Inset bevel
      ctx.lineWidth = 3;
      ctx.strokeStyle = borderHex;
      ctx.stroke();
    });
  };

  // Red Yard: top-left (0, 0)
  drawBaseYard(0, 0, '#dc2626', '#fee2e2', '#b91c1c');
  // Green Yard: top-right (9, 0)
  drawBaseYard(9, 0, '#059669', '#d1fae5', '#047857');
  // Yellow Yard: bottom-right (9, 9)
  drawBaseYard(9, 9, '#d97706', '#fef3c7', '#b45309');
  // Blue Yard: bottom-left (0, 9)
  drawBaseYard(0, 9, '#2563eb', '#dbeafe', '#1d4ed8');

  // Draw 4 Home Columns / Runways (5 cells each)
  const drawRunwayCell = (col: number, row: number, colorHex: string) => {
    const x = col * cellSize;
    const y = row * cellSize;
    ctx.fillStyle = colorHex;
    ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
  };

  // Red Runway: row 7, cols 1..5
  for (let c = 1; c <= 5; c++) drawRunwayCell(c, 7, '#ef4444');
  // Green Runway: col 7, rows 1..5
  for (let r = 1; r <= 5; r++) drawRunwayCell(7, r, '#10b981');
  // Yellow Runway: row 7, cols 9..13
  for (let c = 9; c <= 13; c++) drawRunwayCell(c, 7, '#f59e0b');
  // Blue Runway: col 7, rows 9..13
  for (let r = 9; r <= 13; r++) drawRunwayCell(7, r, '#3b82f6');

  // Draw Start Cells (colored with arrows pointing out)
  const drawStartCell = (col: number, row: number, colorHex: string, arrowDir: 'right' | 'down' | 'left' | 'up') => {
    const x = col * cellSize;
    const y = row * cellSize;
    ctx.fillStyle = colorHex;
    ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

    // White directional arrow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    const s = cellSize * 0.3;

    if (arrowDir === 'right') {
      ctx.moveTo(cx - s, cy - s * 0.7);
      ctx.lineTo(cx + s * 0.8, cy);
      ctx.lineTo(cx - s, cy + s * 0.7);
    } else if (arrowDir === 'down') {
      ctx.moveTo(cx - s * 0.7, cy - s);
      ctx.lineTo(cx, cy + s * 0.8);
      ctx.lineTo(cx + s * 0.7, cy - s);
    } else if (arrowDir === 'left') {
      ctx.moveTo(cx + s, cy - s * 0.7);
      ctx.lineTo(cx - s * 0.8, cy);
      ctx.lineTo(cx + s, cy + s * 0.7);
    } else if (arrowDir === 'up') {
      ctx.moveTo(cx - s * 0.7, cy + s);
      ctx.lineTo(cx, cy - s * 0.8);
      ctx.lineTo(cx + s * 0.7, cy + s);
    }
    ctx.closePath();
    ctx.fill();
  };

  drawStartCell(1, 6, '#ef4444', 'right'); // Red start
  drawStartCell(8, 1, '#10b981', 'down');  // Green start
  drawStartCell(13, 8, '#f59e0b', 'left'); // Yellow start
  drawStartCell(6, 13, '#3b82f6', 'up');   // Blue start

  // Draw 5-Point Safe Stars on Safe Tiles
  const drawStar = (cx: number, cy: number, radius: number, fillColor: string = '#f59e0b') => {
    ctx.save();
    ctx.beginPath();
    ctx.translate(cx, cy);
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3;
    const spikes = 5;
    const outerRadius = radius;
    const innerRadius = radius * 0.45;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.moveTo(0, -outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  // Safe Stars on standard track safe indices (excluding the 4 start cells which have colored arrows)
  const starIndices = [8, 21, 34, 47];
  starIndices.forEach(idx => {
    const coord = TRACK_COORDINATES[idx];
    const cx = (coord.col + 0.5) * cellSize;
    const cy = (coord.row + 0.5) * cellSize;
    drawStar(cx, cy, cellSize * 0.38, '#fbbf24');
  });

  // Central Home Triangle (cols 6..8, rows 6..8)
  const cx = 7.5 * cellSize;
  const cy = 7.5 * cellSize;
  const x6 = 6 * cellSize;
  const y6 = 6 * cellSize;
  const x9 = 9 * cellSize;
  const y9 = 9 * cellSize;

  // Red Center Triangle (Left)
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(x6, y6);
  ctx.lineTo(x6, y9);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();

  // Green Center Triangle (Top)
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.moveTo(x6, y6);
  ctx.lineTo(x9, y6);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();

  // Yellow Center Triangle (Right)
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.moveTo(x9, y6);
  ctx.lineTo(x9, y9);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();

  // Blue Center Triangle (Bottom)
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.moveTo(x6, y9);
  ctx.lineTo(x9, y9);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();

  // Center Golden Triumph Star
  drawStar(cx, cy, cellSize * 0.7, '#fbbf24');

  // Outer decorative border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, size - 10, size - 10);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates high resolution procedural textures for a 6-sided die with recessed circular pips.
 */
export function createDiceMaterials(): THREE.MeshStandardMaterial[] {
  // Face order in Three.js BoxGeometry:
  // 0: +X (Right: 2)
  // 1: -X (Left: 5)
  // 2: +Y (Top: 1)
  // 3: -Y (Bottom: 6)
  // 4: +Z (Front: 3)
  // 5: -Z (Back: 4)
  const faceValues = [2, 5, 1, 6, 3, 4];

  return faceValues.map(val => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Polished ivory background with subtle bevel gradient
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.7);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle edge border
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, size - 14, size - 14);

    // Pip coordinates (scaled from 0 to 1)
    const pipPositions: Record<number, Array<[number, number]>> = {
      1: [[0.5, 0.5]],
      2: [[0.28, 0.28], [0.72, 0.72]],
      3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]],
      4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
      5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
      6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]],
    };

    const pips = pipPositions[val] || [];
    const pipRadius = val === 1 ? size * 0.12 : size * 0.085;
    const pipColor = val === 1 ? '#ef4444' : '#1e293b'; // 1 is traditionally red/ruby!

    pips.forEach(([px, py]) => {
      const cx = px * size;
      const cy = py * size;

      // Recessed pip shadow
      ctx.beginPath();
      ctx.arc(cx, cy, pipRadius, 0, Math.PI * 2);
      ctx.fillStyle = pipColor;
      ctx.fill();

      // Recessed inner highlight
      ctx.beginPath();
      ctx.arc(cx - pipRadius * 0.2, cy - pipRadius * 0.2, pipRadius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.15,
      metalness: 0.05,
    });
  });
}
