import { useEffect, useRef, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

// Generate Koch Snowflake fractal path
function getKochPoints(a: Point, b: Point, depth: number): Point[] {
  if (depth === 0) {
    return [a];
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  
  const c = { x: a.x + dx / 3, y: a.y + dy / 3 };
  const e = { x: a.x + (2 * dx) / 3, y: a.y + (2 * dy) / 3 };
  
  // Rotate 60 degrees outwards (-60 in standard coords)
  const angle = -Math.PI / 3;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const d = {
    x: c.x + (e.x - c.x) * cos - (e.y - c.y) * sin,
    y: c.y + (e.x - c.x) * sin + (e.y - c.y) * cos,
  };
  
  return [
    ...getKochPoints(a, c, depth - 1),
    ...getKochPoints(c, d, depth - 1),
    ...getKochPoints(d, e, depth - 1),
    ...getKochPoints(e, b, depth - 1),
  ];
}

function generateSnowflakePath(size: number, depth: number): string {
  const center = size / 2;
  const r = size * 0.42; // slightly smaller to avoid clipping edges
  
  // 3 vertices of the base equilateral triangle
  const p1 = {
    x: center + r * Math.cos(-Math.PI / 2),
    y: center + r * Math.sin(-Math.PI / 2),
  };
  const p2 = {
    x: center + r * Math.cos(-Math.PI / 2 + (2 * Math.PI) / 3),
    y: center + r * Math.sin(-Math.PI / 2 + (2 * Math.PI) / 3),
  };
  const p3 = {
    x: center + r * Math.cos(-Math.PI / 2 + (4 * Math.PI) / 3),
    y: center + r * Math.sin(-Math.PI / 2 + (4 * Math.PI) / 3),
  };
  
  const points = [
    ...getKochPoints(p1, p2, depth),
    ...getKochPoints(p2, p3, depth),
    ...getKochPoints(p3, p1, depth),
  ];
  
  return 'M ' + points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L ') + ' Z';
}

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  
  // Mouse position state (with lerp for smooth cursor movement)
  const mousePos = useRef({ x: 0, y: 0 });
  const cursorPos = useRef({ x: 0, y: 0 });

  // Generate fractal path once
  const size = 36;
  const fractalPath = generateSnowflakePath(size, 2); // Depth 2 Koch Snowflake

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = () => {
      setIsClicking(true);
    };

    const handleMouseUp = () => {
      setIsClicking(false);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.style.cursor === 'pointer'
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseover', handleMouseOver);

    let animationFrameId: number;

    const updatePosition = () => {
      const dx = mousePos.current.x - cursorPos.current.x;
      const dy = mousePos.current.y - cursorPos.current.y;
      cursorPos.current.x += dx * 0.25;
      cursorPos.current.y += dy * 0.25;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cursorPos.current.x}px, ${cursorPos.current.y}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(updatePosition);
    };

    animationFrameId = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseover', handleMouseOver);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className={`custom-star-cursor ${isHovered ? 'is-hovered' : ''} ${isClicking ? 'is-clicking' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${size}px`,
        height: `${size}px`,
        marginLeft: `-${size / 2}px`,
        marginTop: `-${size / 2}px`,
        pointerEvents: 'none',
        zIndex: 10000,
        transition: 'width 0.2s, height 0.2s, margin-left 0.2s, margin-top 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        <path
          d={fractalPath}
          stroke="#151515"
          strokeWidth="1.2"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
