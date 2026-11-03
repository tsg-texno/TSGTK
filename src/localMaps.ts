import {z} from 'zod';
export const localMapsSchema=z.array(z.object({id:z.string().regex(/^[a-z0-9_-]+$/i),name:z.string().max(200),width:z.number().positive().max(1000000),height:z.number().positive().max(1000000),url:z.string().regex(/^local-maps\/[a-z0-9_-]+\.png$/i)}));
export type LocalMap=z.infer<typeof localMapsSchema>[number];
export async function readLocalMap(map:LocalMap){
 const response=await fetch('./'+map.url);if(!response.ok)throw Error('Подложка не найдена. Повторите локальный импорт карт.');const blob=await response.blob();if(blob.size>25*1024*1024)throw Error('Подложка превышает 25 МБ');
 return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Не удалось прочитать подложку'));reader.readAsDataURL(blob);});
}
