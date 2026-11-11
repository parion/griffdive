import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign } from './helpers'

test('Griffdive Achieved shows the run record and gates the Pardon on settled debt', async ({ page }) => {
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
    save.state.personalInventories[save.state.divers[0].id].push('ar2coyote')
    save.state.actionLog = [
      { type: 'PICK_REWARD', playerId: save.state.divers[0].id, optionId: 'sample' },
      { type: 'HOLD_PACT', playerId: save.state.divers[0].id, pactId: 'cleanHands' },
      { type: 'FAIL_PACT', playerId: save.state.divers[0].id, pactId: 'coldSteel' },
    ]
    localStorage.setItem(key, JSON.stringify(index))
  })

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Freedom was earned.' })).toBeVisible()
  await expect(page.getByText('Griffdive achieved', { exact: true })).toBeVisible()
  const recap = page.getByRole('region', { name: 'Run recap', exact: true })
  await expect(recap).toContainText('Missions flown')
  await expect(recap).toContainText('16')
  await expect(recap).toContainText('3→10')
  await expect(recap).toContainText('Gear earned')
  const squad = page.getByRole('region', { name: 'The squad' })
  await expect(squad.getByRole('list', { name: /Best gear:/ })).toBeVisible()
  await expect(squad.getByRole('img', { name: '77 credits' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download recap (PNG)' })).toBeVisible()
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

test('an ended crusade lands on the same record with the file closed', async ({ page }) => {
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
    save.state.achieved = false
    save.state.difficulty = 6
    save.state.missionIndex = 10
    localStorage.setItem(key, JSON.stringify(index))
  })

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Service is recorded.' })).toBeVisible()
  await expect(page.getByText('Ministry notice · File closed')).toBeVisible()
  await expect(page.getByText('Finished on the starting kit.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete save' })).toBeVisible()
  await expect(page.getByRole('button', { name: /endless mode/ })).toHaveCount(0)
})
