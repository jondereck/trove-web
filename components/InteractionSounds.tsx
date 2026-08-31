'use client'

import { useEffect } from 'react'
import { bindInteractionSounds } from '@/lib/interactionSounds'

export default function InteractionSounds() {
  useEffect(() => bindInteractionSounds(), [])
  return null
}
