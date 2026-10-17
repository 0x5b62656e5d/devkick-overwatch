import { minutesAgo, mulberry32 } from './clock'
import type { KevDecision } from '#/lib/kev-client'

/** Subset of the KEV decision the dashboard renders. */
export type MockDecision = Pick<KevDecision, 'owner' | 'severity' | 'nextAction' | 'needsHuman'>

export type Severity = 'critical' | 'error' | 'warning' | 'info'
export type IncidentStatus = 'investigating' | 'monitoring' | 'resolved'

export interface Incident {
  id: string
  title: string
  summary: string
  description: string
  service: string
  team: string
  severity: Severity
  status: IncidentStatus
  affectedUsers: number
  errorEvents: number
  startedAt: string
  resolvedAt?: string
  owner: { name: string; initials: string }
  userImpactPct: number
  errorRatePct: number
  errorRateDeltaPct: number
  timeToDetect: number // seconds
  evidence: {
    topError: { type: string; message: string }
    endpoint: {
      method: string
      path: string
      errors: number
      errorRatePct: number
      failed: number
      total: number
    }
    exampleRequest: { method: string; path: string; fields: string[] }
  }
  verification: {
    name: string
    kind: 'Playwright synthetic test'
    status: 'passed' | 'failed'
    detail: string
  }[]
  likelyCause: {
    title: string
    explanation: string
    confidence: 'high' | 'medium' | 'low'
    stackTrace: string[]
    decision: MockDecision
  }
  timeline: {
    at: string
    title: string
    detail: string
    tone: 'critical' | 'warning' | 'primary' | 'success' | 'muted'
  }[]
  recommendedActions: {
    label: string
    cta: 'Run' | 'Create PR' | 'Create issue' | 'View dashboard'
  }[]
  related: { id: string; title: string; when: string; severity: Severity }[]
  series: { t: string; errorRatePct: number; requests: number }[]
}

export const SERVICES: Record<string, { label: string; team: string }> = {
  'checkout-api': { label: 'Checkout', team: 'payments' },
  'user-api': { label: 'User', team: 'identity' },
  'search-api': { label: 'Search', team: 'search' },
  'inventory-api': { label: 'Inventory', team: 'inventory' },
  gateway: { label: 'Gateway', team: 'platform' },
}

const OWNERS = [
  { name: 'Maya Chen', initials: 'MC' },
  { name: 'Jordan Diaz', initials: 'JD' },
  { name: 'Priya Nair', initials: 'PN' },
  { name: 'Tom Okafor', initials: 'TO' },
  { name: 'Lena Fischer', initials: 'LF' },
  { name: 'Sam Rivera', initials: 'SR' },
]

interface Spec {
  id: string
  title: string
  summary: string
  service: keyof typeof SERVICES
  severity: Severity
  status: IncidentStatus
  startedMinAgo: number
  durationMin?: number
  affectedUsers: number
  errorEvents: number
  owner: number
  userImpactPct: number
  errorRatePct: number
  errorRateDeltaPct: number
  timeToDetect: number
  topError: { type: string; message: string }
  endpoint: { method: string; path: string }
  cause: { title: string; explanation: string; confidence: 'high' | 'medium' | 'low' }
  stack: string[]
  decision: MockDecision
  actions: Spec['endpoint'] extends never ? never : { label: string; cta: 'Run' | 'Create PR' | 'Create issue' | 'View dashboard' }[]
}

const SPECS: Spec[] = [
  {
    id: 'INC-4821',
    title: 'Checkout failing with 500 errors',
    summary: 'Checkout requests are failing at ~42% after the 11:38 deploy.',
    service: 'checkout-api',
    severity: 'critical',
    status: 'investigating',
    startedMinAgo: 134,
    affectedUsers: 1284,
    errorEvents: 9412,
    owner: 0,
    userImpactPct: 42,
    errorRatePct: 41.8,
    errorRateDeltaPct: 38.6,
    timeToDetect: 118,
    topError: { type: 'PaymentTimeoutError', message: 'upstream payment gateway timed out after 5000ms' },
    endpoint: { method: 'POST', path: '/v1/checkout/confirm' },
    cause: {
      title: 'Payment gateway timeouts after checkout-api v2.14.0 deploy',
      explanation:
        'The 11:38 deploy bumped the payment client timeout to 5s but kept the upstream connection pool at 20. Under load, pooled connections exhaust and requests queue past the timeout. Error onset matches the deploy within 2 minutes.',
      confidence: 'high',
    },
    stack: [
      'PaymentTimeoutError: upstream payment gateway timed out after 5000ms',
      '    at PaymentClient.confirm (src/payments/client.ts:142)',
      '    at CheckoutService.finalize (src/checkout/service.ts:88)',
      '    at POST /v1/checkout/confirm (src/routes/checkout.ts:31)',
    ],
    decision: { owner: 'payments', severity: 5, nextAction: 'queue-rollback', needsHuman: true },
    actions: [
      { label: 'Rollback checkout-api to v2.13.9', cta: 'Create PR' },
      { label: 'Re-run checkout synthetic suite', cta: 'Run' },
      { label: 'Open payment gateway dashboard', cta: 'View dashboard' },
    ],
  },
  {
    id: 'INC-4824',
    title: 'Gateway rate limiting upstream traffic',
    summary: 'Edge rate limiter is rejecting ~12% of authenticated traffic.',
    service: 'gateway',
    severity: 'critical',
    status: 'investigating',
    startedMinAgo: 58,
    affectedUsers: 842,
    errorEvents: 3180,
    owner: 3,
    userImpactPct: 12,
    errorRatePct: 12.4,
    errorRateDeltaPct: 11.9,
    timeToDetect: 94,
    topError: { type: 'RateLimitExceeded', message: '429 returned to authenticated client, bucket=api-read' },
    endpoint: { method: 'GET', path: '/v1/* (edge)' },
    cause: {
      title: 'Rate-limit buckets mis-scoped after config push',
      explanation:
        'The 12:20 config push keyed api-read buckets on session instead of tenant, so multi-tab users exhaust a single bucket. Rejections started within one minute of the push.',
      confidence: 'medium',
    },
    stack: [
      'RateLimitExceeded: bucket api-read exhausted (limit 600/min)',
      '    at RateLimiter.check (src/edge/ratelimit.ts:67)',
      '    at Gateway.proxy (src/edge/proxy.ts:104)',
    ],
    decision: { owner: 'platform', severity: 5, nextAction: 'queue-rollback', needsHuman: true },
    actions: [
      { label: 'Revert rate-limit config push', cta: 'Create PR' },
      { label: 'Open edge traffic dashboard', cta: 'View dashboard' },
    ],
  },
  {
    id: 'INC-4823',
    title: 'Search latency increase',
    summary: 'Search p95 rose from 180ms to 1.4s; error rate is stable.',
    service: 'search-api',
    severity: 'warning',
    status: 'monitoring',
    startedMinAgo: 187,
    affectedUsers: 390,
    errorEvents: 412,
    owner: 2,
    userImpactPct: 8,
    errorRatePct: 2.1,
    errorRateDeltaPct: 1.4,
    timeToDetect: 305,
    topError: { type: 'SlowQueryWarning', message: 'query exceeded 800ms budget for tenant shard 7' },
    endpoint: { method: 'GET', path: '/v1/search' },
    cause: {
      title: 'Shard 7 index rebuild competing with live reads',
      explanation:
        'A reindex job on shard 7 started at 10:10 and is saturating I/O on the read replica. Latency tracks the reindex throughput curve.',
      confidence: 'medium',
    },
    stack: [
      'SlowQueryWarning: query exceeded 800ms budget',
      '    at SearchIndex.query (src/search/index.ts:213)',
      '    at GET /v1/search (src/routes/search.ts:19)',
    ],
    decision: { owner: 'search', severity: 3, nextAction: 'investigate', needsHuman: false },
    actions: [
      { label: 'Pause shard 7 reindex', cta: 'Run' },
      { label: 'Open search latency dashboard', cta: 'View dashboard' },
    ],
  },
  // Resolved incidents, newest first
  { id: 'INC-4822', title: 'Elevated login API errors', summary: 'Login failures spiked to 9% for EU sessions.', service: 'user-api', severity: 'error', status: 'resolved', startedMinAgo: 420, durationMin: 74, affectedUsers: 512, errorEvents: 2204, owner: 1, userImpactPct: 9, errorRatePct: 8.7, errorRateDeltaPct: 7.9, timeToDetect: 150, topError: { type: 'AuthError', message: 'session store read timed out' }, endpoint: { method: 'POST', path: '/v1/auth/login' }, cause: { title: 'Session store replica lag', explanation: 'EU read replica fell 30s behind; stale reads failed session validation.', confidence: 'high' }, stack: ['AuthError: session store read timed out', '    at SessionStore.get (src/auth/session.ts:55)'], decision: { owner: 'identity', severity: 4, nextAction: 'check-dependencies', needsHuman: false }, actions: [{ label: 'Open session store dashboard', cta: 'View dashboard' }] },
  { id: 'INC-4820', title: 'Inventory sync lag', summary: 'Stock counts lagged the warehouse feed by ~40 minutes.', service: 'inventory-api', severity: 'error', status: 'resolved', startedMinAgo: 690, durationMin: 96, affectedUsers: 148, errorEvents: 640, owner: 4, userImpactPct: 2, errorRatePct: 3.2, errorRateDeltaPct: 2.8, timeToDetect: 540, topError: { type: 'SyncLagError', message: 'warehouse feed offset > 10m behind' }, endpoint: { method: 'GET', path: '/v1/inventory/levels' }, cause: { title: 'Feed consumer stalled on poison message', explanation: 'A malformed SKU record crashed the consumer loop; retries backed up the offset.', confidence: 'high' }, stack: ['SyncLagError: consumer offset stalled', '    at FeedConsumer.poll (src/inventory/feed.ts:91)'], decision: { owner: 'inventory', severity: 3, nextAction: 'investigate', needsHuman: false }, actions: [{ label: 'Skip malformed record', cta: 'Run' }] },
  { id: 'INC-4819', title: 'Payment webhook retries exhausted', summary: 'Stripe webhook retries hit the cap for 3% of events.', service: 'checkout-api', severity: 'error', status: 'resolved', startedMinAgo: 980, durationMin: 52, affectedUsers: 96, errorEvents: 388, owner: 0, userImpactPct: 3, errorRatePct: 2.9, errorRateDeltaPct: 2.4, timeToDetect: 420, topError: { type: 'WebhookDeliveryError', message: 'retry budget exhausted (5 attempts)' }, endpoint: { method: 'POST', path: '/v1/webhooks/stripe' }, cause: { title: 'Webhook handler 500 on missing order rows', explanation: 'Race between order commit and webhook delivery; handler returned 500 instead of retryable 409.', confidence: 'medium' }, stack: ['WebhookDeliveryError: retry budget exhausted', '    at WebhookHandler.stripe (src/webhooks/stripe.ts:44)'], decision: { owner: 'payments', severity: 3, nextAction: 'investigate', needsHuman: false }, actions: [{ label: 'Create issue for handler fix', cta: 'Create issue' }] },
  { id: 'INC-4818', title: 'Search autocomplete degraded', summary: 'Autocomplete responses exceeded 500ms for 20% of queries.', service: 'search-api', severity: 'warning', status: 'resolved', startedMinAgo: 1300, durationMin: 118, affectedUsers: 610, errorEvents: 1190, owner: 2, userImpactPct: 20, errorRatePct: 1.1, errorRateDeltaPct: 0.7, timeToDetect: 660, topError: { type: 'SlowQueryWarning', message: 'prefix query exceeded 400ms budget' }, endpoint: { method: 'GET', path: '/v1/search/autocomplete' }, cause: { title: 'Prefix cache cold after node restart', explanation: 'Autocomplete node restarted for a cert rotation and lost its prefix cache.', confidence: 'high' }, stack: ['SlowQueryWarning: prefix query exceeded 400ms', '    at Autocomplete.suggest (src/search/suggest.ts:71)'], decision: { owner: 'search', severity: 2, nextAction: 'investigate', needsHuman: false }, actions: [{ label: 'Open autocomplete dashboard', cta: 'View dashboard' }] },
  { id: 'INC-4817', title: 'Gateway 502 spike from edge', summary: 'Edge nodes returned 502s for 4% of requests.', service: 'gateway', severity: 'critical', status: 'resolved', startedMinAgo: 1560, durationMin: 41, affectedUsers: 1730, errorEvents: 6210, owner: 3, userImpactPct: 4, errorRatePct: 4.2, errorRateDeltaPct: 3.9, timeToDetect: 88, topError: { type: 'BadGateway', message: 'upstream connect refused' }, endpoint: { method: 'ALL', path: '/v1/* (edge)' }, cause: { title: 'Origin pool drained during rolling restart', explanation: 'Health-check grace period was shorter than service warmup; edge saw zero healthy origins.', confidence: 'high' }, stack: ['BadGateway: upstream connect refused', '    at ProxyPool.next (src/edge/pool.ts:33)'], decision: { owner: 'platform', severity: 5, nextAction: 'escalate-oncall', needsHuman: true }, actions: [{ label: 'Open edge dashboard', cta: 'View dashboard' }] },
  { id: 'INC-4816', title: 'Password reset emails delayed', summary: 'Reset emails queued for up to 25 minutes.', service: 'user-api', severity: 'warning', status: 'resolved', startedMinAgo: 1900, durationMin: 88, affectedUsers: 264, errorEvents: 152, owner: 5, userImpactPct: 1, errorRatePct: 0.4, errorRateDeltaPct: 0.2, timeToDetect: 900, topError: { type: 'QueueBacklogWarning', message: 'mail queue depth > 5000' }, endpoint: { method: 'POST', path: '/v1/auth/reset' }, cause: { title: 'Mail worker OOM restarts', explanation: 'Worker leak in template rendering caused restart loops; queue drained after rollback.', confidence: 'medium' }, stack: ['QueueBacklogWarning: mail queue depth 5,214', '    at MailWorker.enqueue (src/mail/worker.ts:29)'], decision: { owner: 'identity', severity: 2, nextAction: 'investigate', needsHuman: false }, actions: [{ label: 'Open mail queue dashboard', cta: 'View dashboard' }] },
  { id: 'INC-4815', title: 'Checkout promo code errors', summary: 'Valid promo codes rejected with CODE_INVALID.', service: 'checkout-api', severity: 'error', status: 'resolved', startedMinAgo: 2300, durationMin: 64, affectedUsers: 388, errorEvents: 712, owner: 1, userImpactPct: 5, errorRatePct: 4.8, errorRateDeltaPct: 4.1, timeToDetect: 300, topError: { type: 'PromoValidationError', message: 'campaign window evaluated in wrong timezone' }, endpoint: { method: 'POST', path: '/v1/checkout/promo' }, cause: { title: 'Campaign window TZ regression', explanation: 'Promo service compared UTC starts against local-time ends after a tzdata bump.', confidence: 'high' }, stack: ['PromoValidationError: CODE_INVALID', '    at Promo.validate (src/checkout/promo.ts:58)'], decision: { owner: 'payments', severity: 3, nextAction: 'queue-rollback', needsHuman: false }, actions: [{ label: 'Create issue for TZ fix', cta: 'Create issue' }] },
  { id: 'INC-4814', title: 'Session token refresh loop', summary: 'Clients looped on token refresh every 30 seconds.', service: 'user-api', severity: 'critical', status: 'resolved', startedMinAgo: 2700, durationMin: 133, affectedUsers: 2140, errorEvents: 8840, owner: 4, userImpactPct: 14, errorRatePct: 13.6, errorRateDeltaPct: 12.8, timeToDetect: 240, topError: { type: 'TokenRefreshError', message: 'refresh token rejected: iat in future' }, endpoint: { method: 'POST', path: '/v1/auth/refresh' }, cause: { title: 'Clock skew on auth node', explanation: 'One auth node drifted 90s ahead; tokens it minted looked future-dated to peers.', confidence: 'high' }, stack: ['TokenRefreshError: iat in future', '    at TokenVerifier.refresh (src/auth/token.ts:101)'], decision: { owner: 'identity', severity: 5, nextAction: 'escalate-oncall', needsHuman: true }, actions: [{ label: 'Open auth dashboard', cta: 'View dashboard' }] },
  { id: 'INC-4813', title: 'Search zero-results rate up', summary: 'Zero-result queries rose from 4% to 11%.', service: 'search-api', severity: 'info', status: 'resolved', startedMinAgo: 3050, durationMin: 210, affectedUsers: 480, errorEvents: 0, owner: 2, userImpactPct: 11, errorRatePct: 0.2, errorRateDeltaPct: 0.1, timeToDetect: 1800, topError: { type: 'RelevanceRegression', message: 'zero-result rate above 10% threshold' }, endpoint: { method: 'GET', path: '/v1/search' }, cause: { title: 'Synonym dictionary deploy dropped plurals', explanation: 'A dictionary update lost plural expansions; queries for plural forms returned nothing.', confidence: 'medium' }, stack: ['RelevanceRegression: zero-result rate 11.2%', '    at RelevanceMonitor.check (src/search/monitor.ts:48)'], decision: { owner: 'search', severity: 2, nextAction: 'queue-rollback', needsHuman: false }, actions: [{ label: 'Rollback synonym dictionary', cta: 'Create PR' }] },
  { id: 'INC-4812', title: 'Inventory webhook delivery failures', summary: 'Outbound stock webhooks failed for 6% of subscribers.', service: 'inventory-api', severity: 'error', status: 'resolved', startedMinAgo: 3400, durationMin: 79, affectedUsers: 41, errorEvents: 204, owner: 5, userImpactPct: 6, errorRatePct: 5.7, errorRateDeltaPct: 5.1, timeToDetect: 480, topError: { type: 'DeliveryError', message: 'subscriber endpoint returned 401' }, endpoint: { method: 'POST', path: '/v1/inventory/webhooks' }, cause: { title: 'Signing key rotation missed a subscriber cohort', explanation: 'Subscribers on the legacy plan still verified with the retired key.', confidence: 'high' }, stack: ['DeliveryError: 401 from subscriber', '    at WebhookDispatcher.send (src/inventory/dispatch.ts:77)'], decision: { owner: 'inventory', severity: 3, nextAction: 'check-dependencies', needsHuman: false }, actions: [{ label: 'Re-enable legacy key verify', cta: 'Run' }] },
  { id: 'INC-4811', title: 'User profile reads timing out', summary: 'Profile GETs timed out for 7% of requests.', service: 'user-api', severity: 'error', status: 'resolved', startedMinAgo: 3800, durationMin: 55, affectedUsers: 720, errorEvents: 1560, owner: 0, userImpactPct: 7, errorRatePct: 6.9, errorRateDeltaPct: 6.2, timeToDetect: 200, topError: { type: 'QueryTimeout', message: 'profile join exceeded 3s' }, endpoint: { method: 'GET', path: '/v1/users/:id/profile' }, cause: { title: 'Missing index after preferences column add', explanation: 'Migration added a JSONB column read in the hot path without an index.', confidence: 'high' }, stack: ['QueryTimeout: profile join exceeded 3s', '    at ProfileRepo.get (src/users/repo.ts:140)'], decision: { owner: 'identity', severity: 4, nextAction: 'investigate', needsHuman: false }, actions: [{ label: 'Create PR adding index', cta: 'Create PR' }] },
  { id: 'INC-4810', title: 'Gateway TLS handshake failures', summary: 'TLS handshakes failed for clients on older ciphers.', service: 'gateway', severity: 'critical', status: 'resolved', startedMinAgo: 4150, durationMin: 47, affectedUsers: 156, errorEvents: 903, owner: 3, userImpactPct: 1, errorRatePct: 1.8, errorRateDeltaPct: 1.6, timeToDetect: 160, topError: { type: 'TLSHandshakeError', message: 'no shared cipher' }, endpoint: { method: 'ALL', path: '/v1/* (edge)' }, cause: { title: 'Cipher list update dropped TLS 1.1 fallback', explanation: 'Edge cipher update removed the last suite shared by legacy mobile clients.', confidence: 'high' }, stack: ['TLSHandshakeError: no shared cipher', '    at EdgeTLS.accept (src/edge/tls.ts:22)'], decision: { owner: 'platform', severity: 3, nextAction: 'queue-rollback', needsHuman: false }, actions: [{ label: 'Restore fallback cipher', cta: 'Create PR' }] },
  { id: 'INC-4809', title: 'Inventory import job backlog', summary: 'Nightly import jobs queued past their SLA window.', service: 'inventory-api', severity: 'warning', status: 'resolved', startedMinAgo: 2900, durationMin: 140, affectedUsers: 22, errorEvents: 66, owner: 4, userImpactPct: 0, errorRatePct: 0.8, errorRateDeltaPct: 0.5, timeToDetect: 1200, topError: { type: 'JobBacklogWarning', message: 'import queue age > 45m' }, endpoint: { method: 'POST', path: '/v1/inventory/import' }, cause: { title: 'Worker pool undersized after file size growth', explanation: 'Average import file grew 3x; pool of 4 workers could not keep pace.', confidence: 'medium' }, stack: ['JobBacklogWarning: queue age 47m', '    at ImportScheduler.poll (src/inventory/import.ts:64)'], decision: { owner: 'inventory', severity: 2, nextAction: 'investigate', needsHuman: false }, actions: [{ label: 'Scale import workers to 8', cta: 'Run' }] },
  { id: 'INC-4808', title: 'Checkout cart totals mismatch', summary: 'Cart totals differed between cart and confirm steps.', service: 'checkout-api', severity: 'critical', status: 'resolved', startedMinAgo: 3300, durationMin: 101, affectedUsers: 930, errorEvents: 4110, owner: 1, userImpactPct: 11, errorRatePct: 10.4, errorRateDeltaPct: 9.7, timeToDetect: 260, topError: { type: 'TotalsMismatchError', message: 'confirm total differs from cart total' }, endpoint: { method: 'POST', path: '/v1/checkout/confirm' }, cause: { title: 'Currency rounding change shipped mid-session', explanation: 'A rounding-mode flag flipped between cart read and confirm; totals differed by a cent.', confidence: 'high' }, stack: ['TotalsMismatchError: totals differ', '    at Checkout.verify (src/checkout/verify.ts:49)'], decision: { owner: 'payments', severity: 5, nextAction: 'queue-rollback', needsHuman: true }, actions: [{ label: 'Rollback rounding flag', cta: 'Create PR' }] },
  { id: 'INC-4807', title: 'Search index rebuild stalled', summary: 'Nightly index rebuild stalled at 78% for two hours.', service: 'search-api', severity: 'info', status: 'resolved', startedMinAgo: 3600, durationMin: 155, affectedUsers: 0, errorEvents: 0, owner: 2, userImpactPct: 0, errorRatePct: 0.1, errorRateDeltaPct: 0, timeToDetect: 2400, topError: { type: 'JobStallWarning', message: 'rebuild heartbeat missed 4 intervals' }, endpoint: { method: 'POST', path: '/v1/search/reindex' }, cause: { title: 'Lock contention on segment merge', explanation: 'A long-running merge held the commit lock; the rebuild heartbeat timed out.', confidence: 'medium' }, stack: ['JobStallWarning: heartbeat missed', '    at Reindexer.tick (src/search/reindex.ts:112)'], decision: { owner: 'search', severity: 2, nextAction: 'investigate', needsHuman: false }, actions: [{ label: 'Restart rebuild job', cta: 'Run' }] },
  { id: 'INC-4806', title: 'User API quota exceeded', summary: 'Internal quota alarms fired for batch consumers.', service: 'user-api', severity: 'info', status: 'resolved', startedMinAgo: 3900, durationMin: 38, affectedUsers: 0, errorEvents: 118, owner: 5, userImpactPct: 0, errorRatePct: 0.6, errorRateDeltaPct: 0.4, timeToDetect: 720, topError: { type: 'QuotaWarning', message: 'batch consumer exceeded 80% of quota' }, endpoint: { method: 'GET', path: '/v1/users/batch' }, cause: { title: 'ETL job ran twice after retry', explanation: 'A retried ETL window doubled batch calls against the user API.', confidence: 'medium' }, stack: ['QuotaWarning: 82% of quota', '    at Quota.check (src/users/quota.ts:17)'], decision: { owner: 'identity', severity: 1, nextAction: 'investigate', needsHuman: false }, actions: [{ label: 'Open quota dashboard', cta: 'View dashboard' }] },
  { id: 'INC-4805', title: 'Gateway config reload errors', summary: 'Config reload failed twice on edge-3.', service: 'gateway', severity: 'error', status: 'resolved', startedMinAgo: 4250, durationMin: 24, affectedUsers: 0, errorEvents: 44, owner: 3, userImpactPct: 0, errorRatePct: 0.3, errorRateDeltaPct: 0.2, timeToDetect: 95, topError: { type: 'ConfigReloadError', message: 'route table rejected: duplicate prefix' }, endpoint: { method: 'POST', path: '/admin/reload' }, cause: { title: 'Duplicate route prefix in pushed config', explanation: 'Two teams added /v1/reports/* in the same config bundle.', confidence: 'high' }, stack: ['ConfigReloadError: duplicate prefix', '    at RouteTable.load (src/edge/routes.ts:56)'], decision: { owner: 'platform', severity: 2, nextAction: 'investigate', needsHuman: false }, actions: [{ label: 'Fix route table config', cta: 'Create PR' }] },
  { id: 'INC-4804', title: 'Checkout address validation slow', summary: 'Address validation p95 hit 2.1s during peak.', service: 'checkout-api', severity: 'warning', status: 'resolved', startedMinAgo: 2500, durationMin: 67, affectedUsers: 410, errorEvents: 205, owner: 0, userImpactPct: 6, errorRatePct: 1.4, errorRateDeltaPct: 0.9, timeToDetect: 510, topError: { type: 'SlowDependencyWarning', message: 'address provider p95 > 1.5s' }, endpoint: { method: 'POST', path: '/v1/checkout/address' }, cause: { title: 'Address provider quota throttling', explanation: 'Provider throttled after a quota tier change; calls queued behind the limiter.', confidence: 'medium' }, stack: ['SlowDependencyWarning: provider p95 2.1s', '    at AddressClient.validate (src/checkout/address.ts:34)'], decision: { owner: 'payments', severity: 2, nextAction: 'check-dependencies', needsHuman: false }, actions: [{ label: 'Open provider dashboard', cta: 'View dashboard' }] },
  { id: 'INC-4803', title: 'Inventory stock drift detected', summary: 'Reconciliation found drift on 14 SKUs.', service: 'inventory-api', severity: 'info', status: 'resolved', startedMinAgo: 4400, durationMin: 190, affectedUsers: 0, errorEvents: 0, owner: 4, userImpactPct: 0, errorRatePct: 0.1, errorRateDeltaPct: 0, timeToDetect: 3600, topError: { type: 'DriftWarning', message: 'stock drift on 14 SKUs > 2%' }, endpoint: { method: 'GET', path: '/v1/inventory/reconcile' }, cause: { title: 'Double-counted returns restock event', explanation: 'A restock event was applied twice after a queue retry.', confidence: 'medium' }, stack: ['DriftWarning: 14 SKUs drifted', '    at Reconciler.diff (src/inventory/reconcile.ts:83)'], decision: { owner: 'inventory', severity: 1, nextAction: 'investigate', needsHuman: false }, actions: [{ label: 'Correct affected SKUs', cta: 'Run' }] },
  { id: 'INC-4802', title: 'Search suggestions showing stale terms', summary: 'Suggest API returned yesterday\u2019s trending terms.', service: 'search-api', severity: 'warning', status: 'resolved', startedMinAgo: 2100, durationMin: 85, affectedUsers: 560, errorEvents: 0, owner: 2, userImpactPct: 9, errorRatePct: 0.5, errorRateDeltaPct: 0.3, timeToDetect: 1500, topError: { type: 'StaleDataWarning', message: 'trending snapshot age > 12h' }, endpoint: { method: 'GET', path: '/v1/search/suggest' }, cause: { title: 'Trending snapshot cron missed a window', explanation: 'The snapshot job skipped a run during deploy freeze.', confidence: 'high' }, stack: ['StaleDataWarning: snapshot age 26h', '    at SuggestService.trending (src/search/trending.ts:40)'], decision: { owner: 'search', severity: 2, nextAction: 'investigate', needsHuman: false }, actions: [{ label: 'Refresh trending snapshot', cta: 'Run' }] },
  { id: 'INC-4801', title: 'User export jobs failing', summary: 'GDPR export jobs failed for 3 requests.', service: 'user-api', severity: 'error', status: 'resolved', startedMinAgo: 3200, durationMin: 72, affectedUsers: 3, errorEvents: 19, owner: 5, userImpactPct: 0, errorRatePct: 2.2, errorRateDeltaPct: 1.8, timeToDetect: 840, topError: { type: 'ExportJobError', message: 'archive write failed: quota exceeded' }, endpoint: { method: 'POST', path: '/v1/users/export' }, cause: { title: 'Export archive disk quota', explanation: 'Shared archive volume hit its quota; writes failed mid-job.', confidence: 'high' }, stack: ['ExportJobError: archive write failed', '    at Exporter.archive (src/users/export.ts:66)'], decision: { owner: 'identity', severity: 3, nextAction: 'investigate', needsHuman: false }, actions: [{ label: 'Expand archive volume', cta: 'Run' }] },
]

const RELATED_POOL = [
  { id: 'INC-4808', title: 'Checkout cart totals mismatch', severity: 'critical' as Severity },
  { id: 'INC-4814', title: 'Session token refresh loop', severity: 'critical' as Severity },
  { id: 'INC-4815', title: 'Checkout promo code errors', severity: 'error' as Severity },
  { id: 'INC-4810', title: 'Gateway TLS handshake failures', severity: 'error' as Severity },
  { id: 'INC-4822', title: 'Elevated login API errors', severity: 'error' as Severity },
]

function buildIncident(spec: Spec, index: number): Incident {
  const rand = mulberry32(1000 + index * 97)
  const startedAt = minutesAgo(spec.startedMinAgo)
  const resolvedAt =
    spec.status === 'resolved' && spec.durationMin
      ? minutesAgo(Math.max(1, spec.startedMinAgo - spec.durationMin))
      : undefined
  const service = SERVICES[spec.service]

  // 24 points over the last 4h, error rate shaped around the incident window.
  const series = Array.from({ length: 24 }, (_, i) => {
    const t = minutesAgo(240 - i * 10)
    const inIncident = Date.parse(t) >= Date.parse(startedAt)
    const base = inIncident ? spec.errorRatePct : Math.max(0.05, spec.errorRatePct * 0.06)
    return {
      t,
      errorRatePct: Math.max(0, base * (0.85 + rand() * 0.3)),
      requests: Math.round(800 + rand() * 500),
    }
  })

  const endpointErrors = Math.round(spec.errorEvents * (0.6 + rand() * 0.2))
  const endpointTotal = Math.round(endpointErrors / Math.max(0.01, spec.errorRatePct / 100))

  const verification: Incident['verification'] = [
    {
      name: 'Checkout happy path',
      kind: 'Playwright synthetic test',
      status: spec.severity === 'critical' && spec.service === 'checkout-api' ? 'failed' : 'passed',
      detail:
        spec.severity === 'critical' && spec.service === 'checkout-api'
          ? 'Step 4/6 — confirm payment timed out'
          : 'All steps passed in 8.2s',
    },
    {
      name: 'API health probe',
      kind: 'Playwright synthetic test',
      status: spec.status === 'resolved' ? 'passed' : 'failed',
      detail: spec.status === 'resolved' ? '200 OK in 142ms' : '500 on /healthz dependencies',
    },
    {
      name: 'Auth round trip',
      kind: 'Playwright synthetic test',
      status: 'passed',
      detail: 'Login + token refresh OK in 1.1s',
    },
  ]

  const detectAt = new Date(Date.parse(startedAt) + spec.timeToDetect * 1000).toISOString()
  const timeline: Incident['timeline'] = [
    {
      at: startedAt,
      title: 'Error rate crossed threshold',
      detail: `${spec.service} error rate reached ${spec.errorRatePct.toFixed(1)}%`,
      tone: 'critical',
    },
    {
      at: detectAt,
      title: 'Incident detected',
      detail: `Detected in ${Math.round(spec.timeToDetect / 60)}m by error threshold monitor`,
      tone: 'warning',
    },
    {
      at: new Date(Date.parse(detectAt) + 3 * 60_000).toISOString(),
      title: 'KEV decision received',
      detail: `Owner: ${spec.decision.owner} · action: ${spec.decision.nextAction}`,
      tone: 'primary',
    },
    {
      at: new Date(Date.parse(detectAt) + 6 * 60_000).toISOString(),
      title: `${OWNERS[spec.owner].name} assigned`,
      detail: `Paged ${service.team} on-call`,
      tone: 'muted',
    },
  ]
  if (resolvedAt) {
    timeline.push({
      at: resolvedAt,
      title: 'Marked resolved',
      detail: 'Error rate back under threshold for 15 minutes',
      tone: 'success',
    })
  } else if (spec.status === 'monitoring') {
    timeline.push({
      at: minutesAgo(30),
      title: 'Moved to monitoring',
      detail: 'Mitigation applied, watching recovery',
      tone: 'success',
    })
  }

  const related = RELATED_POOL.filter((r) => r.id !== spec.id)
    .slice(index % 3, (index % 3) + 2)
    .map((r) => ({ ...r, when: 'Resolved · 2d ago' }))

  return {
    id: spec.id,
    title: spec.title,
    summary: spec.summary,
    description:
      spec.summary +
      ' Overwatch detected the anomaly from the error-rate threshold monitor and correlated it with the most recent deploy and upstream dependency signals.',
    service: spec.service,
    team: service.team,
    severity: spec.severity,
    status: spec.status,
    affectedUsers: spec.affectedUsers,
    errorEvents: spec.errorEvents,
    startedAt,
    resolvedAt,
    owner: OWNERS[spec.owner],
    userImpactPct: spec.userImpactPct,
    errorRatePct: spec.errorRatePct,
    errorRateDeltaPct: spec.errorRateDeltaPct,
    timeToDetect: spec.timeToDetect,
    evidence: {
      topError: spec.topError,
      endpoint: {
        method: spec.endpoint.method,
        path: spec.endpoint.path,
        errors: endpointErrors,
        errorRatePct: spec.errorRatePct,
        failed: endpointErrors,
        total: endpointTotal,
      },
      exampleRequest: {
        method: spec.endpoint.method === 'ALL' ? 'GET' : spec.endpoint.method,
        path: spec.endpoint.path.replace('*', 'status'),
        fields: ['trace_id', 'tenant_id', 'user_id', 'status', 'duration_ms'],
      },
    },
    verification,
    likelyCause: {
      title: spec.cause.title,
      explanation: spec.cause.explanation,
      confidence: spec.cause.confidence,
      stackTrace: spec.stack,
      decision: spec.decision,
    },
    timeline,
    recommendedActions: spec.actions,
    related,
    series,
  }
}

const INCIDENTS: Incident[] = SPECS.map(buildIncident).sort(
  (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
)

export function listIncidents(): Incident[] {
  return INCIDENTS
}

export function getIncident(id: string): Incident | undefined {
  return INCIDENTS.find((i) => i.id === id)
}

export function incidentCounts(): {
  total: number
  active: number
  bySeverity: Record<Severity, number>
} {
  const bySeverity: Record<Severity, number> = { critical: 0, error: 0, warning: 0, info: 0 }
  let active = 0
  for (const i of INCIDENTS) {
    bySeverity[i.severity]++
    if (i.status !== 'resolved') active++
  }
  return { total: INCIDENTS.length, active, bySeverity }
}
