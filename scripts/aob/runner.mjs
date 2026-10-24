// Portable task execution/evidence core: no REDOWN, filesystem, provider, model or scoring imports.
export async function runTasks({tasks,target,application,environment,profile}){
 if(!Array.isArray(tasks)||tasks.length>100||!tasks.every(t=>typeof t.id==='string'&&typeof t.action==='string'))throw Error('INVALID_TASK_SET');
 const trials=[];
 for(const task of tasks){const start=performance.now();let outcome,oracle,diagnostics,cleanup,error=null,calls=0;try{calls++;outcome=await target.execute(task);calls++;oracle=await target.verify(task,outcome);if(oracle?.verified!==true)throw Error('ORACLE_UNVERIFIED');if(target.diagnose){calls++;diagnostics=await target.diagnose(task,outcome);}}catch(e){error=/^[A-Z_0-9]{1,64}$/.test(e.message)?e.message:'TASK_FAILED';}finally{if(target.cleanup){calls++;try{cleanup=await target.cleanup(task,outcome);}catch{cleanup={verified:false};}}}
  trials.push({taskId:task.id,action:task.action,state:error||cleanup?.verified!==true?'failed':'passed',error,durationMs:performance.now()-start,toolCalls:calls,oracle:oracle||{verified:false},diagnostics:diagnostics||null,cleanup:cleanup||{verified:false,reason:'not supplied'},modelTokens:{state:'unavailable'},humanInterventions:{state:'unmeasured'}});
 }
 return {benchmarkVersion:'0.1.0-experimental',application,environment,profile,trials,certification:'NOT_CERTIFIED',score:null,rank:null,limitations:['deterministic reference client, not cold-agent evaluation','no cross-project validation','no model token measurement']};
}
