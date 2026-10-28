import type { CSSProperties } from 'react';
type Crop = [number, number, number, number, 'home' | 'collection'];
const crops: Record<string, Crop> = {
  'refract-logo': [44, 130, 85, 85, 'home'],
  walking: [44, 873, 269, 402, 'home'],
  clayface: [339, 873, 269, 402, 'home'],
  crossed: [634, 873, 269, 402, 'home'],
  apothecary: [44, 1507, 269, 402, 'home'],
  lupin: [339, 1507, 269, 402, 'home'],
  vision: [36, 924, 279, 419, 'collection'],
  konusanlar: [334, 924, 280, 419, 'collection'],
  'night-agent': [632, 924, 280, 419, 'collection'],
  dragon: [36, 1459, 279, 419, 'collection'],
  tulsa: [334, 1459, 280, 419, 'collection'],
  formula: [632, 1459, 280, 419, 'collection'],
  vikings: [44, 434, 443, 287, 'home'],
  'continue-vikings': [44, 434, 443, 287, 'home'],
  'continue-vision': [513, 434, 434, 287, 'home'],
};
export function artwork(poster: string): CSSProperties {
  const [x, y, width, height, sheet] = crops[poster] ?? crops.vision!;
  return {
    backgroundImage: `url(/artwork/${sheet}.png)`,
    backgroundSize: `${(947 / width) * 100}% ${(2048 / height) * 100}%`,
    backgroundPosition: `${(x / (947 - width)) * 100}% ${(y / (2048 - height)) * 100}%`,
  };
}
