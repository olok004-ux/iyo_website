import { useEffect, useRef } from 'react';

function DigitalTree() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0.5 }); // 마우스 기본 가로 위치 (0 ~ 1)

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Processing의 branch 재귀함수를 Canvas 2D 행렬 변환으로 1:1 대응하여 구현
    // 흔들림 변동 함수(바람 및 시간)를 적용하기 위해 time 매개변수를 추가적으로 사용
    const branch = (h: number, theta: number, time: number, depth: number) => {
      // 나뭇가지가 짧아지면 재귀 탈출
      h *= 0.66;

      if (h > 3) {
        // 미세 바람 흔들림 변동 함수 계산 (가지가 얇고 높을수록 더 많이 흔들림)
        const windSway = Math.sin(time * 2.2 + depth * 0.4) * 0.02 * (depth + 1);

        // 오른쪽 가지치기
        ctx.save();
        ctx.rotate(theta + windSway);
        ctx.lineWidth = 1.5; // 모든 나뭇가지의 두께를 균일하게 1.5px로 고정
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -h);
        ctx.stroke();

        ctx.translate(0, -h);
        branch(h, theta, time, depth + 1);
        ctx.restore();

        // 왼쪽 가지치기
        ctx.save();
        ctx.rotate(-theta + windSway);
        ctx.lineWidth = 1.5; // 모든 나뭇가지의 두께를 균일하게 1.5px로 고정
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -h);
        ctx.stroke();

        ctx.translate(0, -h);
        branch(h, theta, time, depth + 1);
        ctx.restore();
      }
    };

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const time = performance.now() * 0.001;

      // 캔버스 초기화
      ctx.clearRect(0, 0, width, height);

      // 드로잉 스타일 지정 (살짝 짙은 초록색 느낌, 둥글지 않은 끝 모양)
      ctx.strokeStyle = '#142a1f';
      ctx.lineCap = 'butt';

      // 마우스 위치에 기초하여 분기 각도(0도 ~ 90도) 계산 및 라디안 변환
      const angle = pointerRef.current.x * 90;
      const theta = (angle * Math.PI) / 180;

      ctx.save();
      // 나무가 시작될 아래쪽 중앙 좌표로 평행 이동
      ctx.translate(width / 2, height * 0.92);

      // 첫 번째 메인 기둥(Trunk) 그리기 - 곁가지들과 일관되게 1.5px 두께로 고정
      const initH = Math.min(height * 0.28, 140);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -initH);
      ctx.stroke();

      // 기둥 끝으로 이동 후 재귀 호출 시작 (흔들림을 위한 time 및 depth=0 주입)
      ctx.translate(0, -initH);
      branch(initH, theta, time, 0);

      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      className="digital-tree-wrap"
      role="img"
      aria-label="Recursive Fractal Tree speculation"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        // 마우스의 가로 비율 좌표 (0 ~ 1)
        const xRatio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        pointerRef.current = { x: xRatio };
      }}
    >
      <canvas ref={canvasRef} aria-label="Interactive recursive tree" />
    </div>
  );
}

export default DigitalTree;
