import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign } from './helpers'

test('Griffdive Achieved shows a compact recap and gates the Pardon on settled debt', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await dismissWarbondIntro(page)
  await page.waitForFunction(() => localStorage.getItem('griffdive:saves:v2'))
  await page.evaluate(() => {
    const key = 'griffdive:saves:v2'
    const index = JSON.parse(localStorage.getItem(key) || '{}')
    const save = index[Object.keys(index)[0]!]
    save.state.phase = 'complete'
    save.state.achieved = true
    save.state.difficulty = 10
    save.state.missionIndex = 16
    save.state.missionInOperation = 3
    save.state.divers[0].credits = 77
    save.state.actionLog = [
      { type: 'PICK_REWARD', playerId: save.state.divers[0].id, optionId: 'sample' },
      { type: 'HOLD_PACT', playerId: save.state.divers[0].id, pactId: 'cleanHands' },
      { type: 'FAIL_PACT', playerId: save.state.divers[0].id, pactId: 'coldSteel' },
    ]
    localStorage.setItem(key, JSON.stringify(index))
  })

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Griffdive Achieved' })).toBeVisible()
  const recap = page.getByRole('region', { name: 'Run recap', exact: true })
  await expect(recap).toContainText('Items banked')
  await expect(recap).toContainText('Squad credits')
  await expect(recap).toContainText('Pacts held')
  await expect(recap).toContainText('Pacts broken')
  await expect(recap).toContainText('77')
  await expect(page.getByText('Ministry notice')).toHaveCount(0)

  await page.evaluate(() => {
    const key = 'griffdive:saves:v2'
    const index = JSON.parse(localStorage.getItem(key) || '{}')
    const save = index[Object.keys(index)[0]!]
    save.state.debtSettled = true
    localStorage.setItem(key, JSON.stringify(index))
  })
  await page.reload()
  await expect(page.getByText('Ministry notice')).toBeVisible()
  await expect(page.getByText(/Penance was served or your directive tax paid/)).toBeVisible()
})
