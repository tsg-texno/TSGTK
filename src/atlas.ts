import {z} from 'zod';
const atlasMap=z.object({id:z.string().min(1),islandId:z.string().min(1),name:z.string(),tileUrl:z.string().startsWith('https://atlas.plan-ops.fr/data/').refine(v=>v.includes('{z}')&&v.includes('{x}')&&v.includes('{y}')&&!v.includes('..')&&!v.includes('?')&&!v.includes('#')),size:z.number().positive(),tileSize:z.number().int().positive().max(2048),factor:z.number().positive(),maxZoom:z.number().int().min(0).max(10),attribution:z.string().max(300)});
export const configSchema=z.object({allowedIslands:z.array(z.string()),atlas:z.object({enabled:z.boolean(),rightsConfirmed:z.boolean(),rightsNote:z.string(),maps:z.array(atlasMap)})});
export type Config=z.infer<typeof configSchema>;export type AtlasMap=z.infer<typeof atlasMap>;
export const emptyConfig:Config={allowedIslands:[],atlas:{enabled:false,rightsConfirmed:false,rightsNote:'',maps:[]}};
export function availableAtlas(c:Config){return c.atlas.enabled&&c.atlas.rightsConfirmed&&c.atlas.rightsNote.trim()?c.atlas.maps.filter(m=>c.allowedIslands.includes(m.islandId)):[];}
export function resolveAtlas(c:Config,id:string){const m=availableAtlas(c).find(m=>m.id===id);if(!m)throw Error('Atlas: карта не разрешена конфигурацией TSG или не подтверждены права');return m;}
