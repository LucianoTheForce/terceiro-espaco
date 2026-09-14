import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
const image = (await readFile('public/media/character-6.png')).toString('base64');
await mkdir('tmp/founders-frames', {recursive:true});
for(let frame=0;frame<150;frame++) {
 const t=frame/150*Math.PI*2;
 const lift=(1-Math.cos(t))/2;
 const angle=-5.5*lift;
 const sway=Math.sin(t)*.23;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 640 640"><defs><image id="art" width="640" height="640" href="data:image/png;base64,${image}"/><mask id="body"><rect width="640" height="640" fill="white"/><rect x="364" y="232" width="117" height="106" fill="black"/></mask><clipPath id="arm"><rect x="362" y="232" width="119" height="106"/></clipPath></defs><rect width="640" height="640" fill="white"/><g transform="translate(0 ${-lift*.9}) rotate(${sway} 278 600)"><use href="#art" mask="url(#body)"/><g transform="rotate(${angle} 364 292)"><use href="#art" clip-path="url(#arm)"/></g></g></svg>`;
 await sharp(Buffer.from(svg)).png().toFile(`tmp/founders-frames/${String(frame).padStart(3,'0')}.png`);
}
console.log('150 frames rendered from the original artwork. Glasses remain rigid.');

