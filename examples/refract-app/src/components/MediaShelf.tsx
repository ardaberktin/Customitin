import type { MediaItem } from '../data/library';
import { artwork } from '../data/artwork';
import { en } from '../en';
import { Icon } from './Icon';
import { useLibrary } from './LibraryContext';
export function MediaCard({ item }: { item: MediaItem }) {
  const { setSelected } = useLibrary();
  return (
    <button
      className="media-card"
      onClick={(event) => {
        event.currentTarget.focus();
        setSelected(item);
      }}
      aria-label={`${item.title}, ${item.year}`}
    >
      <span className="poster" style={artwork(item.poster)}>
        <span className={`media-kind ${item.kind}`}>
          <Icon name={item.kind === 'anime' ? 'spark' : item.kind} size={11} />
        </span>
        {item.isNew && <span className="new-badge">{en.new}</span>}
        <span className="poster-meta">
          <span>{item.comments && `● ${item.comments}`}</span>
          <span>{item.rating && `△ ${item.rating}`}</span>
        </span>
        <span
          className={`progress ${item.status === 'Plan to Watch' ? 'blue' : ''}`}
        >
          <span
            style={{
              width: `${item.status === 'Plan to Watch' ? 100 : item.progress}%`,
            }}
          />
        </span>
      </span>
      <span className="media-title">{item.title}</span>
      <span className="media-year">{item.year}</span>
    </button>
  );
}
/** The original Home rail; collection layout and controls belong to the SDK. */
export function MediaShelf({
  title,
  items,
  icon = 'bookmark',
}: {
  title: string;
  items: readonly MediaItem[];
  icon?: string;
}) {
  return (
    <section className="media-section">
      <div className="section-heading">
        <h2>
          <Icon name={icon} size={19} />
          {title}
        </h2>
        <Icon name="chevron" size={19} />
      </div>
      <div className="poster-rail">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
