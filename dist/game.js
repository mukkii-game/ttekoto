import {lessons,ending} from './story.js?v=20260929k';

const $=id=>document.getElementById(id);
const RIDDLE_NAMES=['一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','二十一','二十二','二十三'];
let step=0,sound=true,audioUnlocked=false,ctx,timer,afterWrite=null,full='',typing=false,locked=false,waitingForAdvance=false;

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
  const callback=typing?afterWrite:null;
  clearInterval(timer);
  $('line').textContent=full;
  typing=false;
  afterWrite=null;
  $('skip').hidden=true;
  callback?.();
}

function write(text,onDone=null){
  clearInterval(timer);
  full=text;
  afterWrite=onDone;
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
  window.scrollTo(0,0);
  locked=false;
  waitingForAdvance=false;
  const finished=step>=lessons.length;
  const scene=finished?ending:lessons[step];
  $('game').classList.toggle('ending',finished);
  $('scene').className='scene';
  $('scene').dataset.visual=scene.visual;
  $('step-label').textContent=finished?'おさらい':'謎 '+RIDDLE_NAMES[step];
  $('caption').textContent=scene.caption;
  $('back').disabled=step===0;
  $('choices').replaceChildren();
  document.querySelector('.ending-title')?.remove();

  if(finished){
    renderProgress(lessons.length);
    const heading=document.createElement('h2');
    heading.className='ending-title';
    heading.textContent=scene.title;
    $('line').before(heading);
    $('choices').append(button('もう一度おさらいする',()=>{step=0;render()},true));
    $('collection').textContent='おさらい完了';
    $('collection').disabled=false;
    $('collection').setAttribute('aria-label','おさらいを終えて最初へ戻る');
  }else{
    renderProgress(step);
    lessons[step].choices.forEach((text,index)=>{
      $('choices').append(questionButton(text,index));
    });
    $('collection').textContent='謎 '+RIDDLE_NAMES[step]+' / '+RIDDLE_NAMES[lessons.length-1];
    $('collection').disabled=true;
    $('collection').removeAttribute('aria-label');
  }

  write(scene.line);
}

function showWrong(lesson,choice){
  $('scene').classList.add('wrong');
  write('「'+choice+'…ってコト⁉︎」\nって、こっちじゃないよね。\n\n正解をもう一度選ぼう。\n'+lesson.hint);
  $('choices').replaceChildren(
    button('もう一度選ぶ',()=>render(),true)
  );
  answerSound(false);
}

function showCorrect(lesson){
  $('scene').classList.add('correct');
  const last=step===lessons.length-1;
  const notice=document.createElement('div');
  notice.className='next-notice';
  notice.textContent='説明を読んでね';
  $('choices').replaceChildren(notice);
  write('うん、正解。\n\n'+lesson.explain,()=>{
    waitingForAdvance=true;
    notice.classList.add('ready');
    notice.textContent=last?'タップでおさらいへ':'タップで次の謎へ';
  });
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

$('sound').textContent='音あり';
$('sound').setAttribute('aria-pressed','true');
document.addEventListener('click',event=>{
  audioUnlocked=true;
  if(sound&&event.target.closest?.('#sound')==null)tone(720,.055,0,'sine',.025,820);
},{capture:true,once:true});
$('sound').onclick=()=>{
  audioUnlocked=true;
  sound=!sound;
  $('sound').textContent='音'+(sound?'あり':'なし');
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
$('back').onclick=()=>{
  if(locked||step===0)return;
  step--;
  render();
};
$('collection').onclick=()=>{
  if($('collection').disabled||locked)return;
  step=0;
  render();
};
document.addEventListener('click',event=>{
  if(!waitingForAdvance||event.target.closest?.('button'))return;
  waitingForAdvance=false;
  step++;
  render();
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    finishText();
    ctx?.suspend();
  }else if(sound){
    ctx?.resume();
  }
});

render();
