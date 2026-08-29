import { useEffect, useRef } from 'react'
import styles from './CheckoutFormRenderer.module.css'

interface CheckoutFormRendererProps {
  html: string
}

/**
 * Renders the HTML/script snippet Iyzico's checkout form initialize returns. Assigning it via
 * innerHTML does not execute any <script> tags inside it (a deliberate browser security
 * behavior), so each script is manually re-created and re-inserted — the standard technique for
 * running a third-party embed snippet in React. Iyzico's own script then injects and controls
 * the actual payment iframe; nothing here inspects or trusts its content beyond rendering it.
 */
function CheckoutFormRenderer({ html }: CheckoutFormRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !html) {
      return
    }

    container.innerHTML = html

    const originalScripts = Array.from(container.querySelectorAll('script'))
    for (const originalScript of originalScripts) {
      const executableScript = document.createElement('script')
      for (const attribute of Array.from(originalScript.attributes)) {
        executableScript.setAttribute(attribute.name, attribute.value)
      }
      executableScript.text = originalScript.text
      originalScript.replaceWith(executableScript)
    }

    return () => {
      container.innerHTML = ''
    }
  }, [html])

  return <div ref={containerRef} className={styles.container} data-testid="checkout-form-container" />
}

export default CheckoutFormRenderer
