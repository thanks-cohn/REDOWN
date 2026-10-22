/* Shared semantic feedback. Tickets prevent older async work painting newer status. */
(function(root){
  'use strict';
  const states=Object.freeze({running:'running',pending:'running',loading:'running',done:'success',success:'success',failed:'failed',partial:'partial',cancelled:'cancelled',idle:'idle'});
  const normalize=state=>states[state]||'running';
  function paint(element,state){
    if(!element)return;
    element.dataset.explorerState=normalize(state);
    element.setAttribute('aria-atomic','true');
  }
  function create({render=()=>{}}={}){
    let sequence=0,current=null;
    return {
      begin(message){const ticket=++sequence;current={ticket,message,state:'running'};render(current);return ticket;},
      update(ticket,message,state){if(ticket!==current?.ticket)return false;current={ticket,message,state:normalize(state)};render(current);return true;},
      owns:ticket=>ticket===current?.ticket,
      invalidate(){sequence++;current=null;},
      get current(){return current&&{...current};}
    };
  }
  root.RedownExplorerStatus={states,normalize,paint,create};
})(globalThis);
