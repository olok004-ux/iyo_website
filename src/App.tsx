import { useEffect, useState } from 'react';
import DigitalTree from './components/DigitalTree';
import FocusFlow from './components/FocusFlow';
import SpaceArchive from './components/SpaceArchive';
import { navItems } from './data';
import CustomCursor from './components/CustomCursor';

type View = 'system' | 'focus' | 'space';

type Playlist = {
  id: string;
  title: string;
  url: string;
  tracks: number;
  duration: string;
};

const defaultPlaylists: Playlist[] = [
  { id: 'silence', title: 'silence', url: '', tracks: 0, duration: 'local' },
];

function App() {
  const [view, setView] = useState<View>('system');
  const [cameraOn] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [sound, setSound] = useState('silence');
  const [playlists, setPlaylists] = useState<Playlist[]>(defaultPlaylists);

  useEffect(() => {
    const saved = localStorage.getItem('focus-space-playlists');
    if (saved) setPlaylists(JSON.parse(saved) as Playlist[]);
  }, []);

  const savePlaylists = (next: Playlist[]) => {
    setPlaylists(next);
    localStorage.setItem('focus-space-playlists', JSON.stringify(next));
  };

  const addPlaylist = () => {
    const url = window.prompt('Paste a YouTube playlist URL');
    if (!url?.trim()) return;
    const title = window.prompt('Playlist name', 'my focus playlist') || 'my focus playlist';
    const next = [
      ...playlists,
      {
        id: `yt-${Date.now()}`,
        title: title.trim(),
        url: url.trim(),
        tracks: 0,
        duration: 'youtube',
      },
    ];
    savePlaylists(next);
  };

  const selectPlaylist = (item: Playlist) => {
    setSound(item.title);
    setView('focus');
    if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
    setSoundOpen(false);
  };

  const nav = (
    <nav className="home-nav" aria-label="Focus Space modules">
      {navItems.map((item) => (
        <button
          className={item === view ? 'is-active' : ''}
          type="button"
          key={item}
          onClick={() => setView(item as View)}
        >
          {item}
        </button>
      ))}
    </nav>
  );

  const soundSheet = soundOpen && (
    <section className="sound-sheet" aria-label="Music selection">
      <div className="sound-sheet-head">
        <span>sound.archive/</span>
        <button type="button" onClick={() => setSoundOpen(false)} aria-label="Close sound archive">
          close
        </button>
      </div>
      <button className="new-playlist-btn" type="button" onClick={addPlaylist}>
        <span>+</span>
        <strong>new playlist</strong>
      </button>
      <div className="playlist-list">
        {playlists.map((item, index) => (
          <button
            type="button"
            className={`playlist-card ${sound === item.title ? 'is-active' : ''}`}
            key={item.id}
            onClick={() => selectPlaylist(item)}
          >
            <span className={`playlist-cover cover-${index % 6}`} aria-hidden="true" />
            <span className="playlist-info">
              <strong>{item.title}</strong>
              <small>{item.tracks || '--'} tracks · {item.duration}</small>
            </span>
            <span className="playlist-more">...</span>
          </button>
        ))}
      </div>
      {/* {soundOptions.map((item) => (
        <button
          type="button"
          className={sound === item ? 'is-active' : ''}
          key={item}
          onClick={() => {
            setSound(item);
            setView('focus');
            setSoundOpen(false);
          }}
        >
          <span>{item}</span>
          <small>{item === 'silence' ? 'local' : 'link pending'}</small>
        </button>
      ))} */}
    </section>
  );

  if (view === 'system') {
    return (
      <>
        <CustomCursor />
        <main className="home-shell">
          <a className="home-brand" href="#" aria-label="Meditation system">
            meditation.system/<br />
            analog-stillness/
          </a>
          {nav}
          <DigitalTree />
        </main>
      </>
    );
  }

  if (view === 'focus') {
    return (
      <>
        <CustomCursor />
        <main className="focus-shell">
          {nav}
          <aside className="focus-side">
            <a href="#" className="sidebar-brand-link" aria-label="Focus archive">
              focus.archive/<br />
              ritual list
            </a>
            <button type="button" className="focus-sound" onClick={() => setSoundOpen(true)}>
              <span>sound</span>
              <span className="sound-slider-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
                </svg>
              </span>
            </button>
            <div className="focus-side-footer">
              <span className="copyright-text">© 2026</span>
              <span className="footer-circle-icon"></span>
            </div>
          </aside>
          <FocusFlow cameraOn={cameraOn} onSendToSpace={() => setView('space')} />
          {soundSheet}
        </main>
      </>
    );
  }

  return (
    <>
      <CustomCursor />
      <main className="space-shell">
        {nav}
        <SpaceArchive />
        {soundSheet}
      </main>
    </>
  );
}

export default App;
