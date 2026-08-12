import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('mobile workspace keeps tabs and verification reachable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('logic-game:workspace-tour:v1', 'seen'))
  await page.goto('./')
  await page.getByRole('button', { name: /Lab: experiment/i }).click()
  await page.getByRole('button', { name: 'Open Model Sandbox' }).click()
  await expect(page.getByRole('tab', { name: 'model' })).toBeVisible()
  await page.getByRole('tab', { name: 'result' }).click()
  await expect(page.getByRole('button', { name: 'Verify objective' })).toBeVisible()
})
