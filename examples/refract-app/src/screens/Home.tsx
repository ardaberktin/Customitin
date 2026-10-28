import { useState } from 'react';
import { en } from '../en';
import { library } from '../data/library';
import { artwork } from '../data/artwork';
import { Icon } from '../components/Icon';
import { ContinueShelf } from '../components/ContinueShelf';
import { MediaShelf } from '../components/MediaShelf';
export function Home({ onAssistant }: { onAssistant: () => void }) {
  const [notice, setNotice] = useState('');
  return (
    <div className="home-screen">
      <header className="brand-header">
        <span
          className="prism"
          style={artwork('refract-logo')}
          aria-hidden="true"
        />
        <h1>{en.app}</h1>
        <div className="brand-tools">
          {['help', 'chat', 'spark', 'announcement', 'bell'].map((icon) => (
            <button
              key={icon}
              aria-label={icon === 'chat' ? en.customize : icon}
              onClick={() =>
                icon === 'chat'
                  ? onAssistant()
                  : setNotice(icon === 'help' ? en.help : en.notification)
              }
            >
              <Icon name={icon} size={20} />
            </button>
          ))}
        </div>
      </header>
      {notice && (
        <button className="toast" onClick={() => setNotice('')}>
          {notice}
        </button>
      )}
      <div className="goal">
        <div>
          <span>🏆</span>
          <strong>{en.goal}</strong>
          <span>( 🔥 {en.streak} ❄ 1 )</span>
          <b>{en.goalValue}</b>
          <span>{en.goalTotal}</span>
        </div>
        <span className="goal-track">
          <span />
        </span>
      </div>
      <ContinueShelf />
      <MediaShelf
        title={en.watchlist}
        items={library.filter((item) => item.status === 'Plan to Watch')}
      />
      <MediaShelf
        title={en.hottest}
        icon="flame"
        items={['apothecary', 'lupin', 'clayface', 'vision'].flatMap((id) =>
          library.filter((item) => item.id === id),
        )}
      />
    </div>
  );
}
