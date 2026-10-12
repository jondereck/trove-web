'use client'

import { Flag, Sparkles, Sun, TrendingUp } from 'lucide-react'
import type { DailyStatusKind } from '@/lib/dailyStatus'
import { DAILY_STATUS_COPY } from '@/lib/dailyStatus'
import styles from './DailyStatusCard.module.css'

type Props = {
  kind: DailyStatusKind
}

const ICONS = {
  keep_going: TrendingUp,
  one_left: Flag,
  completing: Sun,
  small_steps: Sparkles,
  day_spent: Flag,
} as const

export default function DailyStatusCard({ kind }: Props) {
  const copy = DAILY_STATUS_COPY[kind]
  const Icon = ICONS[kind]
  const spent = kind === 'day_spent'

  return (
    <aside className={spent ? styles.spent : styles.banner}>
      <div className={spent ? styles.spentHead : styles.bannerHead}>
        <div className={spent ? styles.spentIcon : styles.iconWrap}>
          <Icon
            size={spent ? 18 : 18}
            strokeWidth={1.75}
            aria-hidden
            className={spent ? styles.flagIcon : undefined}
          />
        </div>
        <div className={styles.copy}>
          <h3 className={styles.title}>{copy.title}</h3>
          {copy.sub ? <p className={styles.sub}>{copy.sub}</p> : null}
        </div>
      </div>
      {spent ? (
        <div className={styles.scene} aria-hidden>
          <DaySpentScene />
        </div>
      ) : null}
    </aside>
  )
}

function DaySpentScene() {
  return (
    <svg
      viewBox="0 0 400 240"
      className={styles.sceneSvg}
      role="presentation"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="spentSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdf6ef" />
          <stop offset="40%" stopColor="#f8e8d8" />
          <stop offset="100%" stopColor="#f0d5c0" />
        </linearGradient>
        <radialGradient id="spentSun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f2c49a" />
          <stop offset="70%" stopColor="#e8b07c" />
          <stop offset="100%" stopColor="#dfa06a" />
        </radialGradient>
        <linearGradient id="hillBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8c4a8" />
          <stop offset="100%" stopColor="#dfb598" />
        </linearGradient>
        <linearGradient id="hillMid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0b494" />
          <stop offset="100%" stopColor="#d4a07e" />
        </linearGradient>
        <linearGradient id="hillFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4a488" />
          <stop offset="100%" stopColor="#c89472" />
        </linearGradient>
      </defs>

      <rect width="400" height="240" fill="url(#spentSky)" />

      {/* Soft clouds */}
      <ellipse cx="72" cy="48" rx="36" ry="10" fill="#f3dcc8" opacity="0.55" />
      <ellipse cx="96" cy="44" rx="22" ry="8" fill="#f5e2d2" opacity="0.45" />
      <ellipse cx="310" cy="40" rx="40" ry="11" fill="#f3dcc8" opacity="0.5" />
      <ellipse cx="340" cy="36" rx="24" ry="8" fill="#f5e2d2" opacity="0.4" />

      {/* Birds */}
      <path
        d="M248 58 q6 -6 12 0"
        fill="none"
        stroke="#c9a88a"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M268 50 q5 -5 10 0"
        fill="none"
        stroke="#c9a88a"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Sun */}
      <circle cx="200" cy="118" r="52" fill="url(#spentSun)" />

      {/* Back hills */}
      <path
        d="M0 148
           C40 132 80 128 120 136
           C160 144 180 128 210 124
           C250 118 290 130 340 138
           C370 142 390 140 400 136
           L400 240 L0 240 Z"
        fill="url(#hillBack)"
      />

      {/* Mid hills */}
      <path
        d="M0 168
           C50 150 95 158 140 166
           C180 174 220 152 260 150
           C300 148 340 160 400 154
           L400 240 L0 240 Z"
        fill="url(#hillMid)"
      />

      {/* Path */}
      <path
        d="M188 240
           C190 210 198 188 212 168
           C224 150 236 136 244 118
           C250 106 252 96 248 88"
        fill="none"
        stroke="#f7ebe0"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M188 240
           C190 210 198 188 212 168
           C224 150 236 136 244 118
           C250 106 252 96 248 88"
        fill="none"
        stroke="#faf4ed"
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* Front hill left/right framing path */}
      <path
        d="M0 188
           C60 172 110 186 150 198
           C170 206 180 214 188 240
           L0 240 Z"
        fill="url(#hillFront)"
      />
      <path
        d="M400 176
           C350 164 300 178 270 190
           C245 202 230 214 220 240
           L400 240 Z"
        fill="url(#hillFront)"
      />

      {/* Trees — left */}
      <g>
        <rect x="46" y="176" width="3" height="28" rx="1.5" fill="#5c4636" />
        <ellipse cx="47.5" cy="164" rx="11" ry="22" fill="#8a9a6e" />
      </g>
      <g>
        <rect x="74" y="168" width="3.5" height="36" rx="1.5" fill="#5c4636" />
        <ellipse cx="75.5" cy="152" rx="14" ry="28" fill="#7d8f62" />
      </g>

      {/* Trees — right */}
      <g>
        <rect x="322" y="164" width="3.5" height="40" rx="1.5" fill="#5c4636" />
        <ellipse cx="323.5" cy="146" rx="15" ry="30" fill="#7d8f62" />
      </g>
      <g>
        <rect x="352" y="176" width="3" height="28" rx="1.5" fill="#5c4636" />
        <ellipse cx="353.5" cy="164" rx="11" ry="22" fill="#8a9a6e" />
      </g>
    </svg>
  )
}
