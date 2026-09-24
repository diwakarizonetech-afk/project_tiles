import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'

const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']})
try {
  const page=await browser.newPage({viewport:{width:1536,height:811}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
  page.on('requestfailed',request=>errors.push(`REQUEST ${request.url()} ${request.failure()?.errorText}`))
  await page.goto('http://localhost:5173',{waitUntil:'networkidle',timeout:90000})
  await page.getByRole('button',{name:'STEP INSIDE',exact:true}).waitFor({timeout:60000})
  const cdp=await page.context().newCDPSession(page)
  const shot=async()=>{const box=await page.locator('.three-host').boundingBox();assert.ok(box);const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false,clip:{x:box.x,y:box.y,width:box.width,height:box.height,scale:1}});return Buffer.from(result.data,'base64')}
  const floorBefore=await shot()
  await page.getByRole('button',{name:'COLLECTIONS',exact:true}).click()
  await page.getByRole('combobox',{name:'Collection application scope'}).selectOption('all')
  await page.getByRole('dialog').getByRole('button',{name:'Apply Verde Alpi',exact:true}).click()
  await page.waitForTimeout(1500)
  const floorAfter=await shot()
  assert.equal(await page.locator('.product-heading h3').innerText(),'Verde Alpi')
  const floorChanged=!floorBefore.equals(floorAfter)
  const wallBefore=await shot()
  await page.getByRole('button',{name:'WALL TILES',exact:true}).click()
  await page.getByRole('combobox',{name:'Wall tile target'}).selectOption('2')
  await page.getByRole('dialog').getByRole('button',{name:'Apply Natural Stone Wall',exact:true}).click()
  await page.waitForTimeout(1500)
  const wallAfter=await shot()
  const wallChanged=!wallBefore.equals(wallAfter)
  assert.ok(floorChanged,'Live backend floor tile must alter the rendered floor')
  assert.ok(wallChanged,'Live backend wall tile must alter the rendered wall')
  assert.deepEqual(errors,[])
  console.log('PASS: live backend floor and wall textures render')
} finally {
  await browser.close()
}
