import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function Svg({ children, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...p}>
      {children}
    </svg>
  );
}
function Stroke({ children, ...p }: P) {
  return (
    <svg
      viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}
    >
      {children}
    </svg>
  );
}

export const PlayIcon = (p: P) => <Svg {...p}><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" /></Svg>;
export const PauseIcon = (p: P) => <Svg {...p}><rect x="6" y="5" width="4.5" height="14" rx="1" /><rect x="13.5" y="5" width="4.5" height="14" rx="1" /></Svg>;
export const Back10Icon = (p: P) => (
  <Stroke {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><text x="12" y="15.5" fontSize="7.5" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">10</text></Stroke>
);
export const Fwd10Icon = (p: P) => (
  <Stroke {...p}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /><text x="12" y="15.5" fontSize="7.5" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">10</text></Stroke>
);
export const VolumeIcon = (p: P) => <Stroke {...p}><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></Stroke>;
export const VolumeLowIcon = (p: P) => <Stroke {...p}><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /></Stroke>;
export const MuteIcon = (p: P) => <Stroke {...p}><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" /><path d="m16 9 5 6M21 9l-5 6" /></Stroke>;
export const FullscreenIcon = (p: P) => <Stroke {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Stroke>;
export const ExitFullscreenIcon = (p: P) => <Stroke {...p}><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></Stroke>;
export const SettingsIcon = (p: P) => (
  <Stroke {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Stroke>
);
export const PipIcon = (p: P) => <Stroke {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor" /></Stroke>;
export const CaptionsIcon = (p: P) => <Stroke {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3" /></Stroke>;
export const ArrowLeftIcon = (p: P) => <Stroke {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Stroke>;
export const ChevronRightIcon = (p: P) => <Stroke {...p}><path d="m9 6 6 6-6 6" /></Stroke>;
export const ChevronLeftIcon = (p: P) => <Stroke {...p}><path d="m15 6-6 6 6 6" /></Stroke>;
export const CheckIcon = (p: P) => <Stroke {...p}><path d="m5 12 5 5 9-10" /></Stroke>;
export const PlusIcon = (p: P) => <Stroke {...p}><path d="M12 5v14M5 12h14" /></Stroke>;
export const SearchIcon = (p: P) => <Stroke {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Stroke>;
export const InfoIcon = (p: P) => <Stroke {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.5" /></Stroke>;
export const CopyIcon = (p: P) => <Stroke {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></Stroke>;
export const CloseIcon = (p: P) => <Stroke {...p}><path d="M6 6l12 12M18 6 6 18" /></Stroke>;
