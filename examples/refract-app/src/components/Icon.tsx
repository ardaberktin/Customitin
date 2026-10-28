const paths: Record<string, string> = {
  home: 'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',
  search: 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  heart: 'M12 21S2 15 2 8a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 7-10 13-10 13',
  collection: 'M3 5h4v16H3zM10 2h4v19h-4zM17 5l3-1 3 17-3 1zM4 9h2M11 16h2',
  user: 'M20 21H4c0-7 16-7 16 0ZM16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  chevron: 'm9 4 8 8-8 8',
  down: 'm5 9 7 7 7-7',
  up: 'm5 15 7-7 7 7',
  play: 'M9 7v10l8-5ZM22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  check: 'm7 12 4 4 7-9M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  watched: 'm5 12 4 4 7-9m-5 7 2 2 7-9M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  bookmark: 'M6 2h12v20l-6-5-6 5Z',
  pause: 'M9 8v8m6-8v8M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  dropped: 'm8 8 8 8m0-8-8 8M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  rewatched:
    'm12 4 4 4-4 4m3-4a6 6 0 1 0 3 6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  rewatching: 'M5 5a9 9 0 1 0 7-2M3 2l2 6 4-5Z',
  filter: 'M2 5h20M6 12h12m-8 7h4',
  grid: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
  book: 'M12 5c-4-3-7-3-10-2v17c4-1 7 0 10 2 3-2 6-3 10-2V3c-3-1-6-1-10 2Zm0 0v17',
  stack: 'M3 7h18v15H3zM5 4h14M7 1h10',
  tv: 'M2 4h20v14H2zM7 21h10',
  film: 'M3 3h18v18H3zM7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4',
  chat: 'M22 11a10 9 0 0 1-10 9H8l-5 3 1-6a9 9 0 0 1-2-6 10 9 0 0 1 20 0ZM7 11h.1m5 0h.1m5 0h.1',
  bell: 'M5 17h14l-2-4V8a5 5 0 0 0-10 0v5ZM10 21h4',
  help: 'M9 8c0-4 7-4 7 0 0 3-4 2-4 6m0 3h.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  announcement: 'M3 9h6l11-6v18L9 15H3ZM8 15l3 7H6l-2-7',
  flame:
    'M13 2c3 7-6 8-3 13 3 3 5-1 4-4 9 9 2 12-3 11C1 21 5 11 8 8c-1 8 9 0 5-6Z',
  spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
  close: 'm5 5 14 14M5 19 19 5',
};
export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.spark} />
    </svg>
  );
}
