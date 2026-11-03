import {describe,it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import {blankProject,importProject,projectSchema,markers,lines,zones,canEdit,type Scope} from '../src/domain';
import {LocalProjectRepository} from '../src/repository';
import {availableAtlas,resolveAtlas,type Config} from '../src/atlas';
describe('Изоляция и формат проекта',()=>{
 it('разделяет все 8 контекстов в IndexedDB',async()=>{const repo=new LocalProjectRepository();const scopes:Scope[]=[];for(const server of ['server-1','server-2'] as const)for(const side of ['side-1','side-2','side-3','side-4'] as const)scopes.push({server,side});const ps=scopes.map(blankProject);for(const p of ps)await repo.save(p.scope,p);for(let i=0;i<8;i++)expect((await repo.list(scopes[i])).map(p=>p.id)).toEqual([ps[i].id]);await expect(repo.save(scopes[0],ps[1])).rejects.toThrow();await repo.remove(scopes[0],ps[1].id);expect(await repo.list(scopes[1])).toHaveLength(1);});
 it('переносит изображение и объекты, блокирует чужую сторону',()=>{const p=blankProject({server:'server-1',side:'side-1'});p.map.dataUrl='data:image/png;base64,YQ==';p.objects=[{id:crypto.randomUUID(),kind:'marker',symbol:15,color:'#FF4C66',label:'Альфа',geometry:{type:'Point',coordinates:[123,456]}}];const copy=importProject(JSON.parse(JSON.stringify(p)),p.scope);expect(copy.map).toEqual(p.map);expect(copy.objects).toEqual(p.objects);expect(copy.id).not.toBe(p.id);expect(()=>importProject(p,{...p.scope,side:'side-2'})).toThrow('другому');});
 it('отклоняет повреждённую геометрию и опасные данные',()=>{const p=blankProject({server:'server-1',side:'side-1'});expect(projectSchema.safeParse({...p,map:{...p.map,dataUrl:'data:image/svg+xml,<svg/>'}}).success).toBe(false);expect(projectSchema.safeParse({...p,objects:[{id:crypto.randomUUID(),kind:'line',symbol:12,color:'#fff',label:'',geometry:{type:'Point',coordinates:[0,0]}}]}).success).toBe(false);});
 it('содержит требуемые количества и режим просмотра',()=>{expect([markers.length,lines.length,zones.length]).toEqual([16,7,7]);expect(canEdit('fighter')).toBe(false);expect(canEdit('staff')).toBe(true);});
});
describe('Atlas закрыт по умолчанию',()=>{const c:Config={allowedIslands:['approved'],atlas:{enabled:true,rightsConfirmed:true,rightsNote:'Письменное разрешение',maps:[{id:'test',islandId:'approved',name:'Test',tileUrl:'https://atlas.plan-ops.fr/data/1/{z}/{x}/{y}.png',size:1000,factor:1,tileSize:256,maxZoom:3,attribution:'Test'}]}};
 it('требует и права и белый список',()=>{expect(availableAtlas(c)).toHaveLength(1);expect(availableAtlas({...c,allowedIslands:[]})).toHaveLength(0);expect(availableAtlas({...c,atlas:{...c.atlas,rightsConfirmed:false}})).toHaveLength(0);expect(()=>resolveAtlas(c,'missing')).toThrow();});
});
