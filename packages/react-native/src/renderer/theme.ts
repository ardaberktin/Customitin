import { useRenderedProfile } from '../provider/context';
export const palette = {
  ink: '#222D29',
  muted: '#68726A',
  paper: '#F6F5EF',
  card: '#FFFFFF',
  border: '#DDE2D8',
  accent: '#245C46',
  wash: '#E9EFE3',
  error: '#A33228',
};
export function usePersonalTheme() {
  const profile = useRenderedProfile();
  const theme = profile?.theme ?? {};
  const dark = theme['appearance.mode'] === 'dark';
  return {
    ...palette,
    ...(dark
      ? {
          ink: '#F2F4ED',
          muted: '#BBC9BC',
          paper: '#17251F',
          card: '#24362C',
          border: '#405649',
          wash: '#314A3B',
          accent: '#A9D5AF',
        }
      : {}),
    scale: typeof theme['type.scale'] === 'number' ? theme['type.scale'] : 1,
    gap: theme['layout.density'] === 'compact' ? 10 : 18,
    radius:
      typeof theme['shape.radius'] === 'number' ? theme['shape.radius'] : 18,
  };
}
