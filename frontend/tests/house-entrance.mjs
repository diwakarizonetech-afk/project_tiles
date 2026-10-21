import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { createServer } from 'vite'

const appDir=process.cwd(),server=await createServer({server:{host:'127.0.0.1',port:0,strictPort:false}})
await server.listen()
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:1050}}),pageErrors=[]
page.on('pageerror',error=>pageErrors.push(error.message))
await page.route('http://localhost:8000/api/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}))
await page.route('http://localhost:8000/catalog/**',async route=>{
  const file=basename(new URL(route.request().url()).pathname)
  try{await route.fulfill({status:200,contentType:'image/jpeg',body:await readFile(resolve(appDir,'..','backend','catalog',file))})}
  catch{await route.fulfill({status:404,body:'Missing local fallback asset'})}
})
try{
  await page.goto(server.resolvedUrls.local[0],{waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'STEP INSIDE',exact:true}).waitFor({timeout:30000})
  const entrance=page.locator('.room-nav').getByRole('button',{name:/Modern House Entrance/})
  await entrance.click()
  await page.waitForFunction(()=>document.querySelector('.room-nav button[aria-pressed="true"]')?.textContent?.includes('Modern House Entrance')===true,null,{timeout:15000})
  assert.equal(await entrance.getAttribute('aria-pressed'),'true')
  await page.screenshot({path:'test-results/modern-house-entrance.png'})

  const model=await page.evaluate(async()=>{
    const {canStandInHouseEntrance,createHouseEntrance,HOUSE_ENTRANCE_DIMENSIONS}=await import('/src/houseEntrance.ts')
    const scene=createHouseEntrance(),wallIds=[...new Set(scene.walls.map(wall=>wall.userData.wallId))].sort((a,b)=>a-b)
    let meshes=0;scene.root.traverse(object=>{if(object.isMesh)meshes++})
    return {floorCount:scene.floors.length,wallIds,walkAreas:scene.walkAreas.length,obstacles:scene.obstacles.length,meshes,parkingSurface:scene.root.getObjectByName('House entrance / separate parking paving')?.userData.parkingSurface===true,dimensions:HOUSE_ENTRANCE_DIMENSIONS,
      spawnValid:canStandInHouseEntrance(4,22.5,scene.walkAreas,scene.obstacles),entryDoorClear:canStandInHouseEntrance(4,9.1,scene.walkAreas,scene.obstacles),carBlocked:!canStandInHouseEntrance(-4,5.6,scene.walkAreas,scene.obstacles),partitionBlocked:!canStandInHouseEntrance(0,5,scene.walkAreas,scene.obstacles)}
  })
  assert.equal(model.floorCount,3,'Hall, entrance and portico each have an independent tile target')
  assert.equal(model.parkingSurface,true,'Parking paving remains separate from customizable entrance tile surfaces')
  assert.deepEqual(model.wallIds,[24,25,26,27,28,29],'Six physical wall groups have separate style IDs')
  assert.ok(model.meshes>80&&model.walkAreas>=5&&model.obstacles>=15,`House geometry metrics: ${JSON.stringify(model)}`)
  assert.ok(model.spawnValid&&model.entryDoorClear&&model.carBlocked&&model.partitionBlocked,`Walkability metrics: ${JSON.stringify(model)}`)

  assert.deepEqual(pageErrors,[],'No browser runtime exceptions')
  console.log('PASS: 06 Modern House Entrance selection, rendered scene screenshot, three tile targets, separate parking paving, six independent wall groups, collision checks, and no browser runtime exceptions.')
}finally{
  await browser.close();await server.close()
}
