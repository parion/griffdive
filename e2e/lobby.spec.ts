import { expect, test } from '@playwright/test'

test('a stranger finds an open dive in the lobby and joins in one click', async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto('/')
  await pageA.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(pageA).toHaveURL(/\/dive\/([A-Z0-9]{6})/)
  const roomCode = pageA.url().match(/([A-Z0-9]{6})$/)?.[1]
  expect(roomCode).toBeTruthy()

  await pageA.getByRole('button', { name: 'Launch crusade' }).click()
  await expect(pageA.getByText('Wheel of Misfortune')).toBeVisible()
  await pageA.getByRole('button', { name: 'Open to lobby' }).click()
  await expect(pageA.getByRole('button', { name: 'Close to lobby' })).toBeVisible()

  // The stranger browses the lobby, filters it, then joins.
  await pageB.goto('/lobby')
  await expect(pageB.getByText(roomCode!)).toBeVisible()

  await pageB.getByLabel('Variant').selectOption('soloDuo')
  await expect(pageB.getByText('No open dives match those filters.')).toBeVisible()
  await pageB.getByLabel('Variant').selectOption('any')
  await expect(pageB.getByText(roomCode!)).toBeVisible()

  await pageB.getByRole('link', { name: 'Join dive' }).click()
  await expect(pageB).toHaveURL(new RegExp(`/dive/${roomCode}$`))
  await expect(pageB.locator('.diver-chip')).toHaveCount(2)

  await contextA.close()
  await contextB.close()
})
