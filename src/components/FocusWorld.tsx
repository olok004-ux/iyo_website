import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type FocusWorldProps = {
  progress: number;
  words: string[];
};

type SelectedWordState = {
  label: string;
  x: number;
  y: number;
} | null;

// 재귀형 평면 가지 구조
interface Branch {
  start: THREE.Vector3;
  end: THREE.Vector3;
  level: number;
  angle: number;       // 원래 각도 보존
  length: number;      // 원래 길이 보존
  phaseOffset: number; // 나무 흔들림 위상차
}

// 홈 화면(DigitalTree)의 Daniel Shiffman 알고리즘과 100% 매칭되면서 랜덤 변동 함수가 적용된 재귀 트리 생성
function generate2DRecursiveTree(
  start: THREE.Vector3,
  angle: number,
  length: number,
  level: number,
  maxLevel: number,
  branches: Branch[],
  theta: number,
  phaseOffset: number,
  lengthVariation: number, // 각 나뭇가지 길이 무작위 비율 변동
  angleVariation: number   // 각 나뭇가지 각도 무작위 비율 변동
) {
  if (level > maxLevel) return;

  const currentLength = length * lengthVariation;
  const currentAngle = angle + (Math.random() - 0.5) * angleVariation;

  const end = new THREE.Vector3(
    start.x + Math.sin(currentAngle) * currentLength,
    start.y + Math.cos(currentAngle) * currentLength,
    start.z
  );
  branches.push({ start, end, level, angle: currentAngle, length: currentLength, phaseOffset });

  const nextLength = length * 0.67;

  // 좌우로 갈라지는 분기에도 노이즈와 흔들림 위상차, 그리고 무작위 변이 적용
  generate2DRecursiveTree(
    end,
    currentAngle + theta,
    nextLength,
    level + 1,
    maxLevel,
    branches,
    theta,
    phaseOffset + 0.15,
    0.95 + Math.random() * 0.1,
    0.05 + Math.random() * 0.05
  );
  generate2DRecursiveTree(
    end,
    currentAngle - theta,
    nextLength,
    level + 1,
    maxLevel,
    branches,
    theta,
    phaseOffset + 0.25,
    0.95 + Math.random() * 0.1,
    0.05 + Math.random() * 0.05
  );
}

// 집중 진행도(progress) 및 실시간 바람 흔들림(time)을 반영하여 기하학 빌드
function buildTreeGeometry(
  branches: Branch[],
  progress: number,
  maxLevel: number,
  points: THREE.Vector3[],
  colors: number[],
  treeColor: THREE.Color,
  time: number
) {
  const levelProgress = progress * (maxLevel + 1);

  // 실시간 렌더링 시 바람 효과 계산용 프레임 캐시
  const calculatedPositions = new Map<string, THREE.Vector3>();

  const getSwayedEnd = (branch: Branch): THREE.Vector3 => {
    const key = `${branch.start.x},${branch.start.y},${branch.start.z}_${branch.end.x},${branch.end.y},${branch.end.z}`;
    if (calculatedPositions.has(key)) {
      return calculatedPositions.get(key)!;
    }

    // 부모 노드의 실시간 변형 위치 가져오기
    let startPos = branch.start.clone();
    // 만약 부모 노드가 루트(0,0,0)가 아니라면, 부모 노드의 끝점( sway 반영됨 )을 부모의 부모 정보로부터 추적해야 하나
    // 여기서는 간단하고 안정적으로 계층적 누적 흔들림(Sway)을 삼각함수 위상차로 시뮬레이션합니다.
    const parentLevel = branch.level;
    
    // 바람에 의한 흔들림 각도 계산 (윗가지일수록 흔들림이 더 큼)
    const swayAmp = 0.04 * (parentLevel + 1);
    const swayAngle = Math.sin(time * 1.8 + branch.phaseOffset) * swayAmp;
    
    // 현재 가지의 최종 흔들림 각도
    const finalAngle = branch.angle + swayAngle;
    const endPos = new THREE.Vector3(
      startPos.x + Math.sin(finalAngle) * branch.length,
      startPos.y + Math.cos(finalAngle) * branch.length,
      startPos.z
    );

    calculatedPositions.set(key, endPos);
    return endPos;
  };

  // 계층적으로 가지를 렌더링하기 위해 start 좌표를 이전 레벨 부모들의 swayedEnd로 부드럽게 재정합
  const swayedBranches = branches.map(b => {
    let start = b.start.clone();
    // 0 레벨은 무조건 (0,0,0)
    if (b.level > 0) {
      // 자신을 자식으로 가지는 부모 가지의 끝점 찾기
      const parent = branches.find(p => p.end.equals(b.start));
      if (parent) {
        start = getSwayedEnd(parent);
      }
    }
    const end = new THREE.Vector3(
      start.x + Math.sin(b.angle + Math.sin(time * 1.8 + b.phaseOffset) * 0.03 * (b.level + 1)) * b.length,
      start.y + Math.cos(b.angle + Math.sin(time * 1.8 + b.phaseOffset) * 0.03 * (b.level + 1)) * b.length,
      start.z
    );
    return { ...b, start, end };
  });

  swayedBranches.forEach((branch) => {
    let growFraction = 0;
    if (levelProgress >= branch.level + 1) {
      growFraction = 1;
    } else if (levelProgress > branch.level) {
      growFraction = levelProgress - branch.level;
    }

    if (growFraction <= 0) return;

    // 기둥 및 가지 성장선 계산
    const currentEnd = branch.start.clone().lerp(branch.end, growFraction);

    points.push(branch.start.clone(), currentEnd);
    colors.push(treeColor.r, treeColor.g, treeColor.b);
    colors.push(treeColor.r, treeColor.g, treeColor.b);
  });
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

function FocusWorld({ progress, words }: FocusWorldProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(progress);
  const [selectedWord, setSelectedWord] = useState<SelectedWordState>(null);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // WebGL 렌더러 생성
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    
    // 5번 사진과 같은 깊은 웜 다크 공간을 위한 안개(Fog) 설정
    scene.fog = new THREE.FogExp2('#141311', 0.05);

    // 거리감을 조금 더 좁히고 와이드한 카메라 화각(FOV 62)으로 넓게 화면 시작
    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 150);
    camera.position.set(0, 3.2, 11.5);

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

    // 푸른색/초록색 형광 & 모노톤 팔레트 (어두운 배경에서 확 튀는 밝고 화사한 네온/파스텔 톤으로 조정)
    const colorPalette = [
      new THREE.Color('#7ef5c0'), // 밝은 형광 민트 그린
      new THREE.Color('#4ef29f'), // 비브란트 그린
      new THREE.Color('#82c3ff'), // 스카이 블루
      new THREE.Color('#a4ffdd'), // 아쿠아 파스텔 그린
      new THREE.Color('#3ce1ff'), // 네온 사이언 블루
      new THREE.Color('#b5d6ff'), // 아주 연한 파스텔 블루
    ];

    // 1. 바닥에 데이터/풀 조각들 뿌려놓기 (레퍼런스 사이트 스타일로 공간 채우기)
    const scatterCount = 150;
    const scatterGeometry = new THREE.BufferGeometry();
    const scatterPositions = new Float32Array(scatterCount * 3);
    const scatterColors = new Float32Array(scatterCount * 3);
    
    for (let i = 0; i < scatterCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.8 + Math.random() * 8.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      scatterPositions[i * 3] = x;
      scatterPositions[i * 3 + 1] = 0.01; // 바닥 격자보다 약간 위
      scatterPositions[i * 3 + 2] = z;
      
      const col = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      scatterColors[i * 3] = col.r;
      scatterColors[i * 3 + 1] = col.g;
      scatterColors[i * 3 + 2] = col.b;
    }
    scatterGeometry.setAttribute('position', new THREE.BufferAttribute(scatterPositions, 3));
    scatterGeometry.setAttribute('color', new THREE.Float32BufferAttribute(scatterColors, 3));
    
    const scatterMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const scatterPoints = new THREE.Points(scatterGeometry, scatterMaterial);
    worldGroup.add(scatterPoints);

    // 2. 홈화면(DigitalTree)과 유사한 평면 재귀 트리 생성 및 배치
    const treeCount = 8 + Math.floor(Math.random() * 4); // 8~11그루
    const maxLevel = 9; // 재귀 깊이 9단계로 매우 풍성하게 설정 (2^9 = 512개의 가지)
    const treesData: {
      branches: Branch[];
      line: THREE.LineSegments;
      treeColor: THREE.Color;
      posX: number;
      posZ: number;
    }[] = [];

    for (let i = 0; i < treeCount; i++) {
      const branches: Branch[] = [];
      const startPos = new THREE.Vector3(0, 0, 0);
      
      // 높이 스케일 약 1.6~2.3으로 크기 조율
      const trunkLength = 1.5 + Math.random() * 0.7;
      // 나무마다 조금씩 다른 분기각 적용 (24도 ~ 36도)
      const theta = ((24 + Math.random() * 12) * Math.PI) / 180;
      
      // 나무마다 무작위 흔들림 위상차 및 변형률 결정
      const phaseOffset = Math.random() * Math.PI * 2;
      const lengthVar = 0.9 + Math.random() * 0.2;
      const angleVar = 0.05 + Math.random() * 0.05;

      // 재귀 기하학 트리 생성
      generate2DRecursiveTree(
        startPos, 
        0, 
        trunkLength, 
        0, 
        maxLevel, 
        branches, 
        theta, 
        phaseOffset,
        lengthVar,
        angleVar
      );

      // 격자 바닥면에 나무 랜덤 분산 배치
      const angle = (i / treeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const radius = 2.8 + Math.random() * 4.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 1.5,
      });

      const geometry = new THREE.BufferGeometry();
      const lineMesh = new THREE.LineSegments(geometry, lineMaterial);
      lineMesh.position.set(x, 0, z);
      worldGroup.add(lineMesh);

      treesData.push({
        branches,
        line: lineMesh,
        treeColor: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        posX: x,
        posZ: z,
      });
    }

    // 3. 공중 유영 파티클/빛망울 (Glowing Particles)
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 500;
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 28;
      pPositions[i * 3 + 1] = Math.random() * 10;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    
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

    // 4. 공중 단어 스프라이트 배치
    const wordSprites: THREE.Sprite[] = [];
    const wordGroup = new THREE.Group();
    
    words.forEach((word, index) => {
      const isGreen = index % 2 === 0;
      const sprite = createWordBadgeSprite(word, isGreen);

      const angle = (index / Math.max(1, words.length)) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 3.5 + Math.random() * 3.0;
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

      wordSprites.push(sprite);
      wordGroup.add(sprite);
    });
    worldGroup.add(wordGroup);

    // 클릭 감지용 Raycaster
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(wordSprites, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const obj = hit.object;

        const tempV = new THREE.Vector3();
        obj.getWorldPosition(tempV);
        tempV.project(camera);

        const px = (tempV.x * 0.5 + 0.5) * rect.width;
        const py = (-(tempV.y * 0.5) + 0.5) * rect.height;

        setSelectedWord({
          label: obj.userData.label,
          x: px,
          y: py - 42,
        });
      } else {
        setSelectedWord(null);
      }
    };

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = performance.now() * 0.001;
      const curProgress = progressRef.current;

      // 1. 나무 기하학 빌드 및 실시간 바람 변동 & 빌보딩 연산
      treesData.forEach((tree) => {
        const points: THREE.Vector3[] = [];
        const colors: number[] = [];
        
        buildTreeGeometry(
          tree.branches,
          curProgress,
          maxLevel,
          points,
          colors,
          tree.treeColor,
          time
        );

        if (points.length > 0) {
          tree.line.geometry.setFromPoints(points);
          tree.line.geometry.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(colors, 3)
          );
          tree.line.geometry.computeBoundingSphere();
        }

        // Y축 빌보딩 (Y-axis Billboarding): 카메라를 아무리 돌려도 나무 면이 정면을 보게 유지
        // 나무의 로컬 방향벡터를 월드 카메라가 위치한 가로 방향에 정합하도록 Y축 회전값 설정
        const diffX = camera.position.x - tree.posX;
        const diffZ = camera.position.z - tree.posZ;
        tree.line.rotation.y = Math.atan2(diffX, diffZ);
      });

      // 2. 파티클 유영 및 회전
      particles.rotation.y = time * 0.008;
      particles.rotation.x = Math.sin(time * 0.1) * 0.015;

      // 3. 단어 노드 표류 모션
      wordSprites.forEach((sprite) => {
        const phase = sprite.userData.phase || 0;
        const baseY = sprite.userData.baseY || 1.5;
        const speed = sprite.userData.speed || 1;
        sprite.position.y = baseY + Math.sin(time * speed + phase) * 0.18;
      });

      controls.update();

      // 4. 선택된 뱃지 팝업 실시간 픽셀 매칭
      if (selectedWord) {
        const selectedSprite = wordSprites.find(s => s.userData.label === selectedWord.label);
        if (selectedSprite) {
          const rect = renderer.domElement.getBoundingClientRect();
          const tempV = new THREE.Vector3();
          selectedSprite.getWorldPosition(tempV);
          tempV.project(camera);
          const px = (tempV.x * 0.5 + 0.5) * rect.width;
          const py = (-(tempV.y * 0.5) + 0.5) * rect.height;
          
          setSelectedWord(prev => prev ? {
            ...prev,
            x: px,
            y: py - 42
          } : null);
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
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', resize);
      controls.dispose();
      renderer.dispose();
      mount.replaceChildren();
    };
  }, [words, selectedWord?.label]);

  return (
    <div className="focus-world" ref={mountRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 3D 카메라 힌트 */}
      <div className="focus-world-readout">
        <span>orbit / pan / zoom</span>
        <span>trees {Math.round(progress * 100)}%</span>
      </div>

      {/* 노드 바로 위에 뜨는 깔끔한 뱃지/말풍선 스타일 카드 팝업 */}
      {selectedWord && (
        <div
          className="word-node-popover"
          style={{
            position: 'absolute',
            left: `${selectedWord.x}px`,
            top: `${selectedWord.y}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'auto',
          }}
        >
          <div className="popover-arrow"></div>
          <div className="popover-content">
            <small>distraction note</small>
            <h3>{selectedWord.label}</h3>
            <p>released during setup</p>
            <button className="popover-close-btn" onClick={() => setSelectedWord(null)}>
              close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FocusWorld;
