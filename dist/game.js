import {lessons,ending} from './story.js';

const $=id=>document.getElementById(id);
const STEP_NAMES=['ひとつめ','ふたつめ','みっつめ','よっつめ','いつつめ','むっつめ','ななつめ','やっつめ','ここのつめ','とおめ'];
let step=0,sound=true,audioUnlocked=false,ctx,timer,full='',typing=false,locked=false;

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

function answerSound(correct){
  if(correct){
    tone(660,.1,0,'sine',.035,760);
    tone(990,.17,.08,'sine',.026,1120);
  }else{
    tone(260,.14,0,'triangle',.026,190);
    tone(210,.12,.11,'sine',.018,170);
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
  let index=0;
  timer=setInterval(()=>{
    index++;
    const character=full[index-1];
    $('line').textContent=full.slice(0,index);
    typeSound(character,index);
    if(index>=full.length)finishText();
  },22);
}

function button(label,action,primary=false){
  const element=document.createElement('button');
  element.className='choice'+(primary?' primary':'');
  element.textContent=label;
  element.onclick=action;
  return element;
}

function questionButton(text,index){
  const element=button('',()=>choose(index));
  const lead=document.createElement('small');
  lead.className='choice-lead';
  lead.textContent='それって、';
  const phrase=document.createElement('span');
  phrase.textContent=text;
  const suffix=document.createElement('small');
  suffix.textContent='…ってコト⁉︎';
  element.append(lead,phrase,suffix);
  return element;
}

function renderProgress(current){
  $('progress').innerHTML=Array.from({length:lessons.length},(_,index)=>
    '<span class="dot '+(index<=current?'active':'')+'"></span>'
  ).join('');
}

function render(){
  locked=false;
  const finished=step>=lessons.length;
  const scene=finished?ending:lessons[step];
  $('game').classList.toggle('ending',finished);
  $('scene').className='scene';
  $('scene').dataset.visual=scene.visual;
  $('caption').textContent=scene.caption;
  $('choices').replaceChildren();
  document.querySelector('.ending-title')?.remove();

  if(finished){
    renderProgress(lessons.length);
    const heading=document.createElement('h2');
    heading.className='ending-title';
    heading.textContent=scene.title;
    $('line').before(heading);
    $('choices').append(button('もういちど おさらいする',()=>{step=0;render()},true));
    $('collection').textContent='おさらい できた';
  }else{
    renderProgress(step);
    lessons[step].choices.forEach((text,index)=>{
      $('choices').append(questionButton(text,index));
    });
    $('collection').textContent='もんだい '+STEP_NAMES[step]+' / とお';
  }

  write(scene.line);
}

function showWrong(lesson,choice){
  $('scene').classList.add('wrong');
  write('「'+choice+'…ってコト⁉︎」\nって、こっちじゃ ないよね。\n\nせいかいを もういちど えらぼう。\n'+lesson.hint);
  $('choices').replaceChildren(
    button('もういちど えらぶ',()=>render(),true)
  );
  answerSound(false);
}

function showCorrect(lesson){
  $('scene').classList.add('correct');
  write('うん、せいかい。\n\n'+lesson.explain);
  const last=step===lessons.length-1;
  $('choices').replaceChildren(
    button(last?'さいごの おさらいへ':'つぎの ふしぎへ',()=>{step++;render()},true)
  );
  answerSound(true);
}

function choose(index){
  if(locked)return;
  locked=true;
  finishText();
  const lesson=lessons[step];
  const choice=lesson.choices[index];
  $('line').textContent='それって、\n'+choice+'…ってコト⁉︎';
  choiceSound();
  for(const element of $('choices').children)element.disabled=true;
  setTimeout(()=>{
    locked=false;
    if(index===lesson.answer)showCorrect(lesson);
    else showWrong(lesson,choice);
  },520);
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
  step=0;
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
