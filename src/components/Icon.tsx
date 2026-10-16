import { I18nManager } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

const paths = {
  back: ['M15 18l-6-6 6-6'],
  chevron: ['M9 6l6 6-6 6'],
  globe: ['M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18', 'circle:12,12,9'],
  pin: ['M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z', 'circle:12,9.5,2.5'],
  home: ['M4 21V11l8-6 8 6v10', 'M9 21v-6h6v6', 'M12 5V2'],
  mosque: ['M5 20V12a7 7 0 0 1 14 0v8', 'M3 20h18', 'M12 5V2', 'M10 20v-4a2 2 0 0 1 4 0v4'],
  mosqueSimple: ['M5 20V12a7 7 0 0 1 14 0v8', 'M3 20h18', 'M12 5V2'],
  search: ['circle:11,11,7', 'M20 20l-3.5-3.5'],
  locate: ['circle:12,12,4', 'M12 2v3M12 19v3M2 12h3M19 12h3'],
  bell: ['M6 16V11a6 6 0 0 1 12 0v5l2 2H4z', 'M10 21h4'],
  map: ['M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z', 'M9 4v14M15 6v14'],
  star: ['M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'],
  user: ['circle:12,8,4', 'M4 21a8 8 0 0 1 16 0'],
  close: ['M6 6l12 12M18 6L6 18'],
  clock: ['circle:12,12,9', 'M12 7v5l3 2'],
  walk: ['circle:13,4,2', 'M10 21l2-6 3 3v3', 'M8 12l3-3 3 2 3 1', 'M11 9l-1 5'],
  directions: ['M12 2l10 10-10 10L2 12z', 'M9 13v-2a1 1 0 0 1 1-1h5', 'M13 8l2 2-2 2'],
  check: ['M5 12l5 5 9-10'],
  checkCircle: ['circle:12,12,9', 'M8 12l3 3 5-6'],
  flag: ['M5 21V4', 'M5 4h11l-2 4 2 4H5'],
  camera: ['M4 8h3l2-3h6l2 3h3v11H4z', 'circle:12,13,3.5'],
  send: ['M4 12l16-8-6 16-3-7z'],
  info: ['circle:12,12,9', 'M12 11v5', 'M12 8h.01'],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M14 6l4 4'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4M16 3v4'],
  logout: ['M15 4h4v16h-4', 'M10 8l-4 4 4 4', 'M6 12h10'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'circle:12,12,3'],
  eyeOff: [
    'M3 3l18 18',
    'M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9',
    'M6.6 6.6A17 17 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 4.4-1',
  ],
  mail: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
  lock: ['M6 11h12v9H6z', 'M8 11V8a4 4 0 0 1 8 0v3'],
  refresh: ['M20 11a8 8 0 0 0-14.9-3', 'M4 4v4h4', 'M4 13a8 8 0 0 0 14.9 3', 'M20 20v-4h-4'],
  alert: ['M12 3l10 18H2z', 'M12 10v5', 'M12 18h.01'],
  sliders: [
    'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0',
    'circle:16,6,2',
    'circle:10,12,2',
    'circle:18,18,2',
  ],
  moon: ['M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z'],
} as const;

export type IconName = keyof typeof paths;

/** Icons that point in a reading direction and must mirror in RTL. */
const directional = new Set<IconName>(['back', 'chevron', 'send', 'logout']);

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = 20, color = colors.ink, strokeWidth = 2 }: Props) {
  const flip = directional.has(name) && I18nManager.isRTL;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={flip ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      {paths[name].map((d) => {
        if (d.startsWith('circle:')) {
          const [cx, cy, r] = d.slice(7).split(',').map(Number);
          return <Circle key={d} cx={cx} cy={cy} r={r} />;
        }
        return <Path key={d} d={d} />;
      })}
    </Svg>
  );
}
