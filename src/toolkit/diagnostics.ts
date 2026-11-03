export type Finding={key:string;rule:string;title:string;severity:'error'|'warning';count:number;lines:number[];sample:string;advice:string};
const rules:[string,RegExp,string,'error'|'warning',string][]=[
 ['dependency',/(?:addon\s+.+\s+requires addon|missing addons?[: ]|cannot play\/edit this mission)/i,'Отсутствующая зависимость','error','Сверьте названные зависимости с набором модов в лаунчере. Повторите проверку файлов.'],
 ['asset',/(?:cannot (?:open|load).*\.(?:pbo|paa|p3d|ogg)|cannot load (?:texture|material)|file .+ not found)/i,'Не удалось загрузить ресурс','warning','Проверьте указанный файл и целостность мода. Одна строка не доказывает причину сбоя.'],
 ['config',/no entry\s+['"]|updating base class/i,'Сообщение конфигурации','warning','Сравните версии модов. Предупреждение может быть не связано с наблюдаемой неисправностью.'],
 ['script',/(?:error in expression|error (?:undefined variable|type |missing ))/i,'Ошибка скрипта','error','Сохраните контекст строки и сообщите автору миссии/мода. Не меняйте игровые файлы по одной догадке.'],
 ['crash',/(?:exception code|access violation|out of memory|cannot commit)/i,'Признак сбоя или нехватки памяти','error','Сопоставьте время с завершением игры; приложите относящийся к запуску RPT и crash-отчёт.'],
 ['network',/(?:session lost|steam authentication failed|connection failed)/i,'Сообщение подключения','warning','Проверьте время отключения и сравните с успешным запуском. Это не проверка доступности сервера.'],
 ['radio',/(?:task_force_radio|tfar).*(?:error|failed|not found|not connected)/i,'Сообщение TFAR','warning','Проверьте плагин TeamSpeak и подключение на отдельном тренировочном сервере.'],
];
export function redact(text:string){return text.replace(/[A-Z]:\\Users\\[^\\\s]+/gi,'C:\\Users\\[USER]').replace(/\/Users\/[^/\s]+|\/home\/[^/\s]+/g,'/[USER]').replace(/\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/g,'[IP]').replace(/\b7656119\d{10}\b/g,'[STEAM_ID]');}
export function analyzeLog(text:string){const grouped=new Map<string,Finding>();const rows=text.split(/\r?\n/);if(rows.length>300000)throw Error('Слишком много строк: максимум 300 000');let matches=0;
 for(let i=0;i<rows.length;i++){const line=rows[i];const rule=rules.find(r=>r[1].test(line));if(!rule)continue;matches++;const safe=redact(line).slice(0,1200);const normalized=safe.replace(/^\s*\d{1,2}:\d{2}:\d{2}(?:\.\d+)?\s*/,'').replace(/0x[0-9a-f]+/gi,'0x…').trim();const key=rule[0]+':'+normalized;const old=grouped.get(key);if(old){old.count++;if(old.lines.length<8)old.lines.push(i+1);}else if(grouped.size<500)grouped.set(key,{key,rule:rule[0],title:rule[2],severity:rule[3],count:1,lines:[i+1],sample:safe,advice:rule[4]});}
 return {lineCount:rows.length,matchCount:matches,truncated:grouped.size===500,findings:[...grouped.values()].sort((a,b)=>b.count-a.count)};
}
export type LogReport=ReturnType<typeof analyzeLog>;
export function compareLogs(current:LogReport,previous:LogReport){const before=new Map(previous.findings.map(f=>[f.key,f.count]));const now=new Set(current.findings.map(f=>f.key));return {added:current.findings.filter(f=>!before.has(f.key)),resolved:previous.findings.filter(f=>!now.has(f.key)),increased:current.findings.filter(f=>before.has(f.key)&&f.count>before.get(f.key)!)};}
export async function readLogFile(file:File){if(file.size>20*1024*1024)throw Error('Максимум 20 МБ на RPT');const bytes=await file.arrayBuffer();const utf8=new TextDecoder().decode(bytes);return utf8.includes('\uFFFD')?new TextDecoder('windows-1251').decode(bytes):utf8;}

export type ValidationIssue={line:number;severity:'error'|'warning';message:string};
export function validateMissionText(text:string,availableAddons?:Set<string>){
 const issues:ValidationIssue[]=[];const stack:{char:string;line:number}[]=[];let line=1;let quote='';let comment:''|'line'|'block'='';let clean='';let stringLine=1;let blockLine=1;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='\n')line++;
  if(comment==='line'){if(c==='\n'){comment='';clean+='\n';}else clean+=' ';continue;}
  if(comment==='block'){if(c==='*'&&n==='/'){comment='';i++;clean+='  ';}else clean+=c==='\n'?'\n':' ';continue;}
  if(quote){clean+=c;if(c===quote){if(n===quote){clean+=n;i++;}else quote='';}continue;}
  if(c==='/'&&n==='/'){comment='line';i++;clean+='  ';continue;}if(c==='/'&&n==='*'){comment='block';blockLine=line;i++;clean+='  ';continue;}
  clean+=c;if(c==='"'||c==="'"){quote=c;stringLine=line;continue;}
  if('{[('.includes(c))stack.push({char:c,line});else if('}])'.includes(c)){const open=stack.pop();if(!open||'{[('.indexOf(open.char)!=='}])'.indexOf(c))issues.push({line,severity:'error',message:`Несогласованная скобка ${c}`});}
 }
 if(quote)issues.push({line:stringLine,severity:'error',message:'Незакрытая строка'});if(comment==='block')issues.push({line:blockLine,severity:'error',message:'Незакрытый блочный комментарий'});for(const open of stack)issues.push({line:open.line,severity:'error',message:`Незакрытая скобка ${open.char}`});
 const dependencies=[...new Set([...clean.matchAll(/(?:addOns|requiredAddons)\s*\[\]\s*=\s*\{([^}]+)\}/gi)].flatMap(m=>[...m[1].matchAll(/"([^"]+)"/g)].map(v=>v[1])))];
 if(availableAddons)for(const dep of dependencies)if(!availableAddons.has(dep.toLowerCase()))issues.push({line:1,severity:'warning',message:`Зависимость отсутствует в вашем списке: ${dep}`});
 if(/[A-Z]:\\/i.test(clean))issues.push({line:1,severity:'warning',message:'Абсолютный путь Windows: проверьте переносимость миссии'});
 return {issues:issues.sort((a,b)=>a.line-b.line),dependencies};
}
