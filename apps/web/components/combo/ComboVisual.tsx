import type { ComboPersonality } from '@mzr/db';

interface ComboVisualProps {
  personality: ComboPersonality;
  title: string;
  className?: string;
}

type VisualPalette = {
  plate: string;
  bread: string;
  filling: string;
  accent: string;
  garnish: string;
};

const VISUAL_GRADIENTS: Record<ComboPersonality['visualKey'], string> = {
  safe: 'from-orange-50 via-white to-amber-100',
  budget: 'from-emerald-50 via-white to-lime-100',
  light: 'from-lime-50 via-white to-green-100',
  spicy: 'from-red-50 via-white to-orange-100',
  hearty: 'from-yellow-50 via-white to-orange-100',
  sweet: 'from-rose-50 via-white to-pink-100',
  classic: 'from-sky-50 via-white to-stone-100',
};

const VISUAL_PALETTE: Record<ComboPersonality['visualKey'], VisualPalette> = {
  safe: {
    plate: '#FFF3D6',
    bread: '#F2B35B',
    filling: '#4E7D45',
    accent: '#F97316',
    garnish: '#FDE68A',
  },
  budget: {
    plate: '#DCFCE7',
    bread: '#EAB308',
    filling: '#16A34A',
    accent: '#0F766E',
    garnish: '#FACC15',
  },
  light: {
    plate: '#ECFCCB',
    bread: '#D9F99D',
    filling: '#22C55E',
    accent: '#15803D',
    garnish: '#86EFAC',
  },
  spicy: {
    plate: '#FFE4E6',
    bread: '#FDBA74',
    filling: '#DC2626',
    accent: '#991B1B',
    garnish: '#F97316',
  },
  hearty: {
    plate: '#FEF3C7',
    bread: '#D97706',
    filling: '#92400E',
    accent: '#B45309',
    garnish: '#FDE68A',
  },
  sweet: {
    plate: '#FCE7F3',
    bread: '#FDBA74',
    filling: '#BE185D',
    accent: '#F472B6',
    garnish: '#FECDD3',
  },
  classic: {
    plate: '#E0F2FE',
    bread: '#EAB308',
    filling: '#475569',
    accent: '#0F766E',
    garnish: '#CBD5E1',
  },
};

export function ComboVisual({
  personality,
  title,
  className = '',
}: ComboVisualProps) {
  const palette = VISUAL_PALETTE[personality.visualKey];

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${VISUAL_GRADIENTS[personality.visualKey]} ${className}`}
    >
      <FoodMotif mood={personality.visualKey} palette={palette} />
      <div className="absolute left-2 top-2 max-w-[80%] rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-action shadow-sm ring-1 ring-black/5">
        {personality.badgeLabel}
      </div>
      <span className="sr-only">{title} 조합 일러스트</span>
    </div>
  );
}

function FoodMotif({
  mood,
  palette,
}: {
  mood: ComboPersonality['visualKey'];
  palette: VisualPalette;
}) {
  const isLight = mood === 'light';
  const isSweet = mood === 'sweet';
  const isHearty = mood === 'hearty';
  const isSpicy = mood === 'spicy';
  const isBudget = mood === 'budget';

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 240 160"
      className="absolute inset-0 h-full w-full"
    >
      <circle cx="188" cy="34" r="38" fill={palette.plate} opacity="0.9" />
      <circle cx="38" cy="128" r="52" fill="#FFFFFF" opacity="0.72" />
      <ellipse cx="122" cy="119" rx="86" ry="22" fill="#1C1917" opacity="0.08" />

      {isLight ? (
        <Salad palette={palette} />
      ) : isSweet ? (
        <SweetSet palette={palette} />
      ) : (
        <SubSandwich
          palette={palette}
          isHearty={isHearty}
          isSpicy={isSpicy}
        />
      )}

      <Cup palette={palette} compact={isHearty || isSweet} />

      {isBudget ? (
        <g>
          <circle cx="48" cy="44" r="15" fill={palette.garnish} stroke="#FFFFFF" strokeWidth="4" />
          <circle cx="67" cy="59" r="13" fill={palette.garnish} stroke="#FFFFFF" strokeWidth="4" />
          <path
            d="M48 37v14m-5-10h10M67 53v12m-4-8h8"
            stroke="#854D0E"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </g>
      ) : null}

      {isSpicy ? (
        <g>
          <path
            d="M51 41c18 6 28 16 29 33-17-1-30-10-35-29 3 0 4-1 6-4Z"
            fill={palette.filling}
          />
          <path
            d="M59 45c8 4 13 11 15 19"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </g>
      ) : null}

      <path
        d="M178 55c8 3 15 9 19 17M198 89c-4 8-12 13-22 15"
        stroke={palette.accent}
        strokeLinecap="round"
        strokeWidth="6"
        opacity="0.28"
      />
    </svg>
  );
}

function SubSandwich({
  palette,
  isHearty,
  isSpicy,
}: {
  palette: VisualPalette;
  isHearty: boolean;
  isSpicy: boolean;
}) {
  return (
    <g>
      <path
        d="M56 79c13-23 45-34 83-31 35 2 62 15 69 38-26 9-55 12-88 11-30-1-52-7-64-18Z"
        fill={palette.bread}
      />
      <path
        d="M58 85c29 12 105 21 149 2 1 15-12 29-37 36-29 9-76 6-104-7-16-8-21-19-8-31Z"
        fill="#F8D38F"
      />
      <path
        d="M67 83c27 9 88 15 131 1"
        stroke={palette.filling}
        strokeLinecap="round"
        strokeWidth={isHearty ? 12 : 9}
      />
      <path
        d="M82 92c24 8 72 12 104 1"
        stroke={isSpicy ? palette.accent : '#FFFFFF'}
        strokeLinecap="round"
        strokeWidth="5"
        opacity={isSpicy ? 0.9 : 0.75}
      />
      <path
        d="M83 73c6-3 12-3 18 0M119 65c7-2 13-2 19 1M154 72c6-3 12-2 18 1"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeWidth="4"
        opacity="0.65"
      />
      {isHearty ? (
        <path
          d="M82 102c25 8 76 11 108 0"
          stroke={palette.filling}
          strokeLinecap="round"
          strokeWidth="8"
        />
      ) : null}
    </g>
  );
}

function Salad({
  palette,
}: {
  palette: VisualPalette;
}) {
  return (
    <g>
      <path
        d="M63 84h139c-4 27-27 47-69 47-40 0-64-18-70-47Z"
        fill="#FFFFFF"
      />
      <path
        d="M70 84c19 15 99 16 125 0"
        stroke={palette.accent}
        strokeLinecap="round"
        strokeWidth="8"
      />
      <circle cx="91" cy="74" r="15" fill={palette.filling} />
      <circle cx="124" cy="68" r="18" fill={palette.garnish} />
      <circle cx="158" cy="75" r="15" fill="#BBF7D0" />
      <path
        d="M87 73c9 3 17 8 24 17M126 68c8 6 16 13 21 23M158 74c-7 6-12 12-16 19"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeWidth="4"
        opacity="0.72"
      />
    </g>
  );
}

function SweetSet({
  palette,
}: {
  palette: VisualPalette;
}) {
  return (
    <g>
      <circle cx="101" cy="93" r="34" fill={palette.bread} />
      <circle cx="101" cy="93" r="24" fill="#FED7AA" />
      <circle cx="92" cy="83" r="4" fill={palette.filling} />
      <circle cx="109" cy="99" r="4" fill={palette.filling} />
      <circle cx="118" cy="86" r="3.5" fill={palette.accent} />
      <path
        d="M145 67h42l-6 58h-30l-6-58Z"
        fill="#FFFFFF"
      />
      <path
        d="M150 84h33l-4 41h-25l-4-41Z"
        fill={palette.garnish}
      />
      <path
        d="M154 62c10 5 20 5 30 0"
        stroke={palette.accent}
        strokeLinecap="round"
        strokeWidth="6"
      />
    </g>
  );
}

function Cup({
  palette,
  compact,
}: {
  palette: VisualPalette;
  compact: boolean;
}) {
  if (compact) return null;

  return (
    <g>
      <path d="M31 72h34l-5 55H38L31 72Z" fill="#FFFFFF" />
      <path d="M36 84h25l-3 36H41L36 84Z" fill={palette.accent} opacity="0.82" />
      <path
        d="M33 67h30M42 67l-6-14"
        stroke="#1C1917"
        strokeLinecap="round"
        strokeWidth="5"
        opacity="0.35"
      />
    </g>
  );
}
