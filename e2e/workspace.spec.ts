import { expect, test, type Locator } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('logic-game:workspace-tour:v1', 'seen'))
  await page.goto('./')
  await page.getByRole('button', { name: /Lab: experiment/i }).click()
  await page.getByRole('button', { name: 'Open Model Sandbox' }).click()
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

test('selecting a world and typing starts editing its valuation', async ({ page }) => {
  await page.getByLabel(/World w0, atoms/).click()
  await page.keyboard.type('q')
  await expect(page.getByRole('textbox', { name: 'True atoms' }).first()).toBeFocused()
  await expect(page.getByRole('textbox', { name: 'True atoms' }).first()).toHaveValue(/q/)
})

test('Tidy supports Undo/Redo, reciprocal routing survives another relation, and reflexivity uses the badge', async ({ page }) => {
  await page.getByRole('button', { name: 'Tidy model' }).click()
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled()
  await page.getByRole('button', { name: 'Redo' }).click()

  await page.getByRole('button', { name: '+ Add relation' }).click()
  await page.getByLabel('New relation source world').selectOption('w1')
  await page.getByLabel('New relation target world').selectOption('w0')
  await page.getByRole('button', { name: 'Add relation', exact: true }).click()
  await expect(page.locator('.bidirectional-edge')).toHaveCount(1)

  await page.getByRole('button', { name: '+ Add relation' }).click()
  await page.getByLabel('New relation source world').selectOption('w0')
  await page.getByLabel('New relation target world').selectOption('w0')
  await page.getByRole('button', { name: 'Add relation', exact: true }).click()
  await expect(page.locator('.bidirectional-edge')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /Reflexive accessibility at w0, explicit/ })).toBeVisible()
})

test('the map exclusively owns wheel pan and pinch while controls and minimap are inert', async ({ page }) => {
  const pane = page.locator('.react-flow__pane')
  const viewport = page.locator('.react-flow__viewport')
  const transform = () => viewport.evaluate((element) => (element as HTMLElement).style.transform)
  const dispatchWheel = async (target: Locator, init: WheelEventInit) => target.evaluate((element, eventInit) => element.dispatchEvent(new WheelEvent('wheel', { ...eventInit, bubbles: true, cancelable: true })), init)

  const initial = await transform()
  await dispatchWheel(pane, { deltaX: 42, deltaY: 31 })
  await expect.poll(transform).not.toBe(initial)
  const afterPan = await transform()

  await dispatchWheel(pane, { deltaY: -90, ctrlKey: true, clientX: 320, clientY: 240 })
  await expect.poll(transform).not.toBe(afterPan)
  const afterPinch = await transform()

  await dispatchWheel(page.getByRole('button', { name: 'Fit model' }), { deltaY: 80 })
  expect(await transform()).toBe(afterPinch)
  await dispatchWheel(page.locator('.react-flow__minimap'), { deltaY: -80, ctrlKey: true })
  expect(await transform()).toBe(afterPinch)
})
