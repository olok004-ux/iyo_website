import { useState } from 'react';
import DigitalTree from './components/DigitalTree';
import FocusFlow from './components/FocusFlow';
import SpaceArchive from './components/SpaceArchive';
import { navItems } from './data';

type View = 'system' | 'focus' | 'space';

const soundOptions = ['silence', 'ambient', 'rain', 'noise', 'breathe', 'garden'];

function App() {
  const [view, setView] = useState<View>('system');
  const [cameraOn] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [sound, setSound] = useState('silence');

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
        <button type="button" onClick={() => setSoundOpen(false)}>close</button>
      </div>
      {soundOptions.map((item) => (
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
      ))}
    </section>
  );

  if (view === 'system') {
    return (
      <main className="home-shell">
        <a className="home-brand" href="#" aria-label="Meditation system">
          meditation.system/<br />
          analog-stillness/
        </a>
        {nav}
        <DigitalTree />
      </main>
    );
  }

  if (view === 'focus') {
    return (
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
    );
  }

  return (
    <main className="space-shell">
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

      <SpaceArchive />
      {soundSheet}
    </main>
  );
}

export default App;
