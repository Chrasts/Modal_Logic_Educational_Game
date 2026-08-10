import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('logic-game:workspace-tour:v1', 'seen'))
  await page.goto('./')
  await page.getByRole('button', { name: /Sandbox: build/i }).click()
})

test('world drag, loose-handle relation, selection delete and undo remain stable', async ({ page }) => {
  const nodes = page.locator('.react-flow__node-world')
  await expect(nodes).toHaveCount(2)
  const firstBox = await nodes.nth(0).boundingBox()
  if (!firstBox) throw new Error('First world is not measurable')
  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
  await page.mouse.down(); await page.mouse.move(firstBox.x + 40, firstBox.y + 55, { steps: 8 }); await page.mouse.up()
  await expect(nodes).toHaveCount(2)

  const source = nodes.nth(1).locator('.react-flow__handle[data-handleid="left"]')
  const target = nodes.nth(0).locator('.react-flow__handle[data-handleid="top"]')
  const sourceBox = await source.boundingBox(); const targetBox = await target.boundingBox()
  if (!sourceBox || !targetBox) throw new Error('Loose handles are not measurable')
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
  await page.mouse.down(); await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 }); await page.mouse.up()
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)

  await nodes.nth(1).click()
  await page.keyboard.press('Delete')
  await expect(nodes).toHaveCount(1)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(nodes).toHaveCount(2)
})

test('blank-pane double click adds exactly one world without zooming', async ({ page }) => {
  const nodes = page.locator('.react-flow__node-world')
  const viewport = page.locator('.react-flow__viewport')
  const before = await viewport.getAttribute('style')
  const pane = page.locator('.react-flow__pane')
  const box = await pane.boundingBox()
  if (!box) throw new Error('Map pane is not measurable')
  await page.mouse.dblclick(box.x + box.width * .52, box.y + box.height * .78)
  await expect(nodes).toHaveCount(3)
  const after = await viewport.getAttribute('style')
  expect(after?.match(/scale\([^)]*\)/)?.[0]).toBe(before?.match(/scale\([^)]*\)/)?.[0])
})

test('Tidy supports Undo/Redo, reciprocal routing survives another edge, and reflexivity uses the badge', async ({ page }) => {
  await page.getByRole('button', { name: 'Tidy model' }).click()
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled()
  await page.getByRole('button', { name: 'Redo' }).click()

  await page.getByRole('button', { name: '+ Add edge' }).click()
  await page.getByLabel('New relation source world').selectOption('w1')
  await page.getByLabel('New relation target world').selectOption('w0')
  await page.getByRole('button', { name: 'Add relation' }).click()
  await expect(page.locator('.bidirectional-edge')).toHaveCount(1)

  await page.getByRole('button', { name: '+ Add edge' }).click()
  await page.getByLabel('New relation source world').selectOption('w0')
  await page.getByLabel('New relation target world').selectOption('w0')
  await page.getByRole('button', { name: 'Add relation' }).click()
  await expect(page.locator('.bidirectional-edge')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /Reflexive accessibility at w0, explicit/ })).toBeVisible()
})
