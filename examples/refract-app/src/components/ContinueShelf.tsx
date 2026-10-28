import { useState } from 'react';
import { en } from '../en';
import { artwork } from '../data/artwork';
import { Icon } from './Icon';
const episodes = [
  {
    id: 'vikings',
    title: 'Vikings',
    episode: 'S03 • E02',
    name: 'The Wanderer',
    progress: 22,
  },
  {
    id: 'vision',
    title: 'VisionQuest',
    episode: 'S01 • E05',
    name: 'Firewall',
    progress: 66,
  },
];
export function ContinueShelf() {
  const [watched, setWatched] = useState<string[]>([]);
  return (
    <section className="continue-section">
      <div className="section-heading">
        <h2>
          <Icon name="play" size={18} />
          {en.continue}
        </h2>
        <Icon name="chevron" size={20} />
      </div>
      <div className="continue-rail">
        {episodes.map((item) => (
          <article
            key={item.id}
            className="continue-card"
            style={artwork(`continue-${item.id}`)}
          >
            <span className="ongoing">
              <Icon name="tv" size={11} />
              {en.ongoing}
            </span>
            <div className="episode">
              <h3>{item.title}</h3>
              <p>{item.episode}</p>
              <p>{item.name}</p>
            </div>
            <button
              aria-label={`${en.markWatched}: ${item.title}`}
              aria-pressed={watched.includes(item.id)}
              onClick={() => setWatched([...watched, item.id])}
            >
              <Icon name="check" size={23} />
            </button>
            <span className="progress">
              <span
                style={{
                  width: `${watched.includes(item.id) ? 100 : item.progress}%`,
                }}
              />
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
