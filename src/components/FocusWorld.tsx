import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type FocusWorldProps = {
  progress: number;
  words: string[];
};

export type FocusWorldRef = {
  capture: () => string | null;
};

// 재귀형 평면 가지 구조
interface Branch {
  start: THREE.Vector3;
  end: THREE.Vector3;
  level: number;
  angle: number;       // 원래 각도 보존
  length: number;      // 원래 길이 보존
  phaseOffset: number; // 나무 흔들림 위상차
  parentIndex: number; // 부모 가지의 인덱스 (-1은 루트)
}

// 다양한 L-System 및 프랙탈 구조 생성 알고리즘
function generateRecursiveTreeByType(
  type: number,
  start: THREE.Vector3,
  angle: number,
  length: number,
  level: number,
  maxLevel: number,
  branches: Branch[],
  theta: number,
  phaseOffset: number,
  parentIndex: number
) {
  if (level > maxLevel) return;

  // 가지 각도 및 길이의 무작위성 노이즈를 다소 넓혀 organic하게 생장하도록 수정
  const angleNoise = type === 5 || type === 7 ? 0.18 : 0.11;
  const currentAngle = angle + (Math.random() - 0.5) * angleNoise;
  const currentLength = length * (0.91 + Math.random() * 0.16);

  const end = new THREE.Vector3(
    start.x + Math.sin(currentAngle) * currentLength,
    start.y + Math.cos(currentAngle) * currentLength,
    start.z
  );

  const myIndex = branches.length;
  branches.push({
    start,
    end,
    level,
    angle: currentAngle,
    length: currentLength,
    phaseOffset,
    parentIndex
  });

  if (type === 0) {
    // a: F -> F[+F]F[-F]F (지그재그식 지엽형)
    generateRecursiveTreeByType(type, end, currentAngle, length * 0.72, level + 1, maxLevel, branches, theta, phaseOffset + 0.1, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle + theta, length * 0.48, level + 1, maxLevel, branches, theta, phaseOffset + 0.25, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle - theta, length * 0.48, level + 1, maxLevel, branches, theta, phaseOffset + 0.35, myIndex);
  } else if (type === 1) {
    // b: F -> F[+F]F[-F][F] (성긴 가지형)
    generateRecursiveTreeByType(type, end, currentAngle, length * 0.76, level + 1, maxLevel, branches, theta, phaseOffset + 0.1, myIndex);
    if (level % 2 === 0) {
      generateRecursiveTreeByType(type, end, currentAngle + theta, length * 0.42, level + 1, maxLevel, branches, theta, phaseOffset + 0.2, myIndex);
    } else {
      generateRecursiveTreeByType(type, end, currentAngle - theta, length * 0.42, level + 1, maxLevel, branches, theta, phaseOffset + 0.3, myIndex);
    }
    generateRecursiveTreeByType(type, end, currentAngle + (Math.random() - 0.5) * 0.15, length * 0.35, level + 1, maxLevel, branches, theta, phaseOffset + 0.4, myIndex);
  } else if (type === 2) {
    // c: F -> FF-[-F+F+F]+[+F-F-F] (조밀한 브러시/덤불형)
    const nextLen = length * 0.58;
    generateRecursiveTreeByType(type, end, currentAngle, nextLen * 1.1, level + 1, maxLevel, branches, theta, phaseOffset + 0.1, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle - theta, nextLen, level + 1, maxLevel, branches, theta, phaseOffset + 0.2, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle - theta * 2, nextLen * 0.75, level + 1, maxLevel, branches, theta, phaseOffset + 0.3, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle + theta, nextLen, level + 1, maxLevel, branches, theta, phaseOffset + 0.4, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle + theta * 2, nextLen * 0.75, level + 1, maxLevel, branches, theta, phaseOffset + 0.5, myIndex);
  } else if (type === 3) {
    // d: X -> F[+X]F[-X]+X (상승 쌍가지형)
    generateRecursiveTreeByType(type, end, currentAngle + theta * 0.5, length * 0.72, level + 1, maxLevel, branches, theta, phaseOffset + 0.1, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle + theta, length * 0.58, level + 1, maxLevel, branches, theta, phaseOffset + 0.2, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle - theta, length * 0.58, level + 1, maxLevel, branches, theta, phaseOffset + 0.3, myIndex);
  } else if (type === 4) {
    // e: X -> F[+X][-X]FX (대칭 소나무형)
    generateRecursiveTreeByType(type, end, currentAngle, length * 0.75, level + 1, maxLevel, branches, theta, phaseOffset + 0.1, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle + theta * 1.2, length * 0.46, level + 1, maxLevel, branches, theta, phaseOffset + 0.2, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle - theta * 1.2, length * 0.46, level + 1, maxLevel, branches, theta, phaseOffset + 0.3, myIndex);
  } else if (type === 5) {
    // f: X -> F-[[X]+X]+F[+FX]-X (자연스러운 유기적 활엽수형)
    const nextLen = length * 0.65;
    generateRecursiveTreeByType(type, end, currentAngle - theta * 0.4, nextLen, level + 1, maxLevel, branches, theta, phaseOffset + 0.1, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle + theta * 1.4, nextLen * 0.75, level + 1, maxLevel, branches, theta, phaseOffset + 0.2, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle + theta * 0.8, nextLen * 0.5, level + 1, maxLevel, branches, theta, phaseOffset + 0.3, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle - theta * 1.2, nextLen * 0.6, level + 1, maxLevel, branches, theta, phaseOffset + 0.4, myIndex);
  } else if (type === 6) {
    // g: F -> F[+F][-F]F (정삼각형 덤불형 구조)
    const nextLen = length * 0.62;
    generateRecursiveTreeByType(type, end, currentAngle, length * 0.78, level + 1, maxLevel, branches, theta, phaseOffset + 0.1, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle + theta * 1.1, nextLen, level + 1, maxLevel, branches, theta, phaseOffset + 0.25, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle - theta * 1.1, nextLen, level + 1, maxLevel, branches, theta, phaseOffset + 0.35, myIndex);
  } else {
    // h: X -> F[+X]F[-X] (수직 침엽수 구조)
    const nextLen = length * 0.74;
    generateRecursiveTreeByType(type, end, currentAngle, nextLen, level + 1, maxLevel, branches, theta, phaseOffset + 0.1, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle + theta * 0.85, nextLen * 0.62, level + 1, maxLevel, branches, theta, phaseOffset + 0.2, myIndex);
    generateRecursiveTreeByType(type, end, currentAngle - theta * 0.85, nextLen * 0.62, level + 1, maxLevel, branches, theta, phaseOffset + 0.3, myIndex);
  }
}

// 집중 진행도(progress) 및 실시간 바람 흔들림(time)을 반영하여 기하학 빌드
function buildTreeGeometry(
  branches: Branch[],
  progress: number,
  maxLevel: number,
  positions: Float32Array,
  colors: Float32Array,
  treeColor: THREE.Color,
  time: number
): number {
  let vertexIndex = 0;
  // 각 가지의 계산된 실시간 swayed/unfolded 끝점을 보관하는 캐시 배열
  const computedEnds: THREE.Vector3[] = [];

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];

    // 1. 부모의 sway가 반영된 실제 끝점을 시작점으로 설정
    let startPos = branch.start.clone();
    if (branch.parentIndex !== -1 && computedEnds[branch.parentIndex]) {
      startPos = computedEnds[branch.parentIndex].clone();
    }

    // 2. 성장도(growFraction) 계산 (줄기 0부터 꼭대기까지 전 레벨 순차 성장)
    const startProgress = branch.level / (maxLevel + 1) * 0.45; // 아래 레벨부터 상위 레벨 순으로 성장 시작점 분배
    const growDuration = 0.5; // 각 레벨 가지가 다 펼쳐질 때까지의 성장 시간 비율
    let growFraction = (progress - startProgress) / growDuration;
    growFraction = Math.max(0, Math.min(1, growFraction));

    // 3. 각도 계산 (부모 각도에서 자신의 각도로 피어나듯 unfoldedAngle 계산)
    let parentAngle = 0;
    if (branch.parentIndex !== -1) {
      parentAngle = branches[branch.parentIndex].angle;
    }
    const unfoldedAngle = THREE.MathUtils.lerp(parentAngle, branch.angle, growFraction);

    // 4. 실시간 바람 흔들림 (Sway) 각도 추가
    const swayAmp = 0.03 * (branch.level + 1);
    const swayAngle = Math.sin(time * 1.8 + branch.phaseOffset) * swayAmp;
    const finalAngle = unfoldedAngle + swayAngle;

    // 5. 실시간 성장 길이에 맞춰 계산
    const currentLength = branch.length * growFraction;

    // 6. 실시간 끝점 좌표 도출
    const endPos = new THREE.Vector3(
      startPos.x + Math.sin(finalAngle) * currentLength,
      startPos.y + Math.cos(finalAngle) * currentLength,
      startPos.z
    );

    computedEnds.push(endPos);

    if (growFraction > 0) {
      // 시작점 버퍼 데이터 기입
      positions[vertexIndex * 3] = startPos.x;
      positions[vertexIndex * 3 + 1] = startPos.y;
      positions[vertexIndex * 3 + 2] = startPos.z;

      colors[vertexIndex * 3] = treeColor.r;
      colors[vertexIndex * 3 + 1] = treeColor.g;
      colors[vertexIndex * 3 + 2] = treeColor.b;

      vertexIndex++;

      // 끝점 버퍼 데이터 기입
      positions[vertexIndex * 3] = endPos.x;
      positions[vertexIndex * 3 + 1] = endPos.y;
      positions[vertexIndex * 3 + 2] = endPos.z;

      colors[vertexIndex * 3] = treeColor.r;
      colors[vertexIndex * 3 + 1] = treeColor.g;
      colors[vertexIndex * 3 + 2] = treeColor.b;

      vertexIndex++;
    }
  }

  return vertexIndex; // 실제로 그려진 정점(vertex)의 개수 반환
}

// 방해물 단어용 2D 뱃지 스타일 캔버스 텍스처 생성 함수
function createWordBadgeSprite(text: string, isGreenish: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 64);

    // 반투명 뱃지 스타일 배경
    ctx.fillStyle = 'rgba(26, 25, 23, 0.86)';
    ctx.strokeStyle = isGreenish ? 'rgba(80, 180, 130, 0.7)' : 'rgba(80, 140, 180, 0.7)';
    ctx.lineWidth = 2;

    const r = 20;
    const w = 236;
    const h = 44;
    const x = 10;
    const y = 10;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 텍스트 그리기 (Courier New 스타일, 어두운 무드에 맞는 밝은 텍스트)
    ctx.fillStyle = isGreenish ? '#a3e2c9' : '#a3cde2';
    ctx.font = 'bold 13px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const displayWord = text.length > 18 ? text.slice(0, 16) + '..' : text;
    ctx.fillText(displayWord, 128, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.4, 0.35, 1);
  return sprite;
}

const FocusWorld = forwardRef<FocusWorldRef, FocusWorldProps>(({ progress, words }, ref) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(progress);
  const [selectedWordLabel, setSelectedWordLabel] = useState<string | null>(null);
  const selectedWordLabelRef = useRef<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const wordGroupRef = useRef<THREE.Group | null>(null);
  const wordSpritesRef = useRef<THREE.Sprite[]>([]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    selectedWordLabelRef.current = selectedWordLabel;
  }, [selectedWordLabel]);

  // 외부(FocusFlow)에서 캡처 함수 호출을 가능하게 함
  useImperativeHandle(ref, () => ({
    capture: () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        // 버퍼 복제를 확실히 하기 위해 캡처 직전에 다시 한번 렌더
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        return rendererRef.current.domElement.toDataURL('image/png');
      }
      return null;
    }
  }));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // WebGL 렌더러 생성 (preserveDrawingBuffer 설정하여 화면 캡처 지원)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor('#141311', 1);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // 깊은 웜 다크 공간을 위한 안개(Fog) 설정
    scene.fog = new THREE.FogExp2('#141311', 0.05);

    // 거리감을 조금 더 좁히고 와이드한 카메라 화각(FOV 62)으로 넓게 화면 시작
    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 150);
    camera.position.set(0, 3.2, 11.5);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3;
    controls.maxDistance = 25;
    controls.target.set(0, 1.8, 0);
    controls.update();

    // 부드러운 다크 씬 조명
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.45);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight('#ffffff', 0.6);
    dirLight.position.set(5, 12, 8);
    scene.add(dirLight);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // 바닥 격자선 (모던 다크 스타일)
    const gridHelper = new THREE.GridHelper(40, 30, '#3a3833', '#22211f');
    gridHelper.position.y = 0;
    worldGroup.add(gridHelper);

    // 푸른색/초록색 형광 & 모노톤 팔레트
    const colorPalette = [
      new THREE.Color('#7ef5c0'), // 밝은 형광 민트 그린
      new THREE.Color('#4ef29f'), // 비브란트 그린
      new THREE.Color('#82c3ff'), // 스카이 블루
      new THREE.Color('#a4ffdd'), // 아쿠아 파스텔 그린
      new THREE.Color('#3ce1ff'), // 네온 사이언 블루
      new THREE.Color('#b5d6ff'), // 아주 연한 파스텔 블루
    ];

    // 1. 바닥에 데이터/풀 조각들 뿌려놓기 (블러 광원 및 실시간 반짝임 구현)
    const scatterCount = 180;
    const scatterGeometry = new THREE.BufferGeometry();
    const scatterPositions = new Float32Array(scatterCount * 3);
    const scatterColors = new Float32Array(scatterCount * 3);
    const scatterBaseColors: THREE.Color[] = [];
    const scatterPhases: number[] = [];
    
    for (let i = 0; i < scatterCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.8 + Math.random() * 8.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      scatterPositions[i * 3] = x;
      scatterPositions[i * 3 + 1] = 0.01;
      scatterPositions[i * 3 + 2] = z;
      
      const col = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      scatterBaseColors.push(col);
      scatterPhases.push(Math.random() * Math.PI * 2);

      scatterColors[i * 3] = col.r;
      scatterColors[i * 3 + 1] = col.g;
      scatterColors[i * 3 + 2] = col.b;
    }
    scatterGeometry.setAttribute('position', new THREE.BufferAttribute(scatterPositions, 3));
    scatterGeometry.setAttribute('color', new THREE.BufferAttribute(scatterColors, 3));
    
    // 블러 글로우 파티클용 캔버스 텍스처 제작
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 16;
    glowCanvas.height = 16;
    const gCtx = glowCanvas.getContext('2d');
    if (gCtx) {
      const grad = gCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      gCtx.fillStyle = grad;
      gCtx.beginPath();
      gCtx.arc(8, 8, 8, 0, Math.PI * 2);
      gCtx.fill();
    }
    const glowTexture = new THREE.CanvasTexture(glowCanvas);

    const scatterMaterial = new THREE.PointsMaterial({
      size: 0.36, // 블러 텍스처 반영을 위해 크기 상향
      map: glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // 광원 겹침 효과 극대화
    });
    const scatterPoints = new THREE.Points(scatterGeometry, scatterMaterial);
    worldGroup.add(scatterPoints);

    // 2. 홈화면(DigitalTree)과 유사한 평면 재귀 트리 생성 및 배치 (L-System 다양성 적용)
    // 8종의 나무 타입(0~7)이 각각 최대 2개까지만 나오도록 풀을 생성하고 셔플
    const typePool: number[] = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7];
    for (let j = typePool.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [typePool[j], typePool[k]] = [typePool[k], typePool[j]];
    }
    // 풀 중 무작위로 12 ~ 14개를 선택하여 나무 개수 결정 (더욱 풍성한 숲 연출)
    const treeCount = 12 + Math.floor(Math.random() * 3); // 12~14그루
 
    const treesData: {
      branches: Branch[];
      line: THREE.LineSegments;
      treeColor: THREE.Color;
      posX: number;
      posZ: number;
      maxLevel: number;
    }[] = [];
 
    for (let i = 0; i < treeCount; i++) {
      const branches: Branch[] = [];
      const startPos = new THREE.Vector3(0, 0, 0);
      
      // 극적인 대비를 위해 0.35배 ~ 2.3배 사이의 다양한 스케일 팩터 부여
      const scale = 0.26 + Math.random() * 1.02;
      const trunkLength = (1.0 + Math.random() * 0.58) * scale;
 
      // 셔플링 풀에서 차례대로 타입 배정
      const treeType = typePool[i] !== undefined ? typePool[i] : Math.floor(Math.random() * 8);
      
      // 타입별 과도한 기하학 팽창을 막기 위해 maxLevel 및 각도(theta) 지정
      let treeMaxLevel = 8;
      let thetaAngle = 22.5;
 
      if (treeType === 0) {
        treeMaxLevel = 8;
        thetaAngle = 25.7;
      } else if (treeType === 1) {
        treeMaxLevel = 8;
        thetaAngle = 20.0;
      } else if (treeType === 2) {
        treeMaxLevel = 5;
        thetaAngle = 22.5;
      } else if (treeType === 3) {
        treeMaxLevel = 7;
        thetaAngle = 20.0;
      } else if (treeType === 4) {
        treeMaxLevel = 8;
        thetaAngle = 25.7;
      } else if (treeType === 5) {
        treeMaxLevel = 6;
        thetaAngle = 22.5;
      } else if (treeType === 6) {
        treeMaxLevel = 6;
        thetaAngle = 25.0;
      } else if (treeType === 7) {
        treeMaxLevel = 7;
        thetaAngle = 30.0;
      }
 
      const theta = ((thetaAngle + (Math.random() - 0.5) * 4) * Math.PI) / 180;
      const phaseOffset = Math.random() * Math.PI * 2;
 
      // 재귀 기하학 트리 생성
      generateRecursiveTreeByType(
        treeType,
        startPos, 
        0, 
        trunkLength, 
        0, 
        treeMaxLevel, 
        branches, 
        theta, 
        phaseOffset,
        -1
      );
 
      const angle = (i / treeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      // 배치 반경을 기존보다 확장 (1.5 ~ 9.5)하여 넓고 다채로운 원근감 형성
      const radius = 1.5 + Math.random() * 8.0;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
 
      // 굵기(선 두께) 지정을 (1.0 ~ 3.5) * scale 범위로 다양하게 생성
      const linewidthMultiplier = 0.65 + Math.random() * 1.35;
      const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: linewidthMultiplier * scale,
      });
 
      // 동적 branches 수에 맞게 정적 버퍼 크기 정밀 계산
      const maxVertices = branches.length * 2;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(maxVertices * 3);
      const colors = new Float32Array(maxVertices * 3);
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setDrawRange(0, 0); // 초기에는 0개 드로우
 
      const lineMesh = new THREE.LineSegments(geometry, lineMaterial);
      lineMesh.position.set(x, 0, z);
      worldGroup.add(lineMesh);
 
      // HSL 색채 생성 (H: 120도 그린 ~ 230도 블루, S: 65% ~ 100%, L: 45% ~ 70%)
      const h = 120 + Math.random() * 110;
      const s = 0.65 + Math.random() * 0.35;
      const l = 0.45 + Math.random() * 0.25;
      const randColor = new THREE.Color().setHSL(h / 360, s, l);
 
      treesData.push({
        branches,
        line: lineMesh,
        treeColor: randColor,
        posX: x,
        posZ: z,
        maxLevel: treeMaxLevel
      });
    }

    // 3. 공중 유영 파티클/빛망울
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 500;
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 28;
      pPositions[i * 3 + 1] = Math.random() * 10;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    
    // 4. 공중 단어 스프라이트 배치용 그룹 준비
    const wordGroup = new THREE.Group();
    worldGroup.add(wordGroup);
    wordGroupRef.current = wordGroup;
    
    const bubbleCanvas = document.createElement('canvas');
    bubbleCanvas.width = 16;
    bubbleCanvas.height = 16;
    const bCtx = bubbleCanvas.getContext('2d');
    if (bCtx) {
      const grad = bCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      bCtx.fillStyle = grad;
      bCtx.beginPath();
      bCtx.arc(8, 8, 8, 0, Math.PI * 2);
      bCtx.fill();
    }
    const bubbleTexture = new THREE.CanvasTexture(bubbleCanvas);
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      map: bubbleTexture,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    worldGroup.add(particles);
    // 클릭 감지용 Raycaster
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // 단순 클릭과 드래그 회전을 명확하게 분별하기 위한 위치/시간 변수
    let pointerDownTime = 0;
    const pointerDownPos = new THREE.Vector2();

    const onPointerDown = (event: PointerEvent) => {
      pointerDownTime = performance.now();
      pointerDownPos.set(event.clientX, event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      const duration = performance.now() - pointerDownTime;
      const dist = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);

      // 드래그 회전 동작이거나 롱탭(300ms 초과)의 경우 클릭 액션으로 판단하지 않고 무시
      if (duration > 300 || dist > 5) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(wordSpritesRef.current, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const obj = hit.object;
        setSelectedWordLabel(obj.userData.label);
      } else {
        // 팝업 내부 엘리먼트 클릭 시 닫히는 현상 방지
        const target = event.target as HTMLElement;
        if (target && target.closest('.word-node-popover')) {
          return;
        }
        setSelectedWordLabel(null);
      }
    };

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = performance.now() * 0.001;
      const curProgress = progressRef.current;

      // 1. 나무 기하학 빌드 및 실시간 바람 변동 & 빌보딩 연산
      treesData.forEach((tree) => {
        const geometry = tree.line.geometry;
        const positions = geometry.attributes.position.array as Float32Array;
        const colors = geometry.attributes.color.array as Float32Array;

        const activeVertices = buildTreeGeometry(
          tree.branches,
          curProgress,
          tree.maxLevel,
          positions,
          colors,
          tree.treeColor,
          time
        );

        geometry.setDrawRange(0, activeVertices);
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.computeBoundingSphere();

        // Y축 빌보딩 (Y-axis Billboarding): 카메라 회전 시 나무 면이 항상 정면을 보게 유지
        const diffX = camera.position.x - tree.posX;
        const diffZ = camera.position.z - tree.posZ;
        tree.line.rotation.y = Math.atan2(diffX, diffZ);
      });

      // 1.5. 바닥 픽셀 Twinkling 반짝임 애니메이션
      const scatterColorArray = scatterGeometry.attributes.color.array as Float32Array;
      for (let i = 0; i < scatterCount; i++) {
        const phase = scatterPhases[i];
        const baseColor = scatterBaseColors[i];
        const intensity = 0.55 + Math.sin(time * 2.8 + phase) * 0.45;
        
        scatterColorArray[i * 3] = baseColor.r * intensity;
        scatterColorArray[i * 3 + 1] = baseColor.g * intensity;
        scatterColorArray[i * 3 + 2] = baseColor.b * intensity;
      }
      scatterGeometry.attributes.color.needsUpdate = true;

      // 2. 파티클 유영 및 회전
      particles.rotation.y = time * 0.008;
      particles.rotation.x = Math.sin(time * 0.1) * 0.015;

      // 3. 단어 노드 표류 모션
      wordSpritesRef.current.forEach((sprite) => {
        const phase = sprite.userData.phase || 0;
        const baseY = sprite.userData.baseY || 1.5;
        const speed = sprite.userData.speed || 1;
        sprite.position.y = baseY + Math.sin(time * speed + phase) * 0.18;
      });

      controls.update();

      // 4. 선택된 뱃지 팝업 실시간 픽셀 매칭 (직접 DOM 조작으로 React 리렌더링 제거하여 60FPS 확보)
      const currentLabel = selectedWordLabelRef.current;
      if (currentLabel && popoverRef.current) {
        const selectedSprite = wordSpritesRef.current.find(s => s.userData.label === currentLabel);
        if (selectedSprite) {
          const rect = renderer.domElement.getBoundingClientRect();
          const tempV = new THREE.Vector3();
          selectedSprite.getWorldPosition(tempV);
          tempV.project(camera);
          const px = (tempV.x * 0.5 + 0.5) * rect.width;
          const py = (-(tempV.y * 0.5) + 0.5) * rect.height;
          
          popoverRef.current.style.left = `${px}px`;
          popoverRef.current.style.top = `${py - 42}px`;
        }
      }

      renderer.render(scene, camera);
    };

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    resize();
    animate();
    
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', resize);
      controls.dispose();
      renderer.dispose();
      mount.replaceChildren();
    };
  }, []); // words를 의존성 배열에서 제외하여, 단어 추가 시 3D Canvas 전체가 리로드/재생성되지 않고 1회만 초기화되도록 수정

  // 단어 리스트(words)가 추가/변경될 때, 3D Canvas 전체를 파괴하지 않고 공중 단어 스프라이트만 동적 갱신
  useEffect(() => {
    const wordGroup = wordGroupRef.current;
    if (!wordGroup) return;

    // 기존 단어 스프라이트 삭제 및 메모리 해제
    wordSpritesRef.current.forEach((sprite) => {
      wordGroup.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
      sprite.geometry.dispose();
    });
    wordSpritesRef.current = [];

    // 현재 단어 리스트를 바탕으로 스프라이트 동적 생성 및 그룹 추가
    words.forEach((word, index) => {
      const isGreen = index % 2 === 0;
      const sprite = createWordBadgeSprite(word, isGreen);

      const angle = (index / Math.max(1, words.length)) * Math.PI * 2 + Math.random() * 0.4;
      const radius = 3.5 + Math.random() * 2.5;
      const y = 1.2 + Math.random() * 2.0;
      sprite.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );

      sprite.userData = {
        label: word,
        baseY: y,
        phase: index * 0.72,
        speed: 0.6 + Math.random() * 0.5,
      };

      wordSpritesRef.current.push(sprite);
      wordGroup.add(sprite);
    });
  }, [words]);

  return (
    <div className="focus-world" ref={mountRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 3D 카메라 힌트 */}
      <div className="focus-world-readout">
        <span>orbit / pan / zoom</span>
        <span>trees {Math.round(progress * 100)}%</span>
      </div>

      {/* 노드 바로 위에 뜨는 깔끔한 뱃지/말풍선 스타일 카드 팝업 */}
      {selectedWordLabel && (
        <div
          ref={popoverRef}
          className="word-node-popover"
          style={{
            position: 'absolute',
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'auto',
            left: '0px',
            top: '0px',
          }}
        >
          <div className="popover-arrow"></div>
          <div className="popover-content">
            <small>distraction note</small>
            <h3>{selectedWordLabel}</h3>
            <p>released during setup</p>
            <button className="popover-close-btn" onClick={() => setSelectedWordLabel(null)}>
              close
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

FocusWorld.displayName = 'FocusWorld';

export default FocusWorld;
