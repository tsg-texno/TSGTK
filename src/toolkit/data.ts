import {z} from 'zod';

export const checklistSchema=z.object({items:z.array(z.object({id:z.string(),name:z.string().min(1).max(150),status:z.enum(['unknown','pass','fail']),note:z.string().max(1000)})).max(100),checkedAt:z.string()});
export const initialChecklist:Checklist={items:[['arma','Arma 3 запускается с нужным профилем'],['launcher','Лаунчер завершил проверку и обновление модов'],['teamspeak','TeamSpeak: подключение, микрофон и наушники проверены'],['tfar','TFAR: плагин включён и проверен на тренировочном сервере'],['mods','Выбран актуальный набор модов для предстоящей игры'],['briefing','Брифинг, роль и время сбора известны']].map(([id,name])=>({id,name,status:'unknown',note:''})),checkedAt:''};
export type Checklist=z.infer<typeof checklistSchema>;
export const journalEntrySchema=z.object({id:z.string().uuid(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),title:z.string().min(1).max(150),role:z.string().max(100),squad:z.string().max(100),notes:z.string().max(12000),lesson:z.string().max(4000),replayUrl:z.union([z.literal(''),z.string().url().startsWith('https://')])});
export type JournalEntry=z.infer<typeof journalEntrySchema>;
export const journalSchema=z.array(journalEntrySchema).max(2000);
export const missionSchema=z.object({id:z.string().uuid(),title:z.string().min(1).max(150),island:z.string().min(1).max(100),author:z.string().max(100),slots:z.number().int().min(0).max(1000),kind:z.enum(['attack','defense','meeting','other']),version:z.string().max(60),notes:z.string().max(6000)});
export type Mission=z.infer<typeof missionSchema>;
export const missionsSchema=z.array(missionSchema).max(3000);
export const eventSchema=z.object({id:z.string().uuid(),time:z.number().finite().min(0).max(86400),kind:z.enum(['contact','loss','objective','note']),unit:z.string().max(100),details:z.string().min(1).max(2000),x:z.number().finite().optional(),y:z.number().finite().optional()});
export type ReplayEvent=z.infer<typeof eventSchema>;
export const replaySchema=z.object({format:z.literal('tsg-toolkit-events'),version:z.literal(1),title:z.string().min(1).max(150),completed:z.literal(true),sourceUrl:z.union([z.literal(''),z.string().url().startsWith('https://')]),duration:z.number().finite().min(1).max(86400),events:z.array(eventSchema).max(20000)}).superRefine((r,c)=>{for(const e of r.events){if(e.time>r.duration)c.addIssue({code:'custom',message:'Событие выходит за длительность записи'});if((e.x===undefined)!==(e.y===undefined))c.addIssue({code:'custom',message:'Координаты X и Y задаются вместе'});}if(new Set(r.events.map(e=>e.id)).size!==r.events.length)c.addIssue({code:'custom',message:'Повторяющиеся ID событий'});});
export type Replay=z.infer<typeof replaySchema>;
export const emptyReplay:Replay={format:'tsg-toolkit-events',version:1,title:'Разбор игры',completed:true,sourceUrl:'',duration:3600,events:[]};
export const progressSchema=z.array(z.object({id:z.string().uuid(),topic:z.enum(['coordinates','bearing','distance','radio','channels','controls']),correct:z.boolean(),at:z.string().datetime()})).max(2000);
export type Progress=z.infer<typeof progressSchema>;
export const eventNames={contact:'Контакт',loss:'Потеря',objective:'Задача',note:'Заметка'};
export function clock(seconds:number){const t=Math.floor(seconds);return `${Math.floor(t/60).toString().padStart(2,'0')}:${(t%60).toString().padStart(2,'0')}`;}
export function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function replayMarkdown(r:Replay){return `# ${r.title}\n\nДлительность: ${clock(r.duration)}. Событий: ${r.events.length}.\nИсточник: ${r.sourceUrl||'ручной журнал'}\n\n## События\n\n`+[...r.events].sort((a,b)=>a.time-b.time).map(e=>`- ${clock(e.time)} · ${eventNames[e.kind]} · ${e.unit||'Без подразделения'}: ${e.details}`).join('\n')+'\n\nОтчёт построен по импортированному/ручному журналу, не по телеметрии TSG.\n';}
