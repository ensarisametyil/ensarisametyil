import { API_BASE_URL } from './config'
import { requestJson } from './httpClient'

export interface ContactRequest {
  name: string
  email: string
  subject: string
  message: string
}

/** Submits the public contact form. Genuinely persisted server-side — see docs/stage-10.md for why there is no simulated "email sent" confirmation. */
export function submitContact(request: ContactRequest): Promise<{ message: string }> {
  return requestJson(`${API_BASE_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    skipAuth: true,
  })
}
