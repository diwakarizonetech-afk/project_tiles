import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
await mkdir('test-results',{recursive:true})
const server=await createServer({server:{host:'127.0.0.1',port:0}})
await server.listen()
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']})
try {
  const page=await browser.newPage({viewport:{width:1200,height:800}})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/api/tile-designs',route=>route.fulfill({json:[]}))
  await page.goto(server.resolvedUrls.local[0])
  await page.getByRole('button',{name:'STEP INSIDE',exact:true}).waitFor({timeout:60000})
  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('aura-wall-styles')))
  for(const [preset,room,file] of [['Boutique bedroom','Master suite','bedroom'],['Warm stone bathroom','Bathroom','bathroom']]){
    await page.getByRole('button',{name:'INSPIRATION',exact:true}).click()
    await page.getByRole('button',{name:new RegExp(preset)}).click()
    await page.waitForTimeout(1800)
    assert.match(await page.locator('.scene-status').innerText(),new RegExp(room))
    assert.equal(await page.locator('.graphics-error').count(),0)
    await page.screenshot({path:'test-results/reference-'+file+'.jpg',type:'jpeg',quality:65})
  }
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('aura-wall-styles')))
  assert.deepEqual(saved.slice(0,8),original.slice(0,8),'Other rooms remain unchanged')
  assert.equal(saved[10].image,'/tiles/patterned_slate_tiles.jpg')
  assert.equal(saved[14].image,'/tiles/floor_tiles_08.jpg')
  await page.reload()
  await page.getByRole('button',{name:'STEP INSIDE',exact:true}).waitFor({timeout:60000})
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('aura-wall-styles'))),saved,'Wall images survive reload')
  assert.deepEqual(errors,[])
  console.log('PASS: room presets, room isolation, wall image persistence, no JS errors; screenshots captured')
} finally {await browser.close();await server.close()}
