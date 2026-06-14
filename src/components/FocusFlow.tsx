import { FormEvent, useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import FocusWorld, { FocusWorldRef } from './FocusWorld';

type FocusStage = 'remove' | 'time' | 'focus' | 'reward';
type WordNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  angle: number;
  isReleased: boolean;
};

type RewardRecord = {
  id: string;
  minutes: number;
  seed: number;
  energy: number;
  words: string[];
  music: string;
  createdAt: string;
  screenshot?: string; // 3D 캡처 이미지 데이터 (DataURL) 추가
};

const musicOptions = ['ambient', 'rain', 'noise', 'silence'];

// 한글 및 다국어 폰트의 물리 크기와 자폭을 감안한 너비 계산 헬퍼 함수
function getEstimatedWordWidth(text: string): number {
  let estimatedLength = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 127) {
      estimatedLength += 13.5; // 한글/유니코드 등 넓은 문자
    } else {
      estimatedLength += 7.2;  // 영문/숫자/특수문자
    }
  }
  return Math.max(72, Math.ceil(estimatedLength + 28));
}

// 정적 프랙탈 나무의 노드 위치들을 얻기 위한 함수 (중앙 고정용)
type NodePosition = { x: number; y: number; angle: number };
function getFractalNodePositions(width: number, height: number): NodePosition[] {
  const positions: NodePosition[] = [];
  const startX = width / 2;
  const startY = height * 0.86 + 100; // 나무 위치를 기존보다 100px 아래로 이동
  const initH = Math.min(height * 0.30, 180);

  // 재귀적으로 탐색하며 가지 끝점 및 주요 마디 좌표 보관
  const findNodes = (x: number, y: number, h: number, angle: number, depth: number) => {
    const endX = x + Math.cos(angle) * h;
    const endY = y + Math.sin(angle) * h;

    // 나뭇가지의 끝자락(깊이 3단계 이상)에만 열매를 맺도록 한정
    if (depth >= 3) {
      positions.push({ x: endX, y: endY, angle });
    }

    const nextH = h * 0.67;
    if (nextH > 6 && depth < 6) { // 가지 깊이를 6단계로 확장하여 더 무성하게
      const spread = Math.PI * 0.22;
      findNodes(endX, endY, nextH, angle + spread, depth + 1);
      findNodes(endX, endY, nextH, angle - spread, depth + 1);
    }
  };

  // 줄기 꼭대기에서부터 가지 탐색 시작
  findNodes(startX, startY - initH, initH * 0.8, -Math.PI / 2, 0);

  // 나무 상단(Y 값이 작은 순서)부터 차례대로 나뭇가지 끝에 열매를 맺게 정렬
  return positions.sort((a, b) => a.y - b.y); 
}



function FocusFlow({ cameraOn, onSendToSpace }: { cameraOn: boolean; onSendToSpace: () => void }) {
  void cameraOn;
  const [stage, setStage] = useState<FocusStage>('remove');
  const [input, setInput] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [nodes, setNodes] = useState<WordNode[]>([]);
  const [minutes, setMinutes] = useState(25);
  const [focusTask, setFocusTask] = useState('');
  const [music, setMusic] = useState('ambient');
  const [progress, setProgress] = useState(0);
  const [reward, setReward] = useState<RewardRecord | null>(null);
  const [isReleased, setIsReleased] = useState(false);

  const sceneRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const bodiesRef = useRef<Map<string, Matter.Body>>(new Map());
  const labelMapRef = useRef<Map<string, string>>(new Map());
  const focusWorldRef = useRef<FocusWorldRef | null>(null);

  // Matter.js 엔진 초기화 (remove 스테이지)
  useEffect(() => {
    if (stage !== 'remove' || !sceneRef.current) return;
    const root = sceneRef.current;
    const width = root.clientWidth;
    const height = root.clientHeight;

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0.82 } });
    const runner = Matter.Runner.create();
    engineRef.current = engine;
    runnerRef.current = runner;

    // 바닥 장벽 및 양쪽 보이지 않는 기둥들 (낙하한 열매를 받쳐줌)
    const walls = [
      Matter.Bodies.rectangle(width / 2, height - 12, width * 0.9, 10, { isStatic: true, friction: 0.1 }),
      Matter.Bodies.rectangle(width * 0.05, height / 2, 10, height, { isStatic: true }),
      Matter.Bodies.rectangle(width * 0.95, height / 2, 10, height, { isStatic: true }),
    ];
    Matter.Composite.add(engine.world, walls);

    const bodyMap = new Map<string, Matter.Body>();
    bodiesRef.current = bodyMap;

    let frame = 0;
    let logTick = 0;
    const sync = () => {
      // 매 프레임마다 물리 엔진을 수동으로 업데이트하여 안정적인 움직임 보장
      Matter.Engine.update(engine, 16.666);

      logTick++;
      const next: WordNode[] = [];
      bodyMap.forEach((body, id) => {
        const label = labelMapRef.current.get(id) || '';
        next.push({
          id,
          label,
          x: body.position.x,
          y: body.position.y,
          angle: body.angle,
          isReleased: !body.isStatic,
        });
        if (logTick % 60 === 0) {
          console.log(`Sync tick: body ${id} (${label}) position = (${body.position.x}, ${body.position.y}), isStatic = ${body.isStatic}`);
        }
      });
      setNodes(next);
      frame = requestAnimationFrame(sync);
    };

    Matter.Runner.run(runner, engine);
    sync();

    return () => {
      cancelAnimationFrame(frame);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      engineRef.current = null;
      runnerRef.current = null;
      bodiesRef.current.clear();
      labelMapRef.current.clear();
    };
  }, [stage]);

  // Focus 타이머 진행
  useEffect(() => {
    if (stage !== 'focus') return;
    setProgress(0);
    const totalTicks = 20; // 개발 검증을 위해 20초로 단축 설정
    const interval = window.setInterval(() => {
      setProgress((value) => {
        const next = Math.min(1, value + 1 / totalTicks);
        if (next >= 1) {
          window.clearInterval(interval);
          const record: RewardRecord = {
            id: crypto.randomUUID(),
            minutes,
            seed: Math.max(1, words.length),
            energy: minutes * 4 + words.length * 3,
            words,
            music,
            createdAt: new Date().toISOString(),
          };
          setReward(record);
          setStage('reward');
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [minutes, music, stage, words]);

  // 방해어 열매 맺기 (정적 나무 노드에 매달기)
  const addWord = (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || isReleased) return;

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const engine = engineRef.current;
    const root = sceneRef.current;

    if (engine && root) {
      const width = root.clientWidth;
      const height = root.clientHeight;

      // 정적 나뭇가지 끝점 노드 좌표 리스트 구하기
      const positions = getFractalNodePositions(width, height);

      // 이미 단어가 배치된 위치와 가까운 좌표를 제외하여 겹침 방증
      const occupiedCoords = Array.from(bodiesRef.current.values()).map(b => ({ x: b.position.x, y: b.position.y + 12 }));
      const freePositions = positions.filter(pos => {
        return !occupiedCoords.some(occupied => {
          const dx = occupied.x - pos.x;
          const dy = occupied.y - pos.y;
          return Math.sqrt(dx * dx + dy * dy) < 20;
        });
      });

      // 남은 빈 자리가 있으면 그 중에서 랜덤 선택, 없으면 전체 중 랜덤 선택
      const candidateList = freePositions.length > 0 ? freePositions : positions;
      const chosenPos = candidateList[Math.floor(Math.random() * candidateList.length)] || {
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height * 0.45 + (Math.random() - 0.5) * 150,
        angle: 0,
      };

      // 완전히 같은 좌표에 겹쳐 쌓이지 않도록 미세한 개별 랜덤 오프셋 부여
      const targetPos = {
        x: chosenPos.x + (Math.random() - 0.5) * 30,
        y: chosenPos.y + (Math.random() - 0.5) * 15,
        angle: chosenPos.angle,
      };

      const wordWidth = getEstimatedWordWidth(value);
      const body = Matter.Bodies.rectangle(
        targetPos.x,
        targetPos.y - 12, // 가지 위에 얹혀지도록 살짝 조정
        wordWidth,
        28,
        {
          friction: 0.2,
          restitution: 0.15,
        },
      );
      // 생성 후에 정적으로 만들어 줌함으로써, 나중에 setStatic(body, false) 호출 시 질량(mass)과 관성(inertia) 정보가 NaN이 되지 않고 정상 복구되도록 합니다.
      Matter.Body.setStatic(body, true);
 
      bodiesRef.current.set(id, body);
      labelMapRef.current.set(id, value);
      Matter.Composite.add(engine.world, body);
    }

    setWords((current) => [...current, value]);
    setInput('');
  };

  // 릴리즈 클릭 시 물리 고정을 풀어 아래로 떨어뜨림
  const releaseDistractions = () => {
    if (words.length === 0 || isReleased) return;

    console.log("Release triggered! Total bodies:", bodiesRef.current.size);
    setIsReleased(true);
    bodiesRef.current.forEach((body, id) => {
      console.log(`Body ${id} before release: isStatic = ${body.isStatic}, position = (${body.position.x}, ${body.position.y})`);
      // isStatic 해제하여 물리 중력 받게 함
      Matter.Body.setStatic(body, false);
      // 살짝 통통 튀어 떨어지는 느낌을 위해 미세한 임펄스 힘 추가
      Matter.Body.applyForce(body, body.position, {
        x: (Math.random() - 0.5) * 0.005,
        y: -0.003,
      });
      console.log(`Body ${id} after release: isStatic = ${body.isStatic}, position = (${body.position.x}, ${body.position.y})`);
    });

    // 1.8초간 떨어지는 화려한 물리 모션을 보며 마음을 덜어낸 뒤 다음 스테이지로 자연스럽게 이동
    setTimeout(() => {
      setStage('time');
    }, 1800);
  };

  const saveReward = () => {
    if (!reward) return;
    
    // 현재 포커스 화면의 3D 숲 스크린샷 캡처
    let finalScreenshot = '';
    if (focusWorldRef.current) {
      finalScreenshot = focusWorldRef.current.capture() || '';
    }

    const recordWithScreenshot: RewardRecord = {
      ...reward,
      screenshot: finalScreenshot,
    };

    const saved = JSON.parse(localStorage.getItem('focus-space-rewards') || '[]') as RewardRecord[];
    localStorage.setItem('focus-space-rewards', JSON.stringify([recordWithScreenshot, ...saved].slice(0, 24)));
    onSendToSpace();
  };

  // 정적 프랙탈 나무 모양 가이드라인 렌더러 (Canvas2D)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (stage !== 'remove' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const drawTree = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // 연한 짙은 녹색 선으로 뒷단에 프랙탈 나무 데코레이션 렌더링
      ctx.strokeStyle = 'rgba(176, 245, 211, 0.7)';
      ctx.lineWidth = 1.0;
      ctx.lineCap = 'butt';


      const branch = (x: number, y: number, len: number, angle: number, depth: number) => {
        const endX = x + Math.cos(angle) * len;
        const endY = y + Math.sin(angle) * len;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const nextLen = len * 0.67;
        if (nextLen > 6 && depth < 6) { // 가지 깊이 6단계로 확장
          const spread = Math.PI * 0.22;
          branch(endX, endY, nextLen, angle + spread, depth + 1);
          branch(endX, endY, nextLen, angle - spread, depth + 1);
        }
      };

      const startX = w / 2;
      const startY = h * 0.86 + 100; // 나무 위치를 기존보다 100px 아래로 이동
      const initH = Math.min(h * 0.30, 180); // 두 배 정도 크기로 키움


      // 메인 밑동 그리기
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX, startY - initH);
      ctx.stroke();

      // 재귀 브랜칭
      branch(startX, startY - initH, initH * 0.8, -Math.PI / 2, 0);
    };

    drawTree();
  }, [stage]);

  return (
    <div className={`focus-flow focus-${stage}`}>
      {/* 3D FocusWorld를 최상단 렌더 배경 레이어로 배치하여 끊김 현상 해결 */}
      <div className="focus-world-background-container">
        <FocusWorld 
          ref={focusWorldRef}
          progress={stage === 'focus' ? progress : stage === 'reward' ? 1 : 0} 
          words={words} 
        />
      </div>

      {stage === 'remove' && (
        <div className="remove-stage">
          <div className="remove-head-desc">
            type what pulls your attention away.<br />
            release it, and return to your space.
          </div>

          <form className="word-form" onSubmit={addWord}>
            <input
              aria-label="Distraction"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="+ type distraction"
              disabled={isReleased}
            />
            <button type="submit" disabled={isReleased}>add</button>
          </form>

          {/* 물리 엔진 구동 필드 & 프랙탈 데코레이션 */}
          <div className="physics-field-container">
            <canvas ref={canvasRef} className="tree-bg-canvas" />
            <div className="physics-field" ref={sceneRef}>
              {nodes.map((node) => (
                <div
                  className={`word-node ${node.isReleased ? 'is-released' : ''}`}
                  key={node.id}
                  style={{
                    transform: `translate(calc(${node.x}px - 50%), calc(${node.y}px - 50%)) rotate(${node.angle}rad)`,
                    width: getEstimatedWordWidth(node.label),
                  }}
                >
                  {node.label}
                </div>
              ))}
            </div>
          </div>

          {/* 릴리즈 트리거 버튼 박스 */}
          <div className="release-action-wrap">
            <button 
              className={`release-ritual-button ${isReleased ? 'is-clicked' : ''}`} 
              type="button" 
              onClick={releaseDistractions}
              disabled={words.length === 0 || isReleased}
            >
              release
            </button>
            <div className="release-desc-text">let go of distractions and breathe</div>
          </div>

        </div>
      )}

      {stage === 'time' && (
        <div className="time-stage">
          <div className="timer-header-row">
            <span>set time</span>
          </div>

          <div className="timer-display-row">
            <button className="circular-btn pause-btn" type="button">
              {/* Pause Icon */}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <rect x="6" y="4" width="3" height="16" rx="0.5" />
                <rect x="15" y="4" width="3" height="16" rx="0.5" />
              </svg>
            </button>
            <div className="timer-numbers">{minutes.toString().padStart(2, '0')}:00</div>
            <button className="circular-btn reset-btn" type="button" onClick={() => setMinutes(25)}>
              {/* Reset/Rotate Icon */}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>

          <div className="task-input-row">
            <input
              type="text"
              placeholder="select task to focus on"
              className="task-focus-input"
              value={focusTask}
              onChange={(event) => setFocusTask(event.target.value)}
            />
            <span className="task-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
          </div>

          <div className="preset-time-section">
            <div className="preset-label">preset time</div>
            <div className="preset-options">
              {[15, 25, 45, 60].map((t) => (
                <label key={t} className="preset-option-label">
                  <input
                    type="radio"
                    name="preset-time"
                    checked={minutes === t}
                    onChange={() => setMinutes(t)}
                  />
                  <span className="custom-radio"></span>
                  <span className="preset-text">{t} min</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bottom-arrow-row">↓</div>

          <button className="start-focus-btn" type="button" onClick={() => setStage('focus')}>
            start focus
          </button>
        </div>
      )}

      {stage === 'focus' && (
        <div className="focus-stage">
          {focusTask.trim() && (
            <div className="floating-focus-task">
              {focusTask.trim()}
            </div>
          )}
          <div className="music-row">
            {musicOptions.map((option) => (
              <button
                type="button"
                className={music === option ? 'is-active' : ''}
                onClick={() => setMusic(option)}
                key={option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'reward' && reward && (
        <>
          {focusTask.trim() && (
            <div className="floating-focus-task">
              {focusTask.trim()}
            </div>
          )}
          <div className="reward-stage">
            <div className="reward-copy">
              <h3>focus session complete</h3>
              <p>+ {reward.seed} seed</p>
              <p>+ {reward.energy} focus energy</p>
            </div>
            <div className="reward-actions">
              <button className="ritual-button capture-btn" type="button" onClick={() => {
                if (focusWorldRef.current) {
                  const dataUrl = focusWorldRef.current.capture();
                  if (dataUrl) {
                    const link = document.createElement('a');
                    link.download = `iyo-focus-forest-${Date.now()}.png`;
                    link.href = dataUrl;
                    link.click();
                  }
                }
              }}>
                save screenshot
              </button>
              <button className="ritual-button" type="button" onClick={saveReward}>
                send to space
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default FocusFlow;
