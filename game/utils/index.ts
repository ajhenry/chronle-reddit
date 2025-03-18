import { ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { WebviewToBlockMessage } from '../types'

/**
 * Merges class names using clsx and tailwind-merge
 * @param inputs - Class names to merge
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sends a message to the parent Devvit window
 * @param event - The message to send
 * @throws {Error} If the parent window is not available
 */
export function sendToDevvit(event: WebviewToBlockMessage) {
  if (!window.parent) {
    throw new Error('Parent window not available')
  }
  window.parent.postMessage(event, '*')
}

/**
 * Safely sends a message to the parent Devvit window
 * @param event - The message to send
 * @returns Whether the message was sent successfully
 */
export function safeSendToDevvit(event: WebviewToBlockMessage): boolean {
  try {
    sendToDevvit(event)
    return true
  } catch (error) {
    console.error('Failed to send message to Devvit:', error)
    return false
  }
}
