import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PlayerColor, Token, TokenLocation } from '../types/game';
import { getBoardCoordinates, isSafeZone } from '../game/ludoLogic';
import { createBoardTexture, createDiceMaterials } from './boardTextures';
import { sound } from '../audio/soundEffects';

export type CameraViewMode = 'isometric' | 'topdown' | 'cinematic';

interface TokenMeshGroup {
  group: THREE.Group;
  color: PlayerColor;
  tokenId: number;
  highlightMesh: THREE.Mesh;
  bodyMesh: THREE.Mesh;
  targetPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  isMoving: boolean;
  hopQueue: Array<{ x: number; z: number }>;
  hopProgress: number;
}

export class Ludo3DScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private frameId: number = 0;
  private isSoftwareGl: boolean = false;

  // Board & Meshes
  private boardGroup: THREE.Group = new THREE.Group();
  private tokenMeshes: Map<string, TokenMeshGroup> = new Map();
  private diceMesh: THREE.Mesh | null = null;
  private diceMaterials: THREE.MeshStandardMaterial[] = [];
  private shockwaveMeshes: THREE.Mesh[] = [];

  // Interaction
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private pointerDownPos = new THREE.Vector2();
  private isPointerDown = false;
  private isDragging = false;
  private onTokenClickCallback?: (color: PlayerColor, tokenId: number) => void;
  private onDiceClickCallback?: () => void;

  // Camera Orbit & Damping
  private cameraMode: CameraViewMode = 'isometric';
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private cameraCurrentPos = new THREE.Vector3(0, 16, 14);
  private cameraDesiredPos = new THREE.Vector3(0, 16, 14);
  private orbitSpherical = new THREE.Spherical(21, Math.PI / 3.8, 0);
  private targetSpherical = new THREE.Spherical(21, Math.PI / 3.8, 0);

  // Dice Animation State
  private isDiceRolling: boolean = false;
  private diceRollTimer: number = 0;
  private diceTargetValue: number = 1;
  private diceTargetEuler = new THREE.Euler();
  private onDiceRollComplete?: () => void;

  // Clean-up
  private disposables: Array<{ dispose: () => void }> = [];

  constructor(container: HTMLElement) {
    this.container = container;

    // Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b1120'); // Deep luxury slate/navy backdrop
    this.scene.fog = new THREE.FogExp2('#0b1120', 0.015);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.setCameraPreset('isometric');
    this.camera.position.copy(this.cameraDesiredPos);
    this.camera.lookAt(this.cameraTarget);

    // Environment map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Setup Lighting, Board, Dice, and Events
    this.setupLighting();
    this.buildBoard();
    this.buildDice();
    this.setupEventListeners();

    // Start Loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLighting() {
    // Warm Key Light with soft shadows
    const keyLight = new THREE.DirectionalLight('#fffbeb', 1.8);
    keyLight.position.set(12, 22, 14);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 45;
    const d = 14;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Cool Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight('#93c5fd', '#1e293b', 0.85);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    // Subtle Rim Light
    const rimLight = new THREE.DirectionalLight('#c084fc', 0.6);
    rimLight.position.set(-14, 12, -14);
    this.scene.add(rimLight);
  }

  private buildBoard() {
    this.boardGroup = new THREE.Group();

    // 1. Outer Mahogany / Walnut Wooden Frame with beveled rim
    const outerSize = 16.6;
    const woodGeo = new THREE.BoxGeometry(outerSize, 0.7, outerSize);
    const woodMat = new THREE.MeshStandardMaterial({
      color: '#1e1108',
      roughness: 0.35,
      metalness: 0.1,
    });
    const woodBase = new THREE.Mesh(woodGeo, woodMat);
    woodBase.position.y = -0.36;
    woodBase.receiveShadow = !this.isSoftwareGl;
    woodBase.castShadow = !this.isSoftwareGl;
    this.boardGroup.add(woodBase);
    this.disposables.push(woodGeo, woodMat);

    // 2. Brass Corner Brackets
    const bracketMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      metalness: 0.9,
      roughness: 0.2,
    });
    const bracketGeo = new THREE.BoxGeometry(1.4, 0.75, 1.4);
    const cornerOffsets = [
      [-outerSize / 2 + 0.6, -outerSize / 2 + 0.6],
      [outerSize / 2 - 0.6, -outerSize / 2 + 0.6],
      [-outerSize / 2 + 0.6, outerSize / 2 - 0.6],
      [outerSize / 2 - 0.6, outerSize / 2 - 0.6],
    ];
    cornerOffsets.forEach(([cx, cz]) => {
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.set(cx, -0.34, cz);
      this.boardGroup.add(bracket);
    });
    this.disposables.push(bracketGeo, bracketMat);

    // 3. Playing Surface (15x15 units)
    const boardTex = createBoardTexture(this.renderer);
    const boardGeo = new THREE.BoxGeometry(15, 0.08, 15);
    const boardMat = new THREE.MeshStandardMaterial({
      map: boardTex,
      roughness: 0.25,
      metalness: 0.05,
    });
    const boardSurface = new THREE.Mesh(boardGeo, boardMat);
    boardSurface.position.y = 0.01;
    boardSurface.receiveShadow = !this.isSoftwareGl;
    this.boardGroup.add(boardSurface);
    this.disposables.push(boardTex, boardGeo, boardMat);

    // 4. Center 3D Golden Triumph Pyramid / Gem
    const triumphGeo = new THREE.OctahedronGeometry(0.55, 0);
    const triumphMat = new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      metalness: 0.95,
      roughness: 0.12,
      emissive: '#d97706',
      emissiveIntensity: 0.35,
    });
    const triumphMesh = new THREE.Mesh(triumphGeo, triumphMat);
    triumphMesh.position.set(0, 0.45, 0);
    triumphMesh.rotation.y = Math.PI / 4;
    triumphMesh.castShadow = !this.isSoftwareGl;
    this.boardGroup.add(triumphMesh);
    this.disposables.push(triumphGeo, triumphMat);

    // 5. Contact Shadow Ground Plane beneath board
    const groundGeo = new THREE.PlaneGeometry(36, 36);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.72;
    groundMesh.receiveShadow = !this.isSoftwareGl;
    this.boardGroup.add(groundMesh);
    this.disposables.push(groundGeo, groundMat);

    this.scene.add(this.boardGroup);
  }

  /**
   * Builds the 3D die
   */
  private buildDice() {
    this.diceMaterials = createDiceMaterials();
    const diceGeo = new THREE.BoxGeometry(1.25, 1.25, 1.25);
    this.diceMesh = new THREE.Mesh(diceGeo, this.diceMaterials);
    this.diceMesh.position.set(0, 0.65, 0); // Defaults to center triumph platform
    this.diceMesh.castShadow = !this.isSoftwareGl;
    this.diceMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(this.diceMesh);
    this.disposables.push(diceGeo);
  }

  /**
   * Sculpted 4-part Pawn Token Group in player color
   */
  private createTokenPawn(color: PlayerColor, tokenId: number): TokenMeshGroup {
    const group = new THREE.Group();

    const colorHexMap: Record<PlayerColor, string> = {
      red: '#ef4444',
      green: '#10b981',
      yellow: '#f59e0b',
      blue: '#3b82f6',
    };
    const mainHex = colorHexMap[color];

    // Part 1: Weighted Brass Base Ring
    const baseGeo = new THREE.CylinderGeometry(0.36, 0.42, 0.14, 24);
    const brassMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      metalness: 0.9,
      roughness: 0.2,
    });
    const baseMesh = new THREE.Mesh(baseGeo, brassMat);
    baseMesh.position.y = 0.07;
    baseMesh.castShadow = !this.isSoftwareGl;
    group.add(baseMesh);

    // Part 2: Glossy Color Body Waist
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.35, 0.55, 24);
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: mainHex,
      roughness: 0.15,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.38;
    bodyMesh.castShadow = !this.isSoftwareGl;
    group.add(bodyMesh);

    // Part 3: Golden Collar Ring
    const collarGeo = new THREE.TorusGeometry(0.23, 0.04, 12, 24);
    const collarMesh = new THREE.Mesh(collarGeo, brassMat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.y = 0.65;
    group.add(collarMesh);

    // Part 4: Polished Head Sphere
    const headGeo = new THREE.SphereGeometry(0.24, 20, 20);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.position.y = 0.88;
    headMesh.castShadow = !this.isSoftwareGl;
    group.add(headMesh);

    // Part 5: Gem Finial Tip
    const tipGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const tipMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.1,
      metalness: 0.9,
    });
    const tipMesh = new THREE.Mesh(tipGeo, tipMat);
    tipMesh.position.y = 1.14;
    group.add(tipMesh);

    // Part 6: Selection Glow Ring on ground
    const highlightGeo = new THREE.RingGeometry(0.38, 0.52, 24);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: '#22c55e',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    highlightMesh.rotation.x = -Math.PI / 2;
    highlightMesh.position.y = 0.03;
    group.add(highlightMesh);

    // Tag group for raycasting
    group.userData = { color, tokenId };

    this.scene.add(group);

    return {
      group,
      color,
      tokenId,
      highlightMesh,
      bodyMesh,
      targetPos: new THREE.Vector3(),
      currentPos: new THREE.Vector3(),
      isMoving: false,
      hopQueue: [],
      hopProgress: 0,
    };
  }

  /**
   * Converts board (col, row) to Three.js world (X, Z).
   */
  public getTileWorldPos(col: number, row: number): { x: number; z: number } {
    const x = (col - 7) * 1.0;
    const z = (row - 7) * 1.0;
    return { x, z };
  }

  /**
   * Syncs tokens from React state to 3D scene meshes.
   * Handles multi-token spacing on same square, initial placement, and hopping animations.
   */
  public syncTokens(tokens: Token[], selectableTokenIds: number[], activeColor: PlayerColor) {
    // 1. Group tokens by cell coordinates to calculate slight circular offsets when stacked
    const tileGroups = new Map<string, Array<{ key: string; color: PlayerColor; tokenId: number; col: number; row: number }>>();

    tokens.forEach(t => {
      const key = `${t.color}_${t.id}`;
      const coord = getBoardCoordinates(t.color, t.location);
      const groupKey = `${coord.col.toFixed(1)}_${coord.row.toFixed(1)}`;
      if (!tileGroups.has(groupKey)) {
        tileGroups.set(groupKey, []);
      }
      tileGroups.get(groupKey)!.push({ key, color: t.color, tokenId: t.id, col: coord.col, row: coord.row });
    });

    // 2. Position each token mesh
    tileGroups.forEach(group => {
      const count = group.length;
      group.forEach((item, idx) => {
        let meshGroup = this.tokenMeshes.get(item.key);
        if (!meshGroup) {
          meshGroup = this.createTokenPawn(item.color, item.tokenId);
          this.tokenMeshes.set(item.key, meshGroup);
        }

        const baseWorld = this.getTileWorldPos(item.col, item.row);
        let offsetX = 0;
        let offsetZ = 0;

        if (count > 1) {
          const angle = (idx / count) * Math.PI * 2;
          const radius = count === 2 ? 0.22 : 0.3;
          offsetX = Math.cos(angle) * radius;
          offsetZ = Math.sin(angle) * radius;
        }

        const targetX = baseWorld.x + offsetX;
        const targetZ = baseWorld.z + offsetZ;

        meshGroup.targetPos.set(targetX, 0, targetZ);

        // If not moving, snap or initialize
        if (!meshGroup.isMoving) {
          if (meshGroup.currentPos.lengthSq() === 0) {
            meshGroup.currentPos.copy(meshGroup.targetPos);
            meshGroup.group.position.copy(meshGroup.targetPos);
          }
        }

        // Highlight selectable tokens
        const isSelectable = item.color === activeColor && selectableTokenIds.includes(item.tokenId);
        const highlightMat = meshGroup.highlightMesh.material as THREE.MeshBasicMaterial;
        highlightMat.opacity = isSelectable ? 0.85 : 0;
        if (isSelectable) {
          highlightMat.color.set('#4ade80');
        }
      });
    });
  }

  /**
   * Triggers a smooth multi-tile hopping animation for a moving token.
   */
  public animateTokenMove(
    color: PlayerColor,
    tokenId: number,
    pathSteps: Array<{ col: number; row: number }>,
    onComplete?: () => void
  ) {
    const key = `${color}_${tokenId}`;
    const meshGroup = this.tokenMeshes.get(key);
    if (!meshGroup) {
      if (onComplete) onComplete();
      return;
    }

    meshGroup.isMoving = true;
    meshGroup.hopQueue = pathSteps.map(step => this.getTileWorldPos(step.col, step.row));
    meshGroup.hopProgress = 0;

    let currentStepIdx = 0;
    const totalSteps = meshGroup.hopQueue.length;

    const hopNext = () => {
      if (currentStepIdx >= totalSteps) {
        meshGroup.isMoving = false;
        meshGroup.group.position.y = 0;
        if (onComplete) onComplete();
        return;
      }

      const fromPos = meshGroup.group.position.clone();
      const targetPos = meshGroup.hopQueue[currentStepIdx];
      const duration = 160; // ms per tile
      const startTime = performance.now();

      sound.playTokenHop();

      const stepTick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);

        // Parabolic vertical hop
        const hopY = Math.sin(t * Math.PI) * 0.7;

        meshGroup.group.position.x = THREE.MathUtils.lerp(fromPos.x, targetPos.x, t);
        meshGroup.group.position.z = THREE.MathUtils.lerp(fromPos.z, targetPos.z, t);
        meshGroup.group.position.y = hopY;

        if (t < 1) {
          requestAnimationFrame(stepTick);
        } else {
          meshGroup.group.position.x = targetPos.x;
          meshGroup.group.position.z = targetPos.z;
          meshGroup.group.position.y = 0;
          currentStepIdx++;
          setTimeout(hopNext, 30);
        }
      };

      requestAnimationFrame(stepTick);
    };

    hopNext();
  }

  /**
   * Shockwave ring and capture blast effect
   */
  public triggerCaptureEffect(col: number, row: number) {
    const worldPos = this.getTileWorldPos(col, row);
    sound.playCapture();

    const ringGeo = new THREE.RingGeometry(0.2, 0.35, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#ef4444',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const shockwave = new THREE.Mesh(ringGeo, ringMat);
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.set(worldPos.x, 0.08, worldPos.z);
    this.scene.add(shockwave);

    const startTime = performance.now();
    const duration = 500;

    const animateBlast = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const scale = 1 + t * 4;
      shockwave.scale.set(scale, scale, 1);
      ringMat.opacity = (1 - t) * 0.9;

      if (t < 1) {
        requestAnimationFrame(animateBlast);
      } else {
        this.scene.remove(shockwave);
        ringGeo.dispose();
        ringMat.dispose();
      }
    };
    requestAnimationFrame(animateBlast);
  }

  /**
   * Rolls the 3D die with tumbling physics and lands on the target face value (1-6).
   */
  public roll3DDice(value: number, onComplete?: () => void) {
    if (!this.diceMesh) return;

    this.isDiceRolling = true;
    this.diceTargetValue = value;
    this.diceRollTimer = 0;
    this.onDiceRollComplete = onComplete;

    sound.playDiceRoll();

    // Determine target rotation for `value` to face top (+Y)
    // Face mapping:
    // 1: top face (+Y) -> Euler (0, 0, 0)
    // 6: bottom face (-Y) -> Euler (Math.PI, 0, 0)
    // 2: right face (+X) -> Euler (0, 0, Math.PI / 2)
    // 5: left face (-X) -> Euler (0, 0, -Math.PI / 2)
    // 3: front face (+Z) -> Euler (-Math.PI / 2, 0, 0)
    // 4: back face (-Z) -> Euler (Math.PI / 2, 0, 0)
    const baseEulerMap: Record<number, [number, number, number]> = {
      1: [0, 0, 0],
      6: [Math.PI, 0, 0],
      2: [0, 0, Math.PI / 2],
      5: [0, 0, -Math.PI / 2],
      3: [-Math.PI / 2, 0, 0],
      4: [Math.PI / 2, 0, 0],
    };

    const [bx, by, bz] = baseEulerMap[value] || [0, 0, 0];
    // Add extra complete 360-degree spins for realistic momentum
    const spins = 2;
    this.diceTargetEuler.set(bx + Math.PI * 2 * spins, by + Math.PI * 2 * (spins - 1), bz + Math.PI * 2 * spins);

    const startRot = this.diceMesh.rotation.clone();
    const duration = 900; // ms
    const startTime = performance.now();

    const diceTick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // Bounce arc in Y
      // 2 bounces: high arc then smaller bounce
      let bounceY = 0.65;
      if (t < 0.65) {
        const subT = t / 0.65;
        bounceY = 0.65 + Math.sin(subT * Math.PI) * 2.8;
      } else {
        const subT = (t - 0.65) / 0.35;
        bounceY = 0.65 + Math.sin(subT * Math.PI) * 0.8;
      }

      this.diceMesh!.position.y = bounceY;

      // Cubic out interpolation on rotation
      const easeOut = 1 - Math.pow(1 - t, 3);
      this.diceMesh!.rotation.x = THREE.MathUtils.lerp(startRot.x, this.diceTargetEuler.x, easeOut);
      this.diceMesh!.rotation.y = THREE.MathUtils.lerp(startRot.y, this.diceTargetEuler.y, easeOut);
      this.diceMesh!.rotation.z = THREE.MathUtils.lerp(startRot.z, this.diceTargetEuler.z, easeOut);

      if (t < 1) {
        requestAnimationFrame(diceTick);
      } else {
        this.isDiceRolling = false;
        this.diceMesh!.position.y = 0.65;
        this.diceMesh!.rotation.copy(this.diceTargetEuler);
        sound.playDiceSettle(value === 6);
        if (this.onDiceRollComplete) {
          this.onDiceRollComplete();
          this.onDiceRollComplete = undefined;
        }
      }
    };

    requestAnimationFrame(diceTick);
  }

  /**
   * Sets the camera preset view
   */
  public setCameraPreset(mode: CameraViewMode) {
    this.cameraMode = mode;
    if (mode === 'isometric') {
      this.targetSpherical.set(22, Math.PI / 3.8, 0);
    } else if (mode === 'topdown') {
      this.targetSpherical.set(23, 0.05, 0);
    } else if (mode === 'cinematic') {
      this.targetSpherical.set(18, Math.PI / 3.2, Math.PI / 6);
    }
  }

  public getCameraPreset(): CameraViewMode {
    return this.cameraMode;
  }

  public setCallbacks(
    onTokenClick?: (color: PlayerColor, tokenId: number) => void,
    onDiceClick?: () => void
  ) {
    this.onTokenClickCallback = onTokenClick;
    this.onDiceClickCallback = onDiceClick;
  }

  private setupEventListeners() {
    const el = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      this.isPointerDown = true;
      this.isDragging = false;
      this.pointerDownPos.set(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isPointerDown) return;
      const dx = e.clientX - this.pointerDownPos.x;
      const dy = e.clientY - this.pointerDownPos.y;

      if (Math.hypot(dx, dy) > 8) {
        this.isDragging = true;
        // Orbit camera rotation
        this.targetSpherical.theta -= dx * 0.005;
        this.targetSpherical.phi = Math.max(0.05, Math.min(Math.PI / 2.1, this.targetSpherical.phi + dy * 0.005));
        this.pointerDownPos.set(e.clientX, e.clientY);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!this.isDragging) {
        // Handle click / tap raycast
        this.handleRaycast(e);
      }
      this.isPointerDown = false;
      this.isDragging = false;
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);
    this.disposables.push({
      dispose: () => {
        el.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('resize', onResize);
      },
    });
  }

  private handleRaycast(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. Check Dice mesh
    if (this.diceMesh && !this.isDiceRolling) {
      const diceHits = this.raycaster.intersectObject(this.diceMesh);
      if (diceHits.length > 0) {
        if (this.onDiceClickCallback) {
          this.onDiceClickCallback();
          return;
        }
      }
    }

    // 2. Check Tokens
    const tokenGroups: THREE.Group[] = [];
    this.tokenMeshes.forEach(m => tokenGroups.push(m.group));

    const tokenHits = this.raycaster.intersectObjects(tokenGroups, true);
    if (tokenHits.length > 0) {
      // Find top-level token group with userData
      let obj: THREE.Object3D | null = tokenHits[0].object;
      while (obj && !obj.userData?.color && obj.parent) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.color !== undefined) {
        const { color, tokenId } = obj.userData;
        if (this.onTokenClickCallback) {
          this.onTokenClickCallback(color, tokenId);
        }
      }
    }
  }

  private animate() {
    // Smooth camera damping towards target spherical coordinates
    this.orbitSpherical.theta = THREE.MathUtils.damp(this.orbitSpherical.theta, this.targetSpherical.theta, 8, 0.016);
    this.orbitSpherical.phi = THREE.MathUtils.damp(this.orbitSpherical.phi, this.targetSpherical.phi, 8, 0.016);
    this.orbitSpherical.radius = THREE.MathUtils.damp(this.orbitSpherical.radius, this.targetSpherical.radius, 8, 0.016);

    this.cameraDesiredPos.setFromSpherical(this.orbitSpherical);
    this.camera.position.copy(this.cameraDesiredPos);
    this.camera.lookAt(this.cameraTarget);

    // Subtle gentle hover pulse on selectable tokens
    const now = performance.now() * 0.005;
    this.tokenMeshes.forEach(mesh => {
      const highlightMat = mesh.highlightMesh.material as THREE.MeshBasicMaterial;
      if (highlightMat.opacity > 0) {
        const scale = 1 + Math.sin(now * 3) * 0.12;
        mesh.highlightMesh.scale.set(scale, scale, 1);
      }
    });

    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.animate);
  }

  public dispose() {
    cancelAnimationFrame(this.frameId);
    this.disposables.forEach(d => d.dispose());
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
