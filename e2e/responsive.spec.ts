import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test('phone-class public use displays the unsupported notice', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Desktop required' })).toBeVisible()
  await expect(page.getByText(/Mobile devices are not supported yet/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Learn', exact: true })).toHaveCount(0)
})
