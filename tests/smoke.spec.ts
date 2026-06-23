import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test('loads and shows hero headline', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('text=Your knowledge is')).toBeVisible()
  })

  test('footer has legal links', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('.lp-footer')
    await expect(footer.locator('a:has-text("Terms")')).toBeVisible()
    await expect(footer.locator('a:has-text("Privacy")')).toBeVisible()
  })
})

test.describe('Legal pages', () => {
  test('terms page loads', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.locator('h1')).toHaveText('Terms of Service')
    await expect(page.locator('h2').first()).toContainText('Acceptance')
  })

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.locator('h1')).toHaveText('Privacy Policy')
    await expect(page.locator('h2').first()).toContainText('Information We Collect')
  })
})

test.describe('Auth pages', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})

test.describe('404 handling', () => {
  test('unknown route shows 404', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.locator('text=404')).toBeVisible()
  })
})

test.describe('Mobile responsiveness', () => {
  test('landing page is responsive on mobile', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile-chrome', 'Only runs on mobile-chrome project')
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
    const viewport = page.viewportSize()
    expect(viewport?.width).toBeLessThanOrEqual(393)
  })
})
