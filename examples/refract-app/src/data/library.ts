export type WatchStatus =
  | 'Watching'
  | 'Up to Date'
  | 'Watched'
  | 'Plan to Watch'
  | 'On Hold'
  | 'Dropped'
  | 'Rewatched'
  | 'Rewatching';
export interface MediaItem {
  id: string;
  title: string;
  year: string;
  status: WatchStatus;
  poster: string;
  kind: string;
  comments: string;
  rating: string;
  progress: number;
  released: number;
  isNew: boolean;
}
type Seed = [
  string,
  string,
  string,
  WatchStatus,
  string,
  string,
  string,
  number,
];
const seeds: Seed[] = [
  ['vision', 'VisionQuest', '2026', 'Watching', 'tv', '540', '8.2', 20261028],
  [
    'konusanlar',
    'Konuşanlar - Disney+',
    '2025',
    'Watching',
    'tv',
    '20',
    '4.0',
    20261027,
  ],
  [
    'night-agent',
    'The Night Agent',
    '2023',
    'Watching',
    'tv',
    '592',
    '7.6',
    20261026,
  ],
  [
    'dragon',
    'House of the Dragon',
    '2022',
    'Watching',
    'tv',
    '2.7K',
    '8.4',
    20261025,
  ],
  ['tulsa', 'Tulsa King', '2022', 'Watching', 'tv', '653', '7.8', 20261024],
  [
    'formula',
    'Formula 1: Drive to Survive',
    '2019',
    'Watching',
    'tv',
    '1.5K',
    '7.7',
    20261023,
  ],
  ['vikings', 'Vikings', '2013', 'Watching', 'tv', '4.2K', '8.5', 20261022],
  ['lupin', 'Lupin', '2021', 'Watching', 'tv', '861', '7.5', 20261021],
  [
    'apothecary',
    'The Apothecary Diaries',
    '2023',
    'Watching',
    'anime',
    '1.8K',
    '8.6',
    20261020,
  ],
  [
    'walking',
    'The Walking Dead',
    '2010',
    'Plan to Watch',
    'tv',
    '3.3K',
    '8.1',
    20101031,
  ],
  [
    'clayface',
    'Clayface',
    '2026',
    'Plan to Watch',
    'film',
    '90',
    '7.9',
    20260911,
  ],
  ['crossed', 'Crossed', '–', 'Plan to Watch', 'film', '', '', 20270101],
];
const primary = seeds.map(
  ([id, title, year, status, kind, comments, rating, released], index) => ({
    id,
    title,
    year,
    status,
    poster: id,
    kind,
    comments,
    rating,
    released,
    progress:
      status === 'Watching'
        ? ([66, 10, 67, 84, 50, 32, 22, 40, 15][index] ?? 0)
        : 0,
    isNew: id === 'vision' || id === 'clayface',
  }),
);
// A finite, complete local fixture. Extra entries reuse the supplied reference art.
const otherStatuses: WatchStatus[] = [
  'Up to Date',
  'Watched',
  'On Hold',
  'Dropped',
  'Rewatched',
  'Rewatching',
];
export const library: MediaItem[] = [
  ...primary,
  ...otherStatuses.flatMap((status, index) =>
    primary.slice(index, index + 2).map((item) => ({
      ...item,
      id: `${item.id}-${index}`,
      status,
      isNew: false,
    })),
  ),
];
/** @customitinComplete The complete local demo library; no cache, paging or private remote records. */
export async function loadLibrary(): Promise<MediaItem[]> {
  return library.map((item) => ({ ...item }));
}
