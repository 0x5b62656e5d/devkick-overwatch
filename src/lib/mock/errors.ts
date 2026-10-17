import { minutesAgo, mulberry32 } from './clock'
import type { Severity } from './incidents'

export type ErrorStatus = 'new' | 'grouped' | 'investigating' | 'ignored' | 'resolved'
export type ErrorType = 'JS' | 'Network' | 'HTTP'

export interface ErrorReport {
  id: string
  title: string
  message: string
  service: string
  page: string
  browser: 'Chrome' | 'Safari' | 'Firefox' | 'Edge'
  type: ErrorType
  severity: Severity
  status: ErrorStatus
  count: number
  usersImpacted: number
  affectedSessions: number
  firstSeenMinAgo: number
  lastSeenMinAgo: number
  component: string
  release: string
  tags: string[]
  fingerprint: string
  stack: string[]
  spark: number[]
}

const ROWS: Array<Omit<ErrorReport, 'spark'>> = [
  { id: 'ERR-1042', title: 'PaymentTimeoutError', message: 'PaymentTimeoutError: upstream payment gateway timed out after 5000ms', service: 'checkout-api', page: '/checkout/confirm', browser: 'Chrome', type: 'HTTP', severity: 'critical', status: 'investigating', count: 4237, usersImpacted: 1284, affectedSessions: 1930, firstSeenMinAgo: 134, lastSeenMinAgo: 2, component: 'CheckoutConfirm', release: 'checkout-api@2.14.0', tags: ['payments', 'upstream', 'p0'], fingerprint: 'fp:chk:pay-timeout:v2', stack: ['PaymentTimeoutError: upstream payment gateway timed out after 5000ms', '    at PaymentClient.confirm (src/payments/client.ts:142:18)', '    at async CheckoutService.finalize (src/checkout/service.ts:88:22)', '    at async POST /v1/checkout/confirm (src/routes/checkout.ts:31:5)'] },
  { id: 'ERR-1041', title: 'RateLimitExceeded', message: 'RateLimitExceeded: 429 returned to authenticated client, bucket=api-read', service: 'gateway', page: '/dashboard', browser: 'Chrome', type: 'HTTP', severity: 'critical', status: 'new', count: 3180, usersImpacted: 842, affectedSessions: 1102, firstSeenMinAgo: 58, lastSeenMinAgo: 1, component: 'EdgeProxy', release: 'edge-config@2026.10.17-1220', tags: ['edge', 'ratelimit'], fingerprint: 'fp:gw:rl-api-read', stack: ['RateLimitExceeded: bucket api-read exhausted (limit 600/min)', '    at RateLimiter.check (src/edge/ratelimit.ts:67:11)', '    at Gateway.proxy (src/edge/proxy.ts:104:9)'] },
  { id: 'ERR-1040', title: 'TypeError: undefined is not an object', message: "TypeError: undefined is not an object (evaluating 'cart.totals.subtotal')", service: 'checkout-api', page: '/cart', browser: 'Safari', type: 'JS', severity: 'error', status: 'grouped', count: 918, usersImpacted: 512, affectedSessions: 640, firstSeenMinAgo: 420, lastSeenMinAgo: 14, component: 'CartSummary', release: 'web@1.88.2', tags: ['cart', 'safari'], fingerprint: 'fp:web:cart-totals', stack: ["TypeError: undefined is not an object (evaluating 'cart.totals.subtotal')", '    at CartSummary (src/components/CartSummary.tsx:44:20)', '    at renderWithHooks (react-dom:1841)'] },
  { id: 'ERR-1039', title: 'Failed to fetch', message: 'TypeError: Failed to fetch (network request to /v1/search timed out)', service: 'search-api', page: '/search', browser: 'Firefox', type: 'Network', severity: 'error', status: 'investigating', count: 884, usersImpacted: 390, affectedSessions: 455, firstSeenMinAgo: 187, lastSeenMinAgo: 5, component: 'SearchResults', release: 'web@1.88.2', tags: ['search', 'network'], fingerprint: 'fp:web:search-fetch', stack: ['TypeError: Failed to fetch', '    at fetchWithTimeout (src/lib/fetch.ts:22:9)', '    at SearchResults.load (src/pages/Search.tsx:88:15)'] },
  { id: 'ERR-1038', title: 'AuthError: session expired', message: 'AuthError: session store read timed out', service: 'user-api', page: '/login', browser: 'Chrome', type: 'HTTP', severity: 'error', status: 'resolved', count: 2204, usersImpacted: 512, affectedSessions: 700, firstSeenMinAgo: 420, lastSeenMinAgo: 360, component: 'LoginForm', release: 'user-api@4.2.1', tags: ['auth'], fingerprint: 'fp:usr:session-read', stack: ['AuthError: session store read timed out', '    at SessionStore.get (src/auth/session.ts:55:12)'] },
  { id: 'ERR-1037', title: 'ChunkLoadError', message: 'ChunkLoadError: Loading chunk 8841 failed (missing: /assets/8841.js)', service: 'gateway', page: '/reports', browser: 'Edge', type: 'JS', severity: 'warning', status: 'grouped', count: 402, usersImpacted: 210, affectedSessions: 260, firstSeenMinAgo: 1500, lastSeenMinAgo: 90, component: 'LazyReports', release: 'web@1.88.0', tags: ['deploy', 'chunks'], fingerprint: 'fp:web:chunk-8841', stack: ['ChunkLoadError: Loading chunk 8841 failed', '    at __webpack_require__.e (webpack/runtime:88)'] },
  { id: 'ERR-1036', title: 'Inventory sync lag', message: 'SyncLagError: warehouse feed offset > 10m behind', service: 'inventory-api', page: '/inventory', browser: 'Chrome', type: 'HTTP', severity: 'error', status: 'resolved', count: 640, usersImpacted: 148, affectedSessions: 170, firstSeenMinAgo: 690, lastSeenMinAgo: 600, component: 'InventoryTable', release: 'inventory-api@1.9.4', tags: ['sync', 'warehouse'], fingerprint: 'fp:inv:sync-lag', stack: ['SyncLagError: consumer offset stalled', '    at FeedConsumer.poll (src/inventory/feed.ts:91:7)'] },
  { id: 'ERR-1035', title: 'Unhandled promise rejection', message: 'UnhandledRejection: promo.validate rejected with CODE_INVALID', service: 'checkout-api', page: '/checkout', browser: 'Safari', type: 'JS', severity: 'warning', status: 'new', count: 712, usersImpacted: 388, affectedSessions: 401, firstSeenMinAgo: 2300, lastSeenMinAgo: 45, component: 'PromoField', release: 'web@1.88.2', tags: ['promo'], fingerprint: 'fp:web:promo-reject', stack: ['UnhandledRejection: CODE_INVALID', '    at PromoField.onBlur (src/checkout/PromoField.tsx:29:11)'] },
  { id: 'ERR-1034', title: 'CORS blocked', message: 'Access to fetch blocked by CORS policy: No Access-Control-Allow-Origin', service: 'user-api', page: '/settings/profile', browser: 'Chrome', type: 'Network', severity: 'warning', status: 'ignored', count: 154, usersImpacted: 88, affectedSessions: 96, firstSeenMinAgo: 2900, lastSeenMinAgo: 210, component: 'ProfileSettings', release: 'user-api@4.2.1', tags: ['cors'], fingerprint: 'fp:usr:cors-profile', stack: ['CORS: No Access-Control-Allow-Origin header', '    at ProfileSettings.save (src/pages/Profile.tsx:112:20)'] },
  { id: 'ERR-1033', title: 'ResizeObserver loop', message: 'ResizeObserver loop completed with undelivered notifications.', service: 'search-api', page: '/search', browser: 'Chrome', type: 'JS', severity: 'info', status: 'ignored', count: 1290, usersImpacted: 0, affectedSessions: 0, firstSeenMinAgo: 4300, lastSeenMinAgo: 12, component: 'SearchLayout', release: 'web@1.88.1', tags: ['browser-noise'], fingerprint: 'fp:web:ro-loop', stack: ['ResizeObserver loop completed with undelivered notifications.', '    at <anonymous>'] },
  { id: 'ERR-1032', title: 'TLSHandshakeError', message: 'TLSHandshakeError: no shared cipher', service: 'gateway', page: '/checkout', browser: 'Firefox', type: 'Network', severity: 'error', status: 'resolved', count: 903, usersImpacted: 156, affectedSessions: 168, firstSeenMinAgo: 4150, lastSeenMinAgo: 4100, component: 'EdgeTLS', release: 'edge-config@2026.10.15-0910', tags: ['tls', 'legacy'], fingerprint: 'fp:gw:tls-cipher', stack: ['TLSHandshakeError: no shared cipher', '    at EdgeTLS.accept (src/edge/tls.ts:22:4)'] },
  { id: 'ERR-1031', title: 'Hydration mismatch', message: 'Minified React error #418: hydration failed on <PriceRow>', service: 'checkout-api', page: '/product/[sku]', browser: 'Chrome', type: 'JS', severity: 'info', status: 'new', count: 96, usersImpacted: 61, affectedSessions: 64, firstSeenMinAgo: 1900, lastSeenMinAgo: 300, component: 'PriceRow', release: 'web@1.88.2', tags: ['ssr', 'hydration'], fingerprint: 'fp:web:hydration-418', stack: ['Minified React error #418: hydration failed', '    at PriceRow (src/components/PriceRow.tsx:18:6)'] },
]

export function listErrorReports(): ErrorReport[] {
  return ROWS.map((r, i) => {
    const rand = mulberry32(500 + i * 13)
    const spark = Array.from({ length: 12 }, () => Math.round(10 + rand() * 40))
    return { ...r, spark }
  })
}

export function getErrorReport(id: string): ErrorReport | undefined {
  return listErrorReports().find((r) => r.id === id)
}

export function errorReportCounts() {
  const reports = listErrorReports()
  const byStatus: Record<ErrorStatus, number> = { new: 0, grouped: 0, investigating: 0, ignored: 0, resolved: 0 }
  for (const r of reports) byStatus[r.status]++
  return {
    total: 1139,
    shown: reports.length,
    new: byStatus.new * 41,
    grouped: byStatus.grouped * 87,
    ignored: byStatus.ignored * 133,
    resolved: 512,
  }
}

export function errorReportSparks() {
  const rand = mulberry32(77)
  const make = (base: number) => Array.from({ length: 12 }, () => Math.round(base + rand() * base * 0.6))
  return { newReports: make(20), grouped: make(45), ignored: make(60), resolved: make(30) }
}

export { minutesAgo }
