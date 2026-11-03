import {test,expect} from '@playwright/test';
test('шесть раций: органы управления, память каналов и задания',async({page,context})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#academy');await page.getByRole('button',{name:/Рации TFAR/}).click();
 for(const model of ['anprc152','anprc148jem','fadak','rt1523g','mr3000','anprc155']){
  await page.getByLabel('Модель рации').selectOption(model);const device=page.locator('.tk-radio-device');
  if(await device.locator('[data-control="channel3"]').count())await device.locator('[data-control="channel3"]').click();else if(await device.locator('[data-control="next"]').count()){await device.locator('[data-control="next"]').click({clickCount:1});await device.locator('[data-control="next"]').click();}else{await device.locator('[data-control="channelKnob"]').click({button:'right'});await device.locator('[data-control="channelKnob"]').click({button:'right'});}
  await page.getByLabel('Частота на дисплее').fill('43.7');await device.locator('[data-control="enter"]').click();
  for(let i=0;i<3;i++)if(await device.locator('[data-control="volumeUp"]').count())await device.locator('[data-control="volumeUp"]').click();else await device.locator('[data-control="volumeKnob"]').click({button:'right'});
  await device.locator('[data-control="stereo"]').click();await device.locator('[data-control="speakers"]').click();await page.getByRole('button',{name:'Проверить настройку рации'}).click();await expect(page.getByText('Рация настроена верно',{exact:true})).toBeVisible();
 }
 await page.getByLabel('Модель рации').selectOption('anprc152');await page.getByLabel('Частота на дисплее').fill('999');await page.locator('[data-control="enter"]').click();await expect(page.getByText(/Частота должна быть в диапазоне/)).toBeVisible();await expect(page.getByLabel('Модель рации')).toBeVisible();
 await page.getByRole('button',{name:'Начать заново',exact:true}).click();await page.screenshot({path:'../../work/radio-prc152.png',fullPage:true});await page.getByLabel('Модель рации').selectOption('mr3000');await page.screenshot({path:'../../work/radio-mr3000.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await page.getByRole('button',{name:/Рации TFAR/}).click();await expect(page.locator('.tk-radio-device')).toBeVisible();await context.setOffline(false);expect(errors).toEqual([]);
});
