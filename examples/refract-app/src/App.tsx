import { useState } from 'react';
import { en } from './en';
import { library } from './data/library';
import { Home } from './screens/Home';
import { Collection } from './screens/Collection';
import { Dialog } from './components/Dialog';
import { Icon } from './components/Icon';
import { LibraryProvider, useLibrary } from './components/LibraryContext';
import { MediaShelf } from './components/MediaShelf';
import { PersonalizationRoot } from '../personalize/root';

const tabs = ['home', 'search', 'favorites', 'collection', 'profile'] as const;
type Tab = (typeof tabs)[number];
function Shell() {
  const [tab, setTab] = useState<Tab>('home');
  const [query, setQuery] = useState('');
  const { selected, setSelected } = useLibrary();
  return (
    <main className="phone">
      <div className="screen">
        {tab === 'home' && <Home onAssistant={() => setTab('collection')} />}
        {tab === 'collection' && <Collection />}
        {tab === 'search' && (
          <div className="secondary-screen">
            <h1>{en.search}</h1>
            <input
              aria-label={en.search}
              placeholder={en.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <MediaShelf
              title={en.search}
              items={library.filter((item) =>
                item.title.toLowerCase().includes(query.toLowerCase()),
              )}
            />
          </div>
        )}
        {tab === 'favorites' && (
          <div className="secondary-screen">
            <h1>{en.favorites}</h1>
            <MediaShelf
              title={en.favorites}
              items={library.filter((item) => Number(item.rating) >= 8.4)}
            />
          </div>
        )}
        {tab === 'profile' && (
          <div className="secondary-screen">
            <h1>{en.profile}</h1>
            <p>{en.about}</p>
          </div>
        )}
      </div>
      <nav className="tab-bar" aria-label={en.navigation}>
        {tabs.map((value) => (
          <button
            key={value}
            aria-label={en[value]}
            aria-current={tab === value ? 'page' : undefined}
            onClick={() => {
              setTab(value);
              window.scrollTo(0, 0);
            }}
          >
            <Icon
              name={
                value === 'favorites'
                  ? 'heart'
                  : value === 'profile'
                    ? 'user'
                    : value
              }
              size={28}
            />
          </button>
        ))}
      </nav>
      {selected && (
        <Dialog label={en.detail} onClose={() => setSelected(null)}>
          <section className="detail-sheet">
            <button
              className="close"
              aria-label={en.close}
              onClick={() => setSelected(null)}
            >
              <Icon name="close" />
            </button>
            <h2>{selected.title}</h2>
            <p>
              {selected.year} · {selected.status}
            </p>
            <p>
              △ {selected.rating} · ● {selected.comments}
            </p>
          </section>
        </Dialog>
      )}
    </main>
  );
}
export function App() {
  return (
    <LibraryProvider>
      <PersonalizationRoot>
        <Shell />
      </PersonalizationRoot>
    </LibraryProvider>
  );
}
