import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

await mkdir('test-results/audit', { recursive: true })

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-swiftshader']
})

const auditLog = []

function checkOverflow(page, label) {
  return page.evaluate((lbl) => {
    const docWidth = document.documentElement.scrollWidth
    const winWidth = window.innerWidth
    const bodyWidth = document.body.scrollWidth
    const hasHOverflow = docWidth > winWidth + 1 || bodyWidth > winWidth + 1
    const issues = []
    if (hasHOverflow) {
      issues.push(`Horizontal overflow detected on ${lbl}: docWidth=${docWidth}, winWidth=${winWidth}`)
    }
    // Check if any buttons or inputs have 0 height or are hidden unintentionally
    document.querySelectorAll('button:not([hidden]), input:not([type="hidden"])').forEach((el) => {
      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        if (rect.width === 0 && rect.height === 0 && el.offsetParent !== null) {
          issues.push(`Zero-dimension element: <${el.tagName.toLowerCase()} class="${el.className}"> in ${lbl}`)
        }
      }
    })
    return issues
  }, label)
}

for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  const errors = []
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('net::ERR_CONNECTION_REFUSED')) {
      errors.push(msg.text())
    }
  })
  page.on('pageerror', err => errors.push(err.message))

  try {
    console.log(`\n=== Auditing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`)
    await page.goto('http://localhost:5173/?room=0', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    // Check main page
    await page.screenshot({ path: `test-results/audit/${vp.name}-01-home.png`, fullPage: false })
    const mainIssues = await checkOverflow(page, `${vp.name}-home`)
    auditLog.push(...mainIssues)

    // Check header menu on mobile/tablet
    if (vp.width <= 768) {
      const toggle = page.locator('.tv-menu-toggle-btn')
      if (await toggle.isVisible()) {
        await toggle.click()
        await page.waitForTimeout(300)
        await page.screenshot({ path: `test-results/audit/${vp.name}-02-mobile-menu.png` })
        const menuIssues = await checkOverflow(page, `${vp.name}-menu`)
        auditLog.push(...menuIssues)
        await toggle.click()
        await page.waitForTimeout(300)
      }
    }

    // Check Collections Modal
    const colBtn = page.getByRole('button', { name: 'COLLECTIONS', exact: true }).first()
    if (await colBtn.isVisible()) {
      await colBtn.click()
      await page.waitForTimeout(600)
      await page.screenshot({ path: `test-results/audit/${vp.name}-03-collections-modal.png` })
      const colIssues = await checkOverflow(page, `${vp.name}-collections`)
      auditLog.push(...colIssues)
      
      // Close dialog
      const closeBtn = page.getByRole('button', { name: 'Close dialog', exact: true })
      if (await closeBtn.isVisible()) await closeBtn.click()
      await page.waitForTimeout(300)
    }

    // Check Room 4 (Bathroom with 7 layers)
    await page.goto('http://localhost:5173/?room=4', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `test-results/audit/${vp.name}-04-bathroom-room4.png` })

    // Check Room 5 (Modern House Entrance)
    await page.goto('http://localhost:5173/?room=5', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `test-results/audit/${vp.name}-05-entrance-room5.png` })

    // Check Explore Login Modal
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    const userBtn = page.getByRole('button', { name: 'User Account' })
    if (await userBtn.isVisible()) {
      await userBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `test-results/audit/${vp.name}-06-auth-modal.png` })
      const authClose = page.locator('.tv-auth-modal-close')
      if (await authClose.isVisible()) await authClose.click()
      await page.waitForTimeout(300)
    }

    // Check Admin page
    await page.goto('http://localhost:5173/admin', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `test-results/audit/${vp.name}-07-admin-login.png` })
    const adminIssues = await checkOverflow(page, `${vp.name}-admin-login`)
    auditLog.push(...adminIssues)

    if (errors.length) {
      console.log(`Console errors on ${vp.name}:`, errors)
    }
  } finally {
    await page.close()
  }
}

await browser.close()
console.log('\n--- Audit Issues Detected ---')
if (auditLog.length === 0) {
  console.log('No overflow or element sizing defects detected by automated scanner.')
} else {
  auditLog.forEach(issue => console.log('!', issue))
}
