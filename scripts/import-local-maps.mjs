import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {resolve,dirname,join,basename} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {deflateSync} from 'node:zlib';

export function validateManifest(m,bytes){
 if(m.format!=='r16'||!Number.isInteger(m.width)||!Number.isInteger(m.height)||m.width<2||m.height<2||m.width*m.height>50000000||!Number.isFinite(m.cellSize)||m.cellSize<=0)throw Error('Invalid R16 dimensions or cellSize');
 if(bytes!==m.width*m.height*2)throw Error('R16 length does not match manifest');
 if((m.originX??0)!==0||(m.originY??0)!==0)throw Error('Nonzero origins require explicit georeferencing support');
 return {width:(m.width-1)*m.cellSize,height:(m.height-1)*m.cellSize};
}
// Source converter stores signed 16-bit metres, little-endian, rows from south to north.
export function heightAt(buffer,m,x,y){return buffer.readInt16LE((y*m.width+x)*2);}
const stops=[[-300,[22,52,68]],[-1,[91,145,152]],[0,[216,211,170]],[10,[164,182,126]],[100,[126,153,103]],[300,[166,168,119]],[650,[168,145,111]],[1400,[217,208,183]]];
function terrainColor(h){let i=1;while(i<stops.length-1&&h>stops[i][0])i++;const [a,c]=stops[i-1], [b,d]=stops[i];const t=Math.max(0,Math.min(1,(h-a)/(b-a)));return c.map((v,k)=>v+(d[k]-v)*t);}
export function renderTerrain(buffer,m,limit=2048){
 validateManifest(m,buffer.length);
 const scale=Math.min(1,limit/Math.max(m.width,m.height));const width=Math.max(2,Math.round(m.width*scale)),height=Math.max(2,Math.round(m.height*scale));const pixels=Buffer.alloc(width*height*3);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=Math.round(x*(m.width-1)/(width-1));const sy=Math.round((height-1-y)*(m.height-1)/(height-1));
  const step=Math.max(1,Math.round(1/scale));const west=Math.max(0,sx-step),east=Math.min(m.width-1,sx+step),south=Math.max(0,sy-step),north=Math.min(m.height-1,sy+step);
  const h=heightAt(buffer,m,sx,sy);const dx=(heightAt(buffer,m,east,sy)-heightAt(buffer,m,west,sy))/((east-west)*m.cellSize);const dy=(heightAt(buffer,m,sx,north)-heightAt(buffer,m,sx,south))/((north-south)*m.cellSize);
  const light=Math.max(.45,Math.min(1.2,.78+(-dx*.45+dy*.45+.7)/Math.sqrt(dx*dx+dy*dy+1)*.4));
  const contour=h>0&&(Math.floor(h/25)!==Math.floor(heightAt(buffer,m,west,sy)/25)||Math.floor(h/25)!==Math.floor(heightAt(buffer,m,sx,south)/25));
  const rgb=terrainColor(h);const shade=h<0?1:light*(contour?.78:1);for(let k=0;k<3;k++)pixels[(y*width+x)*3+k]=Math.max(0,Math.min(255,Math.round(rgb[k]*shade)));
 }
 return {width,height,pixels};
}
function crc32(buffer){let crc=0xffffffff;for(const byte of buffer){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function chunk(type,data){const tag=Buffer.from(type);const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);tag.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([tag,data])),out.length-4);return out;}
export function encodePng({width,height,pixels}){const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;const rows=Buffer.alloc(height*(width*3+1));for(let y=0;y<height;y++)pixels.copy(rows,y*(width*3+1)+1,y*width*3,(y+1)*width*3);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);}
async function main(){
 const source=process.argv[2];if(!source)throw Error('Usage: npm run maps:import -- "path/to/Maps"');
 const destination=resolve(dirname(fileURLToPath(import.meta.url)),'../public/local-maps');await mkdir(destination,{recursive:true});const maps=[];
 for(const entry of (await readdir(source,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(!entry.isDirectory())continue;
  const folder=join(source,entry.name);const m=JSON.parse(await readFile(join(folder,'manifest.json'),'utf8'));if(!/^[a-z0-9_-]+$/i.test(m.id)||typeof m.name!=='string'||m.name.length>180||typeof m.file!=='string'||basename(m.file)!==m.file)throw Error(`Invalid manifest: ${entry.name}`);
  const file=join(folder,m.file);validateManifest(m,(await stat(file)).size);const data=await readFile(file);const extent=validateManifest(m,data.length);const png=encodePng(renderTerrain(data,m));await writeFile(join(destination,m.id+'.png'),png);
  maps.push({id:m.id,name:m.name+' · рельеф',...extent,url:`local-maps/${m.id}.png`});console.log(`${m.name}: ${extent.width} × ${extent.height} m → ${Math.round(png.length/1024)} KB`);
 }
 await writeFile(join(destination,'index.json'),JSON.stringify(maps,null,2)+'\n');console.log(`Imported ${maps.length} maps. Original R16 files were not copied.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
