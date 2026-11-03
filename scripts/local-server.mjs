import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,readdir,stat,realpath,open} from 'node:fs/promises';
import {resolve,join,dirname,basename,relative,isAbsolute,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {z} from 'zod';

const exec=promisify(execFile);
export const settingsSchema=z.object({rptDirectory:z.string().max(1000).default(''),armaDirectory:z.string().max(1000).default(''),teamSpeakDirectory:z.string().max(1000).default(''),modDirectories:z.array(z.string().min(1).max(1000)).max(30).default([])});
const emptySettings=settingsSchema.parse({});
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const inside=(root,path)=>{const part=relative(root,path);return part===''||(!part.startsWith('..')&&!isAbsolute(part));};
const exists=async path=>Boolean(path&&await stat(path).catch(()=>null));
export function defaultRptDirectory(env=process.env,platform=process.platform){return platform==='win32'?(env.LOCALAPPDATA?join(env.LOCALAPPDATA,'Arma 3'):''):env.HOME?join(env.HOME,'.local/share/Arma 3'):'';}
export function validateSettings(raw){const s=settingsSchema.parse(raw);for(const path of [s.rptDirectory,s.armaDirectory,s.teamSpeakDirectory,...s.modDirectories])if(path&&(!isAbsolute(path)||path.includes('\0')||path.startsWith('\\\\')))throw Error('Укажите абсолютные локальные пути, без сетевых папок');return s;}
export function safeRequest(req,port){const host=req.headers.host;if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host))return false;const origin=req.headers.origin;if(origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(origin))return false;return req.headers['x-tsg-local']==='1'&&!['cross-site','same-site'].includes(req.headers['sec-fetch-site']);}

export async function listRpts(folder){
 if(!folder)return [];const names=await readdir(folder,{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];if(['EACCES','EPERM'].includes(e.code))throw Error('Нет доступа к папке RPT. Запустите start-toolkit.cmd из обычной сессии Windows или выберите доступный каталог в настройках.');throw e;});const files=[];
 for(const entry of names){if(!entry.isFile()||!entry.name.toLowerCase().endsWith('.rpt'))continue;const info=await stat(join(folder,entry.name)).catch(()=>null);if(info)files.push({name:entry.name,size:info.size,modified:info.mtime.toISOString(),modifiedMs:info.mtimeMs});}
 return files.sort((a,b)=>b.modifiedMs-a.modifiedMs||a.name.localeCompare(b.name)).slice(0,100);
}
export async function readRpt(folder,name){
 if(!folder||!name||basename(name)!==name||/[\\/]/.test(name)||!name.toLowerCase().endsWith('.rpt'))throw Error('Недопустимое имя RPT');
 const root=await realpath(folder);const path=await realpath(join(root,name));if(!inside(root,path))throw Error('Файл вне каталога RPT');
 const handle=await open(path,'r');try{const info=await handle.stat();if(!info.isFile()||info.size>20*1024*1024)throw Error('RPT должен быть обычным файлом до 20 МБ');const bytes=Buffer.alloc(info.size);await handle.read(bytes,0,bytes.length,0);const utf8=new TextDecoder().decode(bytes);return {name,size:info.size,modified:info.mtime.toISOString(),text:utf8.includes('\uFFFD')?new TextDecoder('windows-1251').decode(bytes):utf8};}finally{await handle.close();}
}

export async function inspectWindows(){
 if(process.platform!=='win32')return {available:false,armaRunning:null,teamSpeakRunning:null,steamPath:'',armaPath:'',error:'Проверка процессов доступна в Windows'};
 const command=`$ErrorActionPreference='SilentlyContinue'; $p=@(Get-Process | Select-Object -ExpandProperty ProcessName); $steam=(Get-ItemProperty -LiteralPath 'HKCU:\\Software\\Valve\\Steam').SteamPath; $arma=(Get-ItemProperty -LiteralPath 'HKLM:\\SOFTWARE\\WOW6432Node\\bohemia interactive\\arma 3').main; if(!$arma){$arma=(Get-ItemProperty -LiteralPath 'HKLM:\\SOFTWARE\\bohemia interactive\\arma 3').main}; @{available=$true;armaRunning=[bool](@($p | Where-Object {$_ -match '^arma3(?:_x64|diag_x64|profiling_x64)?$'}).Count);teamSpeakRunning=[bool](@($p | Where-Object {$_ -match '^ts3client_win(?:32|64)$'}).Count);steamPath=[string]$steam;armaPath=[string]$arma} | ConvertTo-Json -Compress`;
 try{const {stdout}=await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,timeout:10000,maxBuffer:65536});return JSON.parse(stdout.trim());}catch{return {available:false,armaRunning:null,teamSpeakRunning:null,steamPath:'',armaPath:'',error:'Windows не вернула состояние процессов'};}
}
async function findArma(settings,host,env){
 const candidates=[settings.armaDirectory,host.armaPath];const steamRoots=[host.steamPath,env['ProgramFiles(x86)']&&join(env['ProgramFiles(x86)'],'Steam'),env.ProgramFiles&&join(env.ProgramFiles,'Steam')].filter(Boolean);
 for(const steam of steamRoots){const libraries=[steam];const vdf=await readFile(join(steam,'steamapps/libraryfolders.vdf'),'utf8').catch(()=>'');for(const m of vdf.matchAll(/"path"\s+"([^"]+)"/g))libraries.push(m[1].replaceAll('\\\\','\\'));for(const lib of libraries)candidates.push(join(lib,'steamapps/common/Arma 3'));}
 for(const candidate of candidates.filter(Boolean))if(await exists(join(candidate,'arma3_x64.exe'))||await exists(join(candidate,'arma3.exe')))return candidate;return '';
}
export async function preflight(settings,host,env=process.env){
 const checks=[];const arma=await findArma(settings,host,env);checks.push({id:'arma-install',name:'Установка Arma 3',status:arma?'pass':'unknown',evidence:arma||'Не найдена в реестре и библиотеках Steam; укажите папку вручную'});
 checks.push({id:'arma-process',name:'Процесс Arma 3',status:host.armaRunning===null?'unknown':host.armaRunning?'pass':'info',evidence:host.armaRunning===null?'Состояние недоступно':host.armaRunning?'Игра запущена; автоматический разбор RPT приостановлен':'Игра не запущена — можно анализировать завершённые запуски'});
 const tsCandidates=[settings.teamSpeakDirectory,env.ProgramFiles&&join(env.ProgramFiles,'TeamSpeak 3 Client'),env['ProgramFiles(x86)']&&join(env['ProgramFiles(x86)'],'TeamSpeak 3 Client'),env.LOCALAPPDATA&&join(env.LOCALAPPDATA,'Programs/TeamSpeak 3 Client')].filter(Boolean);let ts='';for(const p of tsCandidates)if(await exists(join(p,'ts3client_win64.exe'))||await exists(join(p,'ts3client_win32.exe'))){ts=p;break;}
 checks.push({id:'ts-install',name:'Установка TeamSpeak 3',status:ts?'pass':'unknown',evidence:ts||'Стандартные папки пусты; укажите каталог TeamSpeak'});
 checks.push({id:'ts-process',name:'Процесс TeamSpeak 3',status:host.teamSpeakRunning===null?'unknown':host.teamSpeakRunning?'pass':'info',evidence:host.teamSpeakRunning===null?'Состояние недоступно':host.teamSpeakRunning?'Процесс обнаружен. Подключение и микрофон этим не проверены':'TeamSpeak не запущен'});
 const pluginRoots=[env.APPDATA&&join(env.APPDATA,'TS3Client/plugins'),ts&&join(ts,'plugins')].filter(Boolean);const plugins=[];for(const path of pluginRoots){const files=await readdir(path).catch(()=>[]);for(const name of files)if(/(?:task_force_radio|tfar).*\.dll$/i.test(name))plugins.push(name);}
 checks.push({id:'tfar-files',name:'Файлы плагина TFAR',status:plugins.length?'pass':'unknown',evidence:plugins.length?[...new Set(plugins)].join(', ')+' — наличие файла не подтверждает, что плагин включён':'DLL TFAR в стандартных папках плагинов не найдена'});
 const mods=settings.modDirectories.length?settings.modDirectories:arma?(await readdir(arma,{withFileTypes:true}).catch(()=>[])).filter(e=>e.isDirectory()&&e.name.startsWith('@')).map(e=>join(arma,e.name)):[];
 if(!mods.length)checks.push({id:'mods',name:'Каталоги модов',status:'unknown',evidence:'Укажите используемые каталоги модов. Актуальный набор TSG не предполагается автоматически'});
 for(const [i,path] of mods.entries()){const files=await readdir(join(path,'addons')).catch(()=>null);const pbo=files?.filter(f=>/\.pbo$/i.test(f)).length??0;checks.push({id:`mod-${i}`,name:`Мод: ${basename(path)}`,status:pbo?'pass':'fail',evidence:pbo?`${pbo} файлов PBO в addons. Контрольные суммы и актуальность не проверены`:'Каталог addons отсутствует или не содержит PBO'});}
 const folder=settings.rptDirectory||defaultRptDirectory(env);let rpts=[];let rptError='';try{rpts=await listRpts(folder);}catch(e){rptError=e.message;}checks.push({id:'rpt',name:'Журналы запусков',status:rpts.length?'pass':'unknown',evidence:rptError||(rpts.length?`${rpts.length} RPT, последний: ${rpts[0].name}`:'RPT не найдены. При -profiles укажите отдельный каталог; при -noLogs записи могут отсутствовать')});
 return {at:new Date().toISOString(),checks,settings,rptDirectory:folder,armaRunning:host.armaRunning};
}

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
export function createLocalServer({root=ROOT,port=4173,probe=inspectWindows,env=process.env}={}){
 const settingsPath=join(root,'.local/settings.json');let hostCache;let hostAt=0;const getHost=async()=>{if(!hostCache||Date.now()-hostAt>2500){hostCache=await probe();hostAt=Date.now();}return hostCache;};
 const readSettings=async()=>{try{return validateSettings(JSON.parse(await readFile(settingsPath,'utf8')));}catch(e){if(e.code==='ENOENT')return emptySettings;throw Error('Настройки локального запуска повреждены');}};
 const json=(res,code,body)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 const server=createServer(async(req,res)=>{try{
  const boundPort=server.address()?.port??port;const url=new URL(req.url,'http://127.0.0.1:'+boundPort);
  if(url.pathname.startsWith('/api/local/')){
   if(!safeRequest(req,boundPort))return json(res,403,{error:'Доступ только из локального Toolkit'});
   const settings=await readSettings();
   if(url.pathname==='/api/local/status'&&req.method==='GET')return json(res,200,{version:1,settings,rptDirectory:settings.rptDirectory||defaultRptDirectory(env),host:await getHost()});
   if(url.pathname==='/api/local/settings'&&req.method==='POST'){let data='';for await(const part of req){data+=part.toString();if(Buffer.byteLength(data)>16384)return json(res,413,{error:'Настройки слишком велики'});}const next=validateSettings(JSON.parse(data));await mkdir(dirname(settingsPath),{recursive:true});await writeFile(settingsPath,JSON.stringify(next,null,2));return json(res,200,{ok:true});}
   if(url.pathname==='/api/local/preflight'&&req.method==='POST')return json(res,200,await preflight(settings,await getHost(),env));
   if(url.pathname==='/api/local/rpts'&&req.method==='GET')return json(res,200,{directory:settings.rptDirectory||defaultRptDirectory(env),files:await listRpts(settings.rptDirectory||defaultRptDirectory(env)),host:await getHost()});
   if(url.pathname==='/api/local/rpt'&&req.method==='GET'){if((await getHost()).armaRunning)return json(res,409,{error:'Arma 3 запущена. Автоанализ доступен после выхода из игры'});return json(res,200,await readRpt(settings.rptDirectory||defaultRptDirectory(env),url.searchParams.get('name')));}
   return json(res,404,{error:'Маршрут не найден'});
  }
  if(![`127.0.0.1:${boundPort}`,`localhost:${boundPort}`].includes(req.headers.host))return json(res,403,{error:'Недопустимый Host'});
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Метод не поддерживается'});
  const webRoot=await realpath(join(root,'dist'));const path=decodeURIComponent(url.pathname);if(path.includes('\\')||path.includes('\0'))return json(res,400,{error:'Недопустимый путь'});const target=await realpath(resolve(webRoot,'.'+(path==='/'?'/index.html':path))).catch(()=>null);if(!target||!inside(webRoot,target)||!(await stat(target)).isFile())return json(res,404,{error:'Файл не найден'});
  res.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:await readFile(target));
 }catch(e){json(res,e.code==='ENOENT'?404:400,{error:e.message||'Ошибка локального сервиса'});}});
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const port=Number(process.env.TSG_LOCAL_PORT||4173);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Недопустимый порт');if(!await exists(join(ROOT,'dist/index.html')))throw Error('Сначала выполните npm run build');const server=createLocalServer({port});server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Порт ${port} занят. Остановите preview или задайте TSG_LOCAL_PORT.`:e.message);process.exitCode=1;});server.listen(port,'127.0.0.1',()=>console.log(`TSG Toolkit: http://127.0.0.1:${port}/ — локальные проверки и стандартный RPT включены`));}
