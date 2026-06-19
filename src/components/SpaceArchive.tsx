import { useEffect, useRef, useState } from 'react';

type RewardRecord = {
  id: string;
  minutes: number;
  seed: number;
  energy: number;
  words: string[];
  music: string;
  createdAt: string;
  screenshot?: string; // 3D 캡처 이미지 데이터 (DataURL)
  journalTitle?: string; // 저널 제목
  journalContent?: string; // 저널 내용
  journalTags?: string[]; // 저널 커스텀 태그
};

const fallbackArchive: RewardRecord[] = Array.from({ length: 3 }, (_, index) => ({
  id: `fallback-${index}`,
  minutes: index === 0 ? 25 : index === 1 ? 45 : 15,
  seed: index === 0 ? 1 : index === 1 ? 2 : 3,
  energy: index === 0 ? 51 : index === 1 ? 78 : 32,
  words: index === 0 ? ['visual', 'trace'] : index === 1 ? ['data', 'pattern'] : ['focus', 'forest'],
  music: 'silence',
  createdAt: new Date(2026, 5, 14, 12, index).toISOString(),
  journalTitle: index === 0 ? '프로젝트: P5.js 기반 타이포그래피 콜라주 제너레이터 개발' : index === 1 ? '시그널 패턴 분석 및 데이터 시각화 보정' : '3D 식물형 알고리즘 최적화 연구',
  journalContent: index === 0 ? `목표:
입력한 텍스트를 음절 또는 단어 단위로 쪼개어, 각각 가변적인 배경 박스와 함께 캔버스에 배치하는 예술적인 비주얼 제너레이터를 제작한다. 결과물은 현대적인 타이포그래피 포스터 느낌을 주어야 한다.

주요 기능 요구사항:
1. 텍스트 처리 및 분할 로직:
- 입력된 텍스트를 '음절(Syllable)' 또는 '단어(Word)' 단위로 분리하는 스위치 기능을 구현할 것.
- 한국어 음절 분리가 정확하게 이루어져야 함 (예: '사과' -> ['사', '과']).

2. 비주얼 유닛(Unit) 설계:
- 각 유닛은 배경 도형과 텍스트 레이어로 구성됨.
- 도형 종류: 직사각형, 별, 삼각형 및 랜덤 혼합 모드 지원.
- 가변 박스: 텍스트의 길이나 폰트 크기에 따라 박스 크기가 유동적으로 변하며, 사용자 정의 패딩(Padding)이 적용되어야 함.
- 변형(Transformation): 유닛 간의 '오버랩(겹침)' 정도와 개별 회전 각도(-N ~ +N도)를 조절하는 슬라이더` : '기본 분석 데이터 패턴 로그.',
  journalTags: ['고래', 'p5js', 'typography'],
}));

function formatArchiveDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '0614';
  return `${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function formatFullDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '2026 — 06 — 14';
  return `${date.getFullYear()} — ${String(date.getMonth() + 1).padStart(2, '0')} — ${String(date.getDate()).padStart(2, '0')}`;
}

function SpaceArchive() {
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [pressingId, setPressingId] = useState<string | null>(null);
  const pressTimerRef = useRef<any>(null);

  // 저널 상세 에디터 상태
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('focus-space-rewards');
    if (saved) {
      setRewards(JSON.parse(saved) as RewardRecord[]);
    }
  }, []);

  const items = rewards.length > 0 ? rewards : fallbackArchive;

  // 특정 카드 선택 시 에디터 로드
  const handleSelectCard = (item: RewardRecord) => {
    setSelectedId(item.id);
    setEditTitle(item.journalTitle || '');
    setEditContent(item.journalContent || '');
    setEditTags(item.journalTags || []);
    setIsSaved(true);
  };

  const startPress = (id: string) => {
    setPressingId(id);
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      handleDelete(id);
      setPressingId(null);
    }, 800);
  };

  const endPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressingId(null);
  };

  const handleDelete = (id: string) => {
    const isConfirm = window.confirm("이 아카이브 기록을 삭제하시겠습니까?");
    if (isConfirm) {
      const nextSaved = items.filter(item => item.id !== id);
      localStorage.setItem('focus-space-rewards', JSON.stringify(nextSaved));
      setRewards(nextSaved);
      if (selectedId === id) {
        setSelectedId(null);
      }
    }
  };

  // 저널 데이터 저장
  const handleSaveJournal = () => {
    if (!selectedId) return;
    const updated = items.map((item) => {
      if (item.id === selectedId) {
        return {
          ...item,
          journalTitle: editTitle,
          journalContent: editContent,
          journalTags: editTags,
        };
      }
      return item;
    });

    localStorage.setItem('focus-space-rewards', JSON.stringify(updated));
    setRewards(updated);
    setIsSaved(true);
  };

  // 저널을 텍스트 파일로 내보내기 (Export 기능)
  const handleExportJournal = () => {
    if (!selectedId) return;
    const selectedItem = items.find(item => item.id === selectedId);
    if (!selectedItem) return;

    const fileContent = `[Focus Archive Journal Entry]
Date: ${formatFullDate(selectedItem.createdAt)}
Title: ${editTitle || 'Untitled'}
Tags: ${editTags.join(', ')}
--------------------------------------------------
${editContent || 'No content written.'}
`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `focus-journal-${formatArchiveDate(selectedItem.createdAt)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 태그 추가
  const handleAddTag = () => {
    const tag = window.prompt("추가할 태그명을 입력하세요:");
    if (tag && tag.trim()) {
      const cleanTag = tag.trim().replace(/^#/, '');
      if (!editTags.includes(cleanTag)) {
        setEditTags([...editTags, cleanTag]);
        setIsSaved(false);
      }
    }
  };

  // 태그 삭제
  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(t => t !== tagToRemove));
    setIsSaved(false);
  };

  const isSplitView = false;
  const currentSelectedItem = items.find(item => item.id === selectedId);

  return (
    <div className={`archive-gallery ${isSplitView ? 'split-view-active' : ''}`}>
      {/* Space 아카이브 상단 컨트롤 바 (분할 뷰가 아닐 때만 렌더링) */}
      {!isSplitView && (
        <div className="space-header">
          <div className="space-title-group">
            <h1>space</h1>
            <p className="space-subtitle">
              archived <span className="green-accent">field recordings</span> and <span className="green-accent">visual traces</span>.
            </p>
          </div>
        </div>
      )}

      {/* 메인 레이아웃 본문 */}
      <div className="archive-workspace-layout">
        {/* 리스트/그리드 영역 */}
        <div className={isSplitView ? "archive-list-vertical" : "archive-grid"}>
          {isSplitView && (
            <div className="vertical-list-meta">
              <span>{items.length} items</span>
            </div>
          )}
          {items.map((item) => {
            const dateStr = formatArchiveDate(item.createdAt);
            const isScreenshot = !!item.screenshot;
            const displayTitle = item.journalTitle || (isScreenshot ? `field trace ${dateStr}` : `signal pattern ${dateStr}`);
            const displayType = isScreenshot ? 'visual trace' : 'data pattern';
            const tags = item.words && item.words.length > 0 ? item.words : (isScreenshot ? ['visual', 'trace'] : ['data', 'pattern']);

            return (
              <article
                className={`archive-card ${isSplitView ? 'horizontal' : ''} ${pressingId === item.id ? 'is-pressing' : ''} ${selectedId === item.id ? 'selected-active' : ''}`}
                key={item.id}
                onMouseDown={() => startPress(item.id)}
                onMouseUp={endPress}
                onMouseLeave={endPress}
                onMouseMove={endPress}
                onTouchStart={() => startPress(item.id)}
                onTouchEnd={endPress}
                onTouchMove={endPress}
                onClick={() => {
                  if (isSplitView) {
                    handleSelectCard(item);
                  }
                }}
              >
                {/* 메타 인포 */}
                <div className="card-header-meta">
                  <span className="card-date-tag">{dateStr}</span>
                  <span className="card-date-full">{formatFullDate(item.createdAt)}</span>
                </div>

                <div className="card-body-content">
                  {/* 이미지/그래픽 영역 */}
                  <div className="card-preview-area">
                    {item.screenshot ? (
                      <img src={item.screenshot} alt="Captured focus forest" className="card-screenshot" />
                    ) : (
                      <div className="card-empty-placeholder"></div>
                    )}
                  </div>

                  {/* 하단 텍스트 및 상세정보 */}
                  <div className="card-footer-info">
                    <div className="card-text-group">
                      <h3>{displayTitle}</h3>
                      <p>{displayType}</p>
                    </div>
                    <div className="card-tags-and-action">
                      <div className="card-pill-tags">
                        {tags.map((tag) => (
                          <span className="tag-pill" key={tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* 상세 저널 에디터 패널 (분할 뷰 활성화 시 노출) */}
        {isSplitView && currentSelectedItem && (
          <div className="journal-editor-container">
            {/* 에디터 메인 창 */}
            <div className="journal-editor-main">
              {/* 에디터 상단 헤더 */}
              <div className="editor-header">
                <button className="editor-back-btn" onClick={() => setSelectedId(null)} type="button" aria-label="Go back to grid">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
                <div className="editor-meta-info">
                  <span className="editor-date-short">{formatArchiveDate(currentSelectedItem.createdAt)}</span>
                  <span className="editor-date-full">{formatFullDate(currentSelectedItem.createdAt)}</span>
                </div>
                <button className="editor-more-btn" onClick={() => handleDelete(currentSelectedItem.id)} type="button" aria-label="Options">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
              </div>

              {/* 에디터 본문 */}
              <div className="editor-body">
                {/* 상단 태그 및 메타 */}
                <div className="editor-tags-row">
                  {/* 기본 distractions 단어들 또는 커스텀 태그 연동 */}
                  <span className="editor-core-badge">고래</span>
                  <span className="editor-meta-project">SHIPPED</span>
                  <span className="editor-meta-date-stamp">2026. 3. 10.</span>
                </div>

                {/* 제목 인풋 */}
                <input
                  type="text"
                  className="editor-title-input"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    setIsSaved(false);
                  }}
                  placeholder="제목을 입력하세요"
                />

                {/* 구분선 */}
                <hr className="editor-divider" />

                {/* 저널 본문 텍스트 영역 */}
                <textarea
                  className="editor-content-textarea"
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    setIsSaved(false);
                  }}
                  placeholder="포커스 세션에 대한 일기나 코멘트를 자유롭게 작성해 보세요..."
                />
              </div>

              {/* 에디터 하단 컨트롤 바 */}
              <div className="editor-footer">
                <div className="editor-tags-editor">
                  {editTags.map((tag) => (
                    <span className="editor-pill-tag" key={tag}>
                      #{tag}
                      <button className="remove-tag-btn" onClick={() => handleRemoveTag(tag)} type="button">×</button>
                    </span>
                  ))}
                  <button className="add-tag-trigger" onClick={handleAddTag} type="button">
                    + add tag
                  </button>
                </div>
                <div className="editor-actions-right">
                  <span className={`save-status ${isSaved ? 'is-saved' : 'is-modified'}`}>
                    {isSaved ? 'saved ●' : 'unsaved ○'}
                  </span>
                  <button className="save-entry-btn" onClick={handleSaveJournal} type="button">
                    save entry
                  </button>
                </div>
              </div>
            </div>

            {/* 에디터 우측 서브 툴바 */}
            <div className="journal-sidebar-toolbar">
              <button className="toolbar-btn" type="button" aria-label="Text formatting">
                <span className="toolbar-icon-letter">T</span>
                <span className="toolbar-label">text</span>
              </button>
              <button className="toolbar-btn" type="button" aria-label="Insert image">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="toolbar-label">image</span>
              </button>
              <button className="toolbar-btn" type="button" aria-label="Insert link">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span className="toolbar-label">link</span>
              </button>
              <button className="toolbar-btn" onClick={handleExportJournal} type="button" aria-label="Export entry">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="toolbar-label">export</span>
              </button>
              <button className="toolbar-btn toolbar-btn-delete" onClick={() => handleDelete(currentSelectedItem.id)} type="button" aria-label="Delete entry">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                <span className="toolbar-label">delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* more archives coming soon 박스 (분할 뷰가 아닐 때만 렌더링) */}
      {!isSplitView && (
        <div className="more-coming-soon-box">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="coming-soon-icon">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span>more archives coming soon</span>
        </div>
      )}
    </div>
  );
}

export default SpaceArchive;
