// Aggregate click count. Failure never blocks menu installation.
export function createCounter(element,fetcher=fetch){
  let clicked=false,last=-1;
  async function update(method){
    if(typeof AbortController!=='function')return;
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),2000);
    try{const response=await fetcher('/gta/counter',{method,cache:'no-store',credentials:'omit',signal:abort.signal});if(!response.ok)return;const result=await response.json();if(Number.isSafeInteger(result.clicks)&&result.clicks>=0&&result.clicks>=last){last=result.clicks;element.textContent=String(last).replace(/\B(?=(\d{3})+(?!\d))/g,',');}}
    catch{/* Keep the last total and let the game loader proceed. */}finally{clearTimeout(timer);}
  }
  return {refresh:()=>update('GET'),click:()=>{if(clicked)return Promise.resolve();clicked=true;return update('POST');}};
}
