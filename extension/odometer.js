/* Bounded decimal roll-up; presentation never mutates the delivery total. */
(() => {
  const valid=value=>typeof value==='string'&&/^(0|[1-9]\d*)$/.test(value);
  function plan(from,to){
    if(!valid(from)||!valid(to))throw Error('Invalid odometer count');
    const start=BigInt(from),end=BigInt(to),delta=end-start;
    if(delta<=0n)return [];
    const tail=delta<3n?delta:3n,bulk=delta-tail,steps=bulk<18n?Number(bulk):18,frames=[];
    let previous=start;
    for(let i=1;i<=steps;i++){
      const n=BigInt(steps),remaining=BigInt(steps-i);
      const next=start+bulk*(n*n*n-remaining*remaining*remaining)/(n*n*n);
      if(next>previous){frames.push({value:String(next),delay:30+Math.round(60*(i/steps)**2)});previous=next;}
    }
    for(let i=1;i<=Number(tail);i++)frames.push({value:String(end-tail+BigInt(i)),delay:[140,220,340][3-Number(tail)+i-1]});
    frames[0].delay+=180;return frames;
  }
  function create({paint,settled,click=()=>{},reduced=()=>false,setTimer=setTimeout,clearTimer=clearTimeout}){
    let timer=null,generation=0;
    const cancel=()=>{generation++;clearTimer(timer);timer=null;};
    return {cancel,roll(from,to){
      cancel();const epoch=generation,frames=reduced()?[]:plan(from,to);
      paint(frames.length?from:to);
      if(!frames.length){settled(to);return;}
      let index=0;
      const tick=()=>{
        if(epoch!==generation)return;
        paint(frames[index].value);index++;
        if(index===frames.length){timer=setTimer(()=>{if(epoch!==generation)return;timer=null;settled(to);click();},110);}
        else timer=setTimer(tick,frames[index].delay);
      };
      timer=setTimer(tick,frames[0].delay);
    }};
  }
  globalThis.RedownOdometer={plan,create};
})();
