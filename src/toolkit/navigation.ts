export function bearing(from:[number,number],to:[number,number]){return (Math.atan2(to[0]-from[0],to[1]-from[1])*180/Math.PI+360)%360;}
export function distance(from:[number,number],to:[number,number]){return Math.hypot(to[0]-from[0],to[1]-from[1]);}
export function bearingDifference(a:number,b:number){return Math.abs(((a-b+540)%360)-180);}
