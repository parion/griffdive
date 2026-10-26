import { expect, test } from '@playwright/test'

// The design sheet is a staging/dev surface. The E2E server is a production
// build with no FLY_APP_NAME, so it must answer like production: a 404, never
// the SPA shell.
test('the design sheet is unreachable outside staging', async ({ request }) => {
  const response = await request.get('/kit')
  expect(response.status()).toBe(404)
})
