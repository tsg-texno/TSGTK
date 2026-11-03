import {openDB} from 'idb';
import {useEffect,useRef,useState} from 'react';
import type {z} from 'zod';
export const toolkitDb=()=>openDB('tsg-toolkit-v1',1,{upgrade(db){db.createObjectStore('documents');}});
export async function readDocument(key:string){const db=await toolkitDb();try{return await db.get('documents',key);}finally{db.close();}}
export async function writeDocument(key:string,value:unknown){const db=await toolkitDb();try{await db.put('documents',value,key);}finally{db.close();}}
export function useDocument<T>(key:string,schema:z.ZodType<T>,initial:T){
 const [value,setValue]=useState<T>(initial);const [ready,setReady]=useState(false);const [status,setStatus]=useState('Загрузка…');const [error,setError]=useState('');const queue=useRef(Promise.resolve());const revision=useRef(0);const active=useRef(true);
 useEffect(()=>{active.current=true;readDocument(key).then(v=>{if(!active.current)return;setValue(v===undefined?initial:schema.parse(v));setReady(true);setStatus('На этом устройстве');}).catch(e=>{if(active.current)setError(`Не удалось прочитать данные: ${e}`);});return()=>{active.current=false;};},[key]);
 function update(next:T){if(!ready)return Promise.reject(Error('Хранилище ещё не готово'));let parsed:T;try{parsed=schema.parse(next);}catch(e){setError(String(e));return Promise.reject(e);}setValue(parsed);setStatus('Сохранение…');setError('');const version=++revision.current;
  const task=queue.current.then(()=>writeDocument(key,parsed));queue.current=task.catch(()=>{});task.then(()=>{if(active.current&&revision.current===version)setStatus('Сохранено на устройстве');}).catch(e=>{if(active.current){setError(`Не сохранено: ${e}`);setStatus('Ошибка сохранения');}});return task;
 }
 return {value,update,ready,status,error};
}
export function saveDownload(filename:string,text:string,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function exportJson(filename:string,data:unknown){saveDownload(filename,JSON.stringify(data,null,2));}
export async function readJsonFile(file:File,maxMb=10){if(file.size>maxMb*1024*1024)throw Error(`Файл превышает ${maxMb} МБ`);return JSON.parse(await file.text());}
