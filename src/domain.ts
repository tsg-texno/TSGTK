import {z} from 'zod';
export const markers = ['Точка','Высадка','Подбор','Флаг','Крест','Крест в круге','Неизвестный противник','Пехота','Наземная техника','ПВО','Артиллерия','Медик','Вертолёт ∞','БПЛА-квадрокоптер','БПЛА UAV','Самолёт'] as const;
// Предварительные наборы: исходное согласование недоступно.
export const lines = ['Сплошная','Пунктир','Точки','Стрелка','Двойная стрелка','Ось наступления','Рубеж'] as const;
export const zones = ['Сплошная заливка','Контур','Диагональная штриховка','Перекрёстная штриховка','Горизонтальная штриховка','Вертикальная штриховка','Точечная заливка'] as const;
export const armaColorClasses: [string,string][] = [['Default','#000000'],['ColorBlack','#000000'],['ColorGrey','#808080'],['ColorRed','#E60000'],['ColorBrown','#804000'],['ColorOrange','#D96600'],['ColorYellow','#D9D900'],['ColorKhaki','#809966'],['ColorGreen','#00CC00'],['ColorBlue','#0000FF'],['ColorPink','#FF4C66'],['ColorWhite','#FFFFFF'],['ColorWEST','#004C99'],['ColorEAST','#800000'],['ColorGUER','#008000'],['ColorCIV','#660080'],['ColorUNKNOWN','#B29900'],['colorBLUFOR','#004C99'],['colorOPFOR','#800000'],['colorIndependent','#008000'],['colorCivilian','#660080'],['Color1_FD_F','#B13339'],['Color2_FD_F','#ADBF83'],['Color3_FD_F','#F08231'],['Color4_FD_F','#678B9B'],['Color5_FD_F','#B040A7'],['Color6_FD_F','#5A595A'],['TSG: голубой','#00BFFF']];
// Несколько классов Arma имеют одинаковый RGB: показываем один образец с именами всех алиасов.
export const palette: [string,string][] = Array.from(
 armaColorClasses.reduce((colors, [name, hex]) => {
  const aliases = colors.get(hex) ?? [];
  aliases.push(name);
  colors.set(hex, aliases);
  return colors;
 }, new Map<string, string[]>()),
 ([hex, aliases]) => [aliases.join(' / '), hex],
);
export const scopeSchema = z.object({server:z.enum(['server-1','server-2']),side:z.enum(['side-1','side-2','side-3','side-4'])});
export type Scope = z.infer<typeof scopeSchema>;
export type Role = 'fighter'|'staff'|'commander';
const coord = z.tuple([z.number().finite().min(-1e7).max(1e7),z.number().finite().min(-1e7).max(1e7)]);
const geometry = z.discriminatedUnion('type',[
 z.object({type:z.literal('Point'),coordinates:coord}),
 z.object({type:z.literal('LineString'),coordinates:z.array(coord).min(2).max(20000)}),
 z.object({type:z.literal('Polygon'),coordinates:z.array(z.array(coord).min(4).max(20000)).min(1).max(100)})]);
export const objectSchema = z.object({id:z.string().uuid(),geometry,kind:z.enum(['marker','line','zone']),symbol:z.number().int().min(0).max(15),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),label:z.string().max(200)}).superRefine((o,c)=>{if(o.geometry.type!==({marker:'Point',line:'LineString',zone:'Polygon'} as const)[o.kind] || (o.kind!=='marker'&&o.symbol>6))c.addIssue({code:'custom',message:'Несовместимая геометрия или символ'}); if(o.geometry.type==='Polygon')for(const r of o.geometry.coordinates)if(r[0][0]!==r.at(-1)![0]||r[0][1]!==r.at(-1)![1])c.addIssue({code:'custom',message:'Контур должен быть замкнут'});});
export type MapObject = z.infer<typeof objectSchema>;
const mapSchema = z.object({name:z.string().max(200),width:z.number().positive().max(1000000),height:z.number().positive().max(1000000),dataUrl:z.string().max(45000000).regex(/^data:image\/(png|jpeg|webp);base64,/).optional(),atlasId:z.string().max(100).optional()});
export const projectSchema = z.object({version:z.literal(1),id:z.string().uuid(),scope:scopeSchema,name:z.string().min(1).max(100),phase:z.enum(['planning','debrief']),map:mapSchema,objects:z.array(objectSchema).max(10000),updatedAt:z.string().datetime()});
export type Project = z.infer<typeof projectSchema>;
export function scopeKey(s:Scope){return `${s.server}/${s.side}`;}
export function sameScope(a:Scope,b:Scope){return scopeKey(a)===scopeKey(b);}
export function blankProject(scope:Scope):Project{return {version:1,id:crypto.randomUUID(),scope:{...scope},name:'Новая операция',phase:'planning',map:{name:'Координатное поле',width:10000,height:10000},objects:[],updatedAt:new Date().toISOString()};}
export function importProject(raw:unknown,scope:Scope):Project{const p=projectSchema.parse(raw);if(!sameScope(p.scope,scope))throw Error('Проект принадлежит другому серверу или стороне. Переключите контекст.');return {...p,id:crypto.randomUUID(),updatedAt:new Date().toISOString()};}
export function canEdit(role:Role){return role==='staff'||role==='commander';}
