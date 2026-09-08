import {nodes,endings} from './story.js';

const $=id=>document.getElementById(id);
const STEPS=4;
const TOTAL_ENDINGS=Object.keys(endings).length;
const STORAGE_KEY='ttekoto-pilot-endings';
let path='',sound=true,audioUnlocked=false,ctx,timer,full='',typing=false,locked=false;
let seen=new Set();

try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  seen=new Set(saved.filter(key=>endings[key]));
}catch{}

function tone(freq=600,duration=.045,delay=0,type='sine',volume=.035,endFreq=freq*.86){
  if(!sound||!audioUnlocked)return;
  try{
    ctx??=new(window.AudioContext||window.webkitAudioContext)();
    ctx.resume();
    const start=ctx.currentTime+delay;
    const oscillator=ctx.createOscillator();
    const gain=ctx.createGain();
    oscillator.type=type;
    oscillator.frequency.setValueAtTime(freq,start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40,endFreq),start+duration);
    gain.gain.setValueAtTime(.001,start);
    gain.gain.exponentialRampToValueAtTime(volume,start+.008);
    gain.gain.exponentialRampToValueAtTime(.001,start+duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start+duration+.01);
  }catch{}
}

function typeSound(character,index){
  if(index%2||/[\s、。！？…「」]/.test(character))return;
  const pitch=510+(character.codePointAt(0)%6)*22;
  tone(pitch,.025,0,'triangle',.012,pitch*.94);
}

function reactionSound(mood){
  if(mood==='happy'){
    tone(660,.1,0,'sine',.035,740);
    tone(990,.16,.08,'sine',.025,1110);
  }else if(mood==='fear'){
    tone(190,.18,0,'sawtooth',.018,105);
    tone(310,.11,.09,'triangle',.014,240);
  }else{
    tone(470,.08,0,'triangle',.022,420);
    tone(350,.07,.1,'sine',.016,350);
  }
}

function choiceSound(){
  tone(620,.06,0,'triangle',.035,760);
  tone(930,.1,.055,'sine',.026,1050);
}

function finishText(){
  clearInterval(timer);
  $('line').textContent=full;
  typing=false;
  $('skip').hidden=true;
}

function write(text){
  clearInterval(timer);
  full=text;
  $('line').textContent='';
  typing=true;
  $('skip').hidden=false;
  let i=0;
  timer=setInterval(()=>{
    i++;
    const character=full[i-1];
    $('line').textContent=full.slice(0,i);
    typeSound(character,i);
    if(i>=full.length)finishText();
  },25);
}

function button(label,fn,primary=false){
  const element=document.createElement('button');
  element.className='choice'+(primary?' primary':'');
  element.textContent=label;
  element.onclick=fn;
  return element;
}

function render(){
  locked=false;
  const ending=endings[path];
  const scene=ending||nodes[path];
  $('game').classList.toggle('ending',!!ending);
  $('scene').className='scene '+scene.mood;
  $('caption').textContent=ending?scene.genre:scene.caption;
  $('speaker').hidden=!ending;
  $('speaker').textContent=ending
    ?'おはなし '+(parseInt(path,2)+1).toString().padStart(2,'0')+' / '+TOTAL_ENDINGS
    :'';
  $('progress').innerHTML=Array.from({length:STEPS},(_,i)=>
    '<span class="dot '+(i<path.length?'active':'')+'"></span>'
  ).join('');
  $('choices').replaceChildren();
  document.querySelector('.ending-title')?.remove();

  if(ending){
    seen.add(path);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...seen]))}catch{}
    const heading=document.createElement('h2');
    heading.className='ending-title';
    heading.textContent=scene.title+(scene.truth?' ◎':'');
    $('line').before(heading);
    $('choices').append(
      button('べつの「ってコト⁉︎」を ためす',()=>{path='';render()},true),
      button('ひとつ まえの せんたくに もどる',()=>{path=path.slice(0,-1);render()})
    );
  }else{
    scene.choices.forEach((text,index)=>{
      const element=button('',()=>choose(index));
      element.append(document.createTextNode(text));
      const suffix=document.createElement('small');
      suffix.textContent='…ってコト⁉︎';
      element.append(suffix);
      $('choices').append(element);
    });
  }

  write(scene.line);
  $('collection').textContent='おはなし '+seen.size+' / '+TOTAL_ENDINGS;
  reactionSound(scene.mood);
}

function choose(index){
  if(locked)return;
  locked=true;
  finishText();
  $('line').textContent=nodes[path].choices[index]+'…ってコト⁉︎';
  choiceSound();
  for(const element of $('choices').children)element.disabled=true;
  setTimeout(()=>{
    path+=index;
    render();
  },540);
}

$('sound').textContent='おと あり';
$('sound').setAttribute('aria-pressed','true');
document.addEventListener('click',event=>{
  audioUnlocked=true;
  if(sound&&event.target.closest?.('#sound')==null)tone(720,.055,0,'sine',.025,820);
},{capture:true,once:true});
$('sound').onclick=()=>{
  audioUnlocked=true;
  sound=!sound;
  $('sound').textContent='おと '+(sound?'あり':'なし');
  $('sound').setAttribute('aria-pressed',String(sound));
  if(sound){
    tone(650,.06,0,'triangle',.03,780);
    tone(900,.1,.06,'sine',.025,1040);
  }
};
$('skip').onclick=finishText;
$('restart').onclick=()=>{
  if(locked)return;
  path='';
  render();
};
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    finishText();
    ctx?.suspend();
  }else if(sound){
    ctx?.resume();
  }
});

render();
