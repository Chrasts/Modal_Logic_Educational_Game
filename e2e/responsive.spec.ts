import { expect, test } from '@playwright/test'

const desktopViewports = [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]

for (const viewport of desktopViewports) {
  test(`Home remains fully reachable at ${viewport.width} x ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.addInitScript(() => localStorage.setItem('logic-game:workspace-tour:v1', 'seen'))
    await page.goto('./')
    const title = page.getByRole('heading', { name: 'Modal Logic Lab - Interactive Kripke Models' })
    await expect(title).toBeVisible()
    const box = await title.boundingBox()
    expect(box?.y).toBeGreaterThanOrEqual(0)
    await expect(page.getByRole('button', { name: 'Start or continue Learn Modal Logic' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Campaigns: longer challenges/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Lab: experiment with models and formulas/ })).toBeVisible()
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth, height: innerHeight, contentHeight: document.documentElement.scrollHeight }))
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
    if (dimensions.contentHeight > dimensions.height) {
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
      expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0)
    }
  })
}

test('Home Continue card resumes a live lesson without clipping its heading', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.addInitScript(() => localStorage.setItem('logic-game:workspace-tour:v1', 'seen'))
  await page.goto('./')
  await page.getByRole('button', { name: 'Start or continue Learn Modal Logic' }).click()
  const skip = page.getByRole('button', { name: 'Skip introduction' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
  const startTask = page.getByRole('button', { name: 'Start task' })
  if (await startTask.isVisible().catch(() => false)) await startTask.click()
  const missionTitle = page.getByRole('region', { name: 'Current lesson' }).locator('strong').first()
  const title = await missionTitle.textContent()
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Continue current session' })).toContainText(title ?? '')
  const homeTitle = page.getByRole('heading', { name: 'Modal Logic Lab - Interactive Kripke Models' })
  expect((await homeTitle.boundingBox())?.y).toBeGreaterThanOrEqual(0)
  await page.getByRole('button', { name: 'Resume lesson' }).click()
  await expect(page.getByRole('region', { name: 'Current lesson' })).toContainText(title ?? '')
})

test.describe('phone-class public use', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('displays the unsupported notice', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('heading', { name: 'Desktop required' })).toBeVisible()
    await expect(page.getByText(/Mobile devices are not supported yet/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Learn', exact: true })).toHaveCount(0)
  })
})
