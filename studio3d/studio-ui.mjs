const $=id=>document.getElementById(id);
let setupReady=false,creating=false,remoteBusy=false,current=null,pollTimer;
const icons={'chicken-biryani':'🍲','masala-dosa':'🥞',pancakes:'🥞','vegetable-sandwich':'🥪','vegetable-fried-rice':'🍚','tomato-pasta':'🍝',noodles:'🍜',chapati:'🫓','vegetable-soup':'🥣',salad:'🥗'};
const statusNames={queued:'Queued',narration:'Recording narration',preview:'Making a preview',rendering:'Animating the full film',complete:'Ready to watch',failed:'Needs another try'};
function node(tag,text,className){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;}
const API_BASE = window.location.hostname.includes('amplifyapp.com') ? 'https://k0cdmsjevc.execute-api.us-east-1.amazonaws.com' : '';
async function request(path,options){
 const fullPath = path.startsWith('/api') ? API_BASE + path : path;
 const response = await fetch(fullPath, options);let body;
 try{body=await response.json();}catch{throw Error('The studio returned an unexpected response. Restart the studio and refresh this page.');}
 if(!response.ok){const error=Error(body.error||'The studio could not finish this request.');error.body=body;error.status=response.status;throw error;}
 return body;
}
const options=()=>({prompt:$('prompt').value.trim(),voice:$('voice').value,format:$('format').value});
const post=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const save=id=>{try{id?sessionStorage.setItem('mayaJob',id):sessionStorage.removeItem('mayaJob');}catch{}};
function updateButton(){
 $('generate').disabled=creating||remoteBusy||!$('prompt').value.trim();
 $('generateText').textContent=creating?'Generating video…':remoteBusy?'Generation in progress':'Generate video';
 $('formHint').textContent=creating?'Your video is being created. You can keep this page open.':remoteBusy?'A video is already being generated. Please wait for it to finish.':'Type any dish name. Maya can create a local lesson even when online recipe services are unavailable.';
}
function count(){ $('charCount').textContent=`${$('prompt').value.length} / 2000`;updateButton();}
function errorMessage(message){$('progressArea').hidden=false;$('progressArea').classList.add('error');$('status').textContent=message;$('stages').hidden=true;$('progress').hidden=true;}
async function copyText(text,button){
 try{await navigator.clipboard.writeText(text);button.textContent='Copied';setTimeout(()=>button.textContent='Copy',1800);}catch{button.textContent='Select & copy';}
}
function renderSetup(setup){
 setupReady=setup.ready;
 updateButton();
}
async function checkSetup(refresh=false){
 try{renderSetup(await request('/api/setup'+(refresh?'?refresh=1':'')));}
 catch{setupReady=false;updateButton();}
}
function chooseRecipe(recipe){
 if(creating)return;
 const isTamil = $('voice').value === 'ta-IN-PallaviNeural';
 $('prompt').value = isTamil ? recipe.name : `Teach children how to make ${recipe.name.toLowerCase()} step by step in simple English.`;
 count();
 $('planPanel').hidden = true;
 save(null);
 current = null;
 if ($('video')) { $('video').pause(); $('video').hidden = true; }
 if ($('placeholder')) $('placeholder').hidden = false;
 if ($('download')) $('download').hidden = true;
 if ($('filmTitle')) $('filmTitle').textContent = 'No video generated';
 if ($('filmBadge')) $('filmBadge').textContent = 'Waiting';
 document.querySelectorAll('.recipe-chip').forEach(button=>button.classList.toggle('active',button.dataset.recipe===recipe.id));
 $('create').scrollIntoView({behavior:'smooth'});$('prompt').focus({preventScroll:true});
}
function renderRecipes(recipes){
 const priority=['chicken-biryani','vegetable-fried-rice','pancakes','masala-dosa'];
 const ordered=[...priority.map(id=>recipes.find(r=>r.id===id)).filter(Boolean),...recipes.filter(r=>!priority.includes(r.id))];
 $('quickRecipes').replaceChildren();
 for(const recipe of ordered){
  if(priority.includes(recipe.id)){const button=node('button',recipe.name.replace('Vegetable ','Veg '),'recipe-chip');button.type='button';button.dataset.recipe=recipe.id;button.setAttribute('aria-label',`Use ${recipe.name} recipe`);button.addEventListener('click',()=>chooseRecipe(recipe));$('quickRecipes').append(button);}
 }
}
function restoreControls(job){
 if(job.prompt)$('prompt').value=String(job.prompt).slice(0,2000);
 if(job.voice)$('voice').value=job.voice;
 if(job.format)$('format').value=job.format;
 count();
}
function displayMedia(job){
 const video = $('video');
 const placeholder = $('placeholder');
 const source = job.status === 'complete' ? job.videoUrl : job.previewUrl;
 if (source && video) {
   video.muted = false;
   video.volume = 1.0;
   if (video.getAttribute('src') !== source) {
     video.src = source;
     video.load();
     video.play().catch(() => {});
   }
   if (placeholder) placeholder.hidden = true;
   video.hidden = false;
 }
 $('download').hidden = !(job.status === 'complete' && job.videoUrl);
 if (job.videoUrl) {
   $('download').href = job.videoUrl + '?download=1';
   $('download').download = `maya-${job.recipe}-${job.format?.replace(':', 'x') || 'video'}.mp4`;
   $('download').textContent = 'Download video';
 }
 $('filmTitle').textContent = job.title || 'Cooking video';
 $('filmDescription').textContent = job.generic ? 'Generic animation generated. Review the recipe steps before using this lesson.' : job.status === 'complete' ? 'Complete MP4 with English narration and subtitles.' : job.previewUrl ? 'Preview ready. The complete video is still rendering.' : job.status === 'failed' ? 'Generation stopped. Follow the message and try again.' : 'Preparing animation, narration, and subtitles.';
 $('filmBadge').textContent = job.generic ? 'Generic animation' : job.status === 'complete' ? 'Ready' : job.previewUrl ? 'Preview ready' : job.status === 'failed' ? 'Stopped' : 'Generating';
}
function displayJob(job){
 $('progressArea').hidden=false;const failed=job.status==='failed';$('progressArea').classList.toggle('error',failed);$('stages').hidden=failed;$('progress').hidden=failed;
 $('status').textContent=job.message||statusNames[job.status]||'Preparing your film';$('progressText').textContent=`${Math.round(job.progress||0)}%`;$('progress').value=job.progress||0;
 const stages=['narration','preview','rendering','complete'],index=stages.indexOf(job.status);
 document.querySelectorAll('[data-stage]').forEach(item=>{const step=stages.indexOf(item.dataset.stage);item.classList.toggle('current',step===index);item.classList.toggle('done',step<index);});
 displayMedia(job);
}
async function poll(){
 clearTimeout(pollTimer);if(!current)return;let repeat=true;
 try{
  const job=await request('/api/jobs/'+encodeURIComponent(current));displayJob(job);
  if(['complete','failed'].includes(job.status)){repeat=false;creating=false;remoteBusy=false;save(null);current=null;updateButton();}
 }catch(error){
  if(error.status===404){repeat=false;creating=false;current=null;save(null);errorMessage('Your previous session is no longer available. Choose a recipe to start a new film.');updateButton();}
  else $('status').textContent='Connection interrupted. Keep the studio running; we’re trying to reconnect…';
 }finally{if(repeat&&current)pollTimer=setTimeout(poll,2500);}
}
$('prompt').addEventListener('input',()=>{count();$('planPanel').hidden=true;});
$('previewPlan').addEventListener('click',async()=>{
 if(!$('form').reportValidity())return;
 $('previewPlan').disabled=true;
 try{
  const plan=await request('/api/plan',post(options()));
  $('planTitle').textContent=plan.title;
  $('planType').textContent=plan.source==='gemini'?'AI recipe plan':plan.source==='free recipe lookup'?'Recipe lookup':plan.source==='Tamil AI narration'?'Tamil AI narration':plan.generic?'Basic recipe plan':'Guided recipe';
  $('planSteps').replaceChildren(...plan.steps.map(step=>node('li',step.text)));
  const audioEl = $('planAudio');
  if (audioEl) {
    if (plan.audioUrl) {
      audioEl.src = plan.audioUrl;
      audioEl.parentElement.hidden = false;
      audioEl.play().catch(()=>{});
    } else {
      audioEl.parentElement.hidden = true;
    }
  }
  $('planPanel').hidden=false;
 }catch(error){errorMessage(error.message);}
 finally{$('previewPlan').disabled=false;}
});
$('form').addEventListener('submit',async event=>{
 event.preventDefault();if(creating||remoteBusy)return;
 if(!setupReady){errorMessage('Video creation is not ready on this computer yet. Please install the required video tools, then restart LifeMotion.');return;}
 creating=true;updateButton();clearTimeout(pollTimer);
 try{
  const job=await request('/api/generate',post(options()));if(job.status==='complete'){creating=false;current=null;save(null);displayJob(job);updateButton();return;}current=job.id;save(current);
  $('download').hidden=true;$('video').pause();$('video').hidden=true;$('placeholder').hidden=false;
  displayJob(job);void poll();
 }catch(error){creating=false;if(error.body?.setup)renderSetup(error.body.setup);if(error.status===409){remoteBusy=true;void loadFilms();}errorMessage(error.message);updateButton();}
});
count();
await Promise.allSettled([checkSetup(),request('/api/recipes').then(data=>renderRecipes(data.recipes))]);
try{current=sessionStorage.getItem('mayaJob');}catch{}
if(current&&!creating){
 try{
  const job=await request('/api/jobs/'+encodeURIComponent(current));
  if(job.status!=='complete'&&job.status!=='failed'){
    creating=true;updateButton();void poll();
  } else {
    current=null;save(null);
  }
 }catch{current=null;save(null);}
}
