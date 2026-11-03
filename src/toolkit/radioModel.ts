export type RadioModelId='anprc152'|'anprc148jem'|'fadak'|'rt1523g'|'mr3000'|'anprc155';
export type ControlId='enter'|'clear'|'additional'|'speakers'|'stereo'|'next'|'previous'|'volumeUp'|'volumeDown'|'volumeKnob'|'channelKnob'|`channel${number}`;
export type Control={id:ControlId;label:string;name:string;x:number;y:number;kind?:'knob'};
const c=(id:ControlId,label:string,name:string,x:number,y:number,kind?:'knob'):Control=>({id,label,name,x,y,kind});
const stereo=(x:number,y:number)=>c('stereo','ST','Стерео / выбор уха',x,y);
const additional=(x:number,y:number)=>c('additional','AD','Назначить дополнительный канал',x,y);
const speaker=(x:number,y:number)=>c('speakers','SPK','Включить / выключить динамик',x,y);
const enter=(x:number,y:number)=>c('enter','ENT','Записать частоту',x,y);
const clear=(x:number,y:number)=>c('clear','CLR','Очистить поле частоты',x,y);
const next=(x:number,y:number)=>c('next','CH+','Следующий канал',x,y);
const prev=(x:number,y:number)=>c('previous','CH−','Предыдущий канал',x,y);
const volume=(x:number,y:number)=>c('volumeKnob','VOL','Регулятор громкости: ЛКМ −, ПКМ +',x,y,'knob');
const channel=(x:number,y:number)=>c('channelKnob','CH','Регулятор каналов: ЛКМ −, ПКМ +',x,y,'knob');
const vPlus=(x:number,y:number)=>c('volumeUp','V+','Увеличить громкость',x,y);
const vMinus=(x:number,y:number)=>c('volumeDown','V−','Уменьшить громкость',x,y);
export const radioModels:{id:RadioModelId;name:string;longRange:boolean;layout:'handheld'|'backpack';screen:{x:number;y:number;width:number};controls:Control[];source:string}[]=[
 {id:'anprc152',name:'AN/PRC-152',longRange:false,layout:'handheld',screen:{x:25,y:44,width:52},controls:[volume(56,30),clear(79,60),enter(79,67),next(79,74),prev(79,81),stereo(29,81),additional(46,81),speaker(63,81)],source:'handhelds/anprc152/ui/anprc152.hpp'},
 {id:'anprc148jem',name:'AN/PRC-148 JEM',longRange:false,layout:'handheld',screen:{x:24,y:40,width:54},controls:[volume(73,30),channel(27,31),speaker(29,61),additional(50,61),clear(73,61),prev(29,69),next(50,69),enter(73,69),stereo(27,80)],source:'handhelds/anprc148jem/ui/anprc148jem.hpp'},
 {id:'fadak',name:'FADAK',longRange:false,layout:'handheld',screen:{x:23,y:39,width:54},controls:[channel(51,31),enter(78,60),clear(78,67),additional(78,74),prev(78,81),vMinus(24,81),stereo(42,81),vPlus(60,81),speaker(43,67)],source:'handhelds/fadak/ui/fadak.hpp'},
 {id:'rt1523g',name:'RT-1523G',longRange:true,layout:'backpack',screen:{x:33,y:24,width:42},controls:[...[1,2,3,4,5,6,7,8,9].map((n,i)=>c(`channel${n}`,String(n),`Канал ${n}`,37+(i%3)*12,52+Math.floor(i/3)*12)),enter(77,52),additional(77,64),vPlus(77,76),vMinus(77,88),clear(37,88),speaker(49,88),stereo(61,88)],source:'backpacks/rt1523g/ui/rt1523g.hpp'},
 {id:'mr3000',name:'MR3000',longRange:true,layout:'backpack',screen:{x:40,y:24,width:35},controls:[volume(18,24),c('additional','AD','Назначить дополнительный канал',18,50,'knob'),channel(18,76),clear(85,28),enter(85,45),...[1,2,3,4,5,6,7,8,9].map((n,i)=>c(`channel${n}`,String(n),`Канал ${n}`,35+(i%5)*9,64+Math.floor(i/5)*17)),stereo(71,81),vPlus(88,64),vMinus(88,89),prev(82,77),next(94,77),speaker(94,89)],source:'backpacks/mr3000/ui/mr3000.hpp'},
 {id:'anprc155',name:'AN/PRC-155',longRange:true,layout:'backpack',screen:{x:40,y:25,width:39},controls:[volume(20,28),next(59,60),prev(59,85),clear(79,60),enter(79,73),additional(40,73),stereo(40,85),speaker(79,85)],source:'backpacks/anprc155/ui/anprc155.hpp'}
];
export type RadioState={channel:number;frequencies:string[];draft:string;volume:number;stereo:0|1|2;speakers:boolean;additional:number|null};
export type RadioAction={type:'channel';value:number}|{type:'stepChannel';direction:1|-1}|{type:'draft';value:string}|{type:'commit'}|{type:'clear'}|{type:'volume';direction:1|-1}|{type:'stereo'}|{type:'speakers'}|{type:'additional'};
export function initialRadio(id:RadioModelId):RadioState{const m=radioModels.find(m=>m.id===id)!;return {channel:1,frequencies:Array.from({length:m.longRange?9:8},()=> '30.0'),draft:'30.0',volume:3,stereo:0,speakers:true,additional:null};}
export function radioReducer(s:RadioState,a:RadioAction,id:RadioModelId):RadioState{const model=radioModels.find(m=>m.id===id)!;const count=model.longRange?9:8;
 if(a.type==='draft')return {...s,draft:a.value.slice(0,8)};
 if(a.type==='clear')return {...s,draft:''};
 if(a.type==='commit'){const n=Number(s.draft.replace(',','.'));if(!s.draft.trim()||!Number.isFinite(n)||n<30||n>(model.longRange?87:512))throw Error(`Частота должна быть в диапазоне 30–${model.longRange?87:512} МГц`);const freq=(Math.round(n*10)/10).toFixed(1);return {...s,frequencies:s.frequencies.map((f,i)=>i===s.channel-1?freq:f),draft:freq};}
 if(a.type==='channel'||a.type==='stepChannel'){const channel=a.type==='channel'?a.value:((s.channel-1+a.direction+count)%count)+1;if(channel<1||channel>count)throw Error('Недопустимый канал');return {...s,channel,draft:s.frequencies[channel-1]};}
 if(a.type==='volume')return {...s,volume:(s.volume+a.direction+10)%10};
 if(a.type==='stereo')return {...s,stereo:((s.stereo+1)%3) as 0|1|2};
 if(a.type==='speakers')return {...s,speakers:!s.speakers};
 if(a.type==='additional')return {...s,additional:s.additional===s.channel?null:s.channel};
 return s;
}
export type RadioTask={id:string;title:string;channel:number;frequency:string;volume:number;stereo:0|1|2;speakers:boolean;additional?:{channel:number;frequency:string}};
export const radioTasks:RadioTask[]=[{id:'basic',title:'Подготовить связь отделения',channel:3,frequency:'43.7',volume:6,stereo:1,speakers:false},{id:'dual',title:'Настроить основную и дополнительную сети',channel:2,frequency:'40.5',volume:5,stereo:2,speakers:false,additional:{channel:5,frequency:'55.1'}},{id:'restore',title:'Вернуться к общей учебной сети',channel:1,frequency:'36.2',volume:4,stereo:0,speakers:false}];
export function assessRadio(s:RadioState,t:RadioTask){return {channel:s.channel===t.channel,frequency:s.frequencies[t.channel-1]===t.frequency&&s.draft===t.frequency,volume:s.volume===t.volume,stereo:s.stereo===t.stereo,speakers:s.speakers===t.speakers,additional:t.additional?s.additional===t.additional.channel&&s.frequencies[t.additional.channel-1]===t.additional.frequency:s.additional===null};}
