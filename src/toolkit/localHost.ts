import {useEffect,useState} from 'react';import {z} from 'zod';
export const localSettingsSchema=z.object({rptDirectory:z.string(),armaDirectory:z.string(),teamSpeakDirectory:z.string(),modDirectories:z.array(z.string())});
export type LocalSettings=z.infer<typeof localSettingsSchema>;
const hostSchema=z.object({available:z.boolean(),armaRunning:z.boolean().nullable(),teamSpeakRunning:z.boolean().nullable()}).passthrough();
const statusSchema=z.object({version:z.literal(1),settings:localSettingsSchema,rptDirectory:z.string(),host:hostSchema});
export type LocalHostStatus=z.infer<typeof statusSchema>;
export const rptsSchema=z.object({directory:z.string(),host:hostSchema,files:z.array(z.object({name:z.string(),size:z.number(),modified:z.string(),modifiedMs:z.number()}))});
export const preflightResultSchema=z.object({at:z.string(),rptDirectory:z.string(),armaRunning:z.boolean().nullable(),checks:z.array(z.object({id:z.string(),name:z.string(),status:z.enum(['pass','fail','unknown','info']),evidence:z.string()}))});
export async function localRequest(path:string,body?:unknown){const response=await fetch('/api/local/'+path,{method:body===undefined?'GET':'POST',headers:{'X-TSG-Local':'1',...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000),cache:'no-store'});if(!response.ok){const json=await response.json().catch(()=>null);throw Error(json?.error||'Локальный доступ не запущен. Используйте npm run local вместо preview.');}return response.json();}
export function useLocalHost(){const [host,setHost]=useState<LocalHostStatus|null>(null);const [error,setError]=useState('');const [checking,setChecking]=useState(false);
 async function refresh(){setChecking(true);try{setHost(statusSchema.parse(await localRequest('status')));setError('');}catch{setHost(null);setError('Автодоступ к компьютеру доступен при запуске npm run local. Ручная работа остаётся доступной.');}finally{setChecking(false);}}
 useEffect(()=>{void refresh();},[]);return {host,error,checking,refresh};
}
