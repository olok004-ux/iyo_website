import { useEffect, useMemo, useState } from 'react';

type RewardRecord = {
  id: string;
  minutes: number;
  seed: number;
  energy: number;
  words: string[];
  music: string;
  createdAt: string;
};

const fallbackArchive: RewardRecord[] = Array.from({ length: 8 }, (_, index) => ({
  id: `fallback-${index}`,
  minutes: 12 + index,
  seed: 2 + (index % 4),
  energy: 40 + index * 7,
  words: ['scroll', 'reply', 'feed'].slice(0, 1 + (index % 3)),
  music: 'silence',
  createdAt: new Date(2026, 5, 13, 12, index).toISOString(),
}));

function formatArchiveDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '0613';
  return `${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function BotanicalStill({ item, index }: { item: RewardRecord; index: number }) {
  const stems = useMemo(() => {
    const count = 10 + (item.seed % 5) + (index % 3);
    return Array.from({ length: count }, (_, stemIndex) => {
      const x = 32 + stemIndex * (136 / Math.max(1, count - 1));
      const h = 34 + ((stemIndex * 13 + item.minutes + index) % 58);
      const bend = ((stemIndex % 5) - 2) * 8;
      return { x, h, bend };
    });
  }, [index, item.minutes, item.seed]);

  return (
    <svg className="archive-still-svg" viewBox="0 0 220 120" role="img" aria-label="Saved botanical focus still">
      <g className="still-ghost-blocks">
        {Array.from({ length: 9 }).map((_, blockIndex) => (
          <rect
            key={blockIndex}
            x={28 + blockIndex * 18}
            y={74 - (blockIndex % 4) * 10}
            width={18 + (blockIndex % 3) * 10}
            height={32 + (blockIndex % 4) * 10}
          />
        ))}
      </g>
      <g className="still-plant">
        {stems.map((stem, stemIndex) => {
          const baseX = stem.x;
          const baseY = 104;
          const endX = baseX + stem.bend;
          const endY = baseY - stem.h;
          return (
            <g key={stemIndex}>
              <path d={`M${baseX} ${baseY} Q${baseX + stem.bend * 0.45} ${baseY - stem.h * 0.52} ${endX} ${endY}`} />
              {stemIndex % 3 === 0 && (
                <circle cx={endX} cy={endY} r="1.8" />
              )}
            </g>
          );
        })}
        <path className="still-ground" d="M22 104 L198 104" />
      </g>
      <g className="still-data-dots">
        {Array.from({ length: item.words.length * 7 + 6 }).map((_, dotIndex) => (
          <circle
            key={dotIndex}
            cx={36 + ((dotIndex * 29) % 148)}
            cy={72 + Math.sin(dotIndex * 1.6 + index) * 18}
            r={dotIndex % 5 === 0 ? 1.3 : 0.8}
          />
        ))}
      </g>
    </svg>
  );
}

function SpaceArchive() {
  const [rewards, setRewards] = useState<RewardRecord[]>([]);

  useEffect(() => {
    setRewards(JSON.parse(localStorage.getItem('focus-space-rewards') || '[]') as RewardRecord[]);
  }, []);

  const items = rewards.length > 0 ? rewards : fallbackArchive;

  return (
    <div className="archive-gallery">
      <div className="archive-grid">
        {items.slice(0, 12).map((item, index) => (
          <article className="archive-thumb" key={item.id}>
            <time>{formatArchiveDate(item.createdAt)}</time>
            <BotanicalStill item={item} index={index} />
          </article>
        ))}
      </div>
    </div>
  );
}

export default SpaceArchive;
