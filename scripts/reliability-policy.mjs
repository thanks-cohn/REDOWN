// Pure regression policy: known debt stays visible; incomplete execution can never pass.
export function evaluateRegression({events,baseline,exitCode,executionError=false}){
 const failures=events.filter(e=>e.type==='fail'),passes=events.filter(e=>e.type==='pass'),unexpected=[],known=[];
 for(const failure of failures){const match=baseline.failures.find(b=>b.file===failure.file&&b.name===failure.name&&b.error.name===failure.error?.name&&b.error.code===failure.error?.code&&b.error.operator===failure.error?.operator);(match?known:unexpected).push(failure);}
 const unseen=baseline.failures.filter(b=>!events.some(e=>e.file===b.file&&e.name===b.name));
 const incomplete=executionError||![0,1].includes(exitCode)||!events.length||unseen.length>0||passes.some(e=>e.skipped||e.todo)||failures.some(e=>failures.filter(f=>f.file===e.file&&f.name===e.name).length>1)||exitCode===1&&!failures.length||exitCode===0&&failures.length>0;
 return {state:incomplete||unexpected.length?'failed':known.length?'partial':'passed',newFailures:unexpected,knownFailures:known,unseenBaselineTests:unseen.map(({file,name})=>({file,name})),passed:passes.filter(e=>!e.skipped&&!e.todo).length,skipped:passes.filter(e=>e.skipped||e.todo).length,incomplete,baselineResolved:baseline.failures.filter(b=>passes.some(e=>!e.skipped&&!e.todo&&e.file===b.file&&e.name===b.name)).map(({file,name})=>({file,name}))};
}
