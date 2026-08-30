import type { ReactNode } from 'react'

/**
 * Splits a translated sentence on a single `{placeholder}` token and substitutes a real React
 * node (typically a <Link>) in its place — for copy like "See our {privacyLink} page" where the
 * link needs to stay a real, clickable <Link> rather than being flattened into plain text or
 * rendered via dangerouslySetInnerHTML. Falls back to the plain text if the placeholder isn't
 * found (e.g. a translation that dropped it) rather than silently swallowing the sentence.
 */
export function withLink(text: string, placeholder: string, link: ReactNode): ReactNode[] {
  const token = `{${placeholder}}`
  const index = text.indexOf(token)
  if (index === -1) {
    return [text]
  }
  return [text.slice(0, index), link, text.slice(index + token.length)]
}
