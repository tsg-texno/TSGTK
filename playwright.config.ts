import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:['editor.spec.ts','toolkit.spec.ts'],timeout:60000,use:{baseURL:'http://127.0.0.1:4173',channel:'chrome',headless:true,viewport:{width:1440,height:1000}},reporter:'list',outputDir:'../../work/browser-results'});
