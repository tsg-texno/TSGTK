import {openDB} from 'idb';
import {type Project,type Scope,scopeKey,projectSchema,sameScope} from './domain';
export interface ProjectRepository {list(scope:Scope):Promise<Project[]>;save(scope:Scope,p:Project):Promise<void>;remove(scope:Scope,id:string):Promise<void>;}
// Каждая пара сервер/сторона имеет отдельную БД; сетевой репозиторий заменит этот адаптер.
export class LocalProjectRepository implements ProjectRepository {
 private db(s:Scope){return openDB(`tsg-planner-v1/${scopeKey(s)}`,1,{upgrade(db){db.createObjectStore('projects',{keyPath:'id'});}});}
 async list(s:Scope){const db=await this.db(s);try{return (await db.getAll('projects')).map(p=>projectSchema.parse(p)).filter(p=>sameScope(p.scope,s)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}finally{db.close();}}
 async save(s:Scope,p:Project){const valid=projectSchema.parse(p);if(!sameScope(s,valid.scope))throw Error('Запись в чужой контекст запрещена');const db=await this.db(s);try{await db.put('projects',valid);}finally{db.close();}}
 async remove(s:Scope,id:string){const db=await this.db(s);try{await db.delete('projects',id);}finally{db.close();}}
}
export interface IdentityProvider {getSession():Promise<{userId:string;role:'fighter'|'staff'|'commander';scope:Scope}>;}
export interface CollaborationTransport {connect(projectId:string):Promise<void>;disconnect():void;}
// Намеренно нет сетевой реализации: авторизация TSG и разрешение синхронизации ещё не получены.
