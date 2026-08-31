import type { CSSProperties } from 'react'
import type { EditorFont, EditorHeading, FieldFormat } from './types'

export const WEB_FONTS = {
  serif: 'var(--font-serif), Georgia, serif',
  sans: 'var(--font-sans), system-ui, sans-serif',
} as const

export function editorFontFamily(font?: EditorFont): string {
  return font === 'serif' ? WEB_FONTS.serif : WEB_FONTS.sans
}

export function headingFontSize(heading: EditorHeading | undefined, base: number): number {
  if (heading === 'h1') return Math.round(base * 1.65)
  if (heading === 'h2') return Math.round(base * 1.28)
  return base
}

export function formatTextStyle(
  format: FieldFormat | undefined,
  baseSize: number,
  color: string,
): CSSProperties {
  const heading = format?.heading ?? 'body'
  const italic = !!format?.italic
  const bold = !!format?.bold
  return {
    color,
    fontSize: headingFontSize(heading, baseSize),
    fontFamily: heading === 'body' && !bold ? WEB_FONTS.sans : WEB_FONTS.serif,
    fontStyle: italic ? 'italic' : 'normal',
    textDecoration: format?.underline ? 'underline' : 'none',
    fontWeight: bold && heading === 'body' ? 600 : undefined,
  }
}

export function withHeading(format: FieldFormat | undefined, heading: EditorHeading): FieldFormat {
  return { ...(format ?? {}), heading }
}

export function toggleFormatFlag(
  format: FieldFormat | undefined,
  key: 'bold' | 'italic' | 'underline',
): FieldFormat {
  const current = format ?? {}
  return { ...current, [key]: !current[key] }
}

export function clearFieldFormat(): FieldFormat {
  return { heading: 'body', bold: false, italic: false, underline: false }
}
