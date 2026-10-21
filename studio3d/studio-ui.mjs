const $=id=>document.getElementById(id);
let setupReady=false,creating=false,remoteBusy=false,current=null,pollTimer,recipeList=[];
const icons={'chicken-biryani':'🍲','masala-dosa':'🥞',pancakes:'🥞','vegetable-sandwich':'🥪','vegetable-fried-rice':'🍚','tomato-pasta':'🍝',noodles:'🍜',chapati:'🫓','vegetable-soup':'🥣',salad:'🥗'};
const statusNames={queued:'Queued',narration:'Recording narration',preview:'Making a preview',rendering:'Animating the full film',complete:'Ready to watch',failed:'Needs another try'};
function node(tag,text,className){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;}
async function request(path,options){
 const response=await fetch(path,options);let body;
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
 $('formHint').textContent=creating?'Your video is being created. You can keep this page open.':remoteBusy?'A video is already being generated. Recent videos will update when it finishes.':'English narration and subtitles are included.';
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
 $('prompt').value=recipe.prompt||`Teach children how to make ${recipe.name.toLowerCase()} step by step in simple English.`;count();$('planPanel').hidden=true;
 document.querySelectorAll('.recipe-chip').forEach(button=>button.classList.toggle('active',button.dataset.recipe===recipe.id));
 $('create').scrollIntoView({behavior:'smooth'});$('prompt').focus({preventScroll:true});
}
function renderRecipes(recipes){
 recipeList=recipes;const priority=['chicken-biryani','vegetable-fried-rice','pancakes','masala-dosa'];
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
 const source=job.status==='complete'?job.videoUrl:job.previewUrl;
 if(source){const video=$('video');if(video.getAttribute('src')!==source){video.src=source;video.load();}$('placeholder').hidden=true;video.hidden=false;}
 $('download').hidden=!(job.status==='complete'&&job.videoUrl);
 if(job.videoUrl){$('download').href=job.videoUrl+'?download=1';$('download').download=`maya-${job.recipe}-${job.format?.replace(':','x')||'video'}.mp4`;}
 $('filmTitle').textContent=job.title||'Cooking video';
 $('filmDescription').textContent=job.generic?'Generic animation generated. Review the recipe steps before using this lesson.':job.status==='complete'?'Complete MP4 with English narration and subtitles.':job.previewUrl?'Preview ready. The complete video is still rendering.':job.status==='failed'?'Generation stopped. Follow the message and try again.':'Preparing animation, narration, and subtitles.';
 $('filmBadge').textContent=job.generic?'Generic animation':job.status==='complete'?'Ready':job.previewUrl?'Preview ready':job.status==='failed'?'Stopped':'Generating';
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
  if(['complete','failed'].includes(job.status)){repeat=false;creating=false;remoteBusy=false;save(null);current=null;updateButton();await loadFilms();}
 }catch(error){
  if(error.status===404){repeat=false;creating=false;current=null;save(null);errorMessage('Your previous session is no longer available. Choose a recipe to start a new film.');updateButton();}
  else $('status').textContent='Connection interrupted. Keep the studio running; we’re trying to reconnect…';
 }finally{if(repeat&&current)pollTimer=setTimeout(poll,2500);}
}
async function loadFilms(){
 try{
  const data=await request('/api/jobs');remoteBusy=data.busy;
  const active=data.jobs.find(job=>!['complete','failed'].includes(job.status));
  if(data.busy&&active&&!creating){current=active.id;restoreControls(active);creating=true;save(current);void poll();}
  updateButton();const list=$('filmList');list.replaceChildren();
  const films=data.jobs.filter(job=>job.status==='complete');
  if(!films.length){list.append(node('p','Your finished films will live here. Let’s make the first one.','empty-library'));return;}
  for(const job of films){
   const item=node('div',undefined,'film-item'),info=node('div',undefined,'film-info'),open=node('button','Watch','text-button');open.type='button';open.append(node('span','','arrow'));
   info.append(node('strong',job.title||'Cooking film'),node('p',`${job.format||'16:9'} · English narration · MP4`));item.append(node('span','▷','film-icon'),info,open);
   open.addEventListener('click',()=>{if(creating)return;restoreControls(job);displayMedia(job);$('video').scrollIntoView({behavior:'smooth',block:'center'});});list.append(item);
  }
 }catch{$('filmList').replaceChildren(node('p','Your film library is unavailable. Check the studio connection and refresh.','empty-library'));}
}
$('prompt').addEventListener('input',()=>{count();$('planPanel').hidden=true;});
$('refreshFilms').addEventListener('click',loadFilms);
$('previewPlan').addEventListener('click',async()=>{
 if(!$('form').reportValidity())return;
 $('previewPlan').disabled=true;
 try{
  const plan=await request('/api/plan',post(options()));$('planTitle').textContent=plan.title;$('planType').textContent=plan.generic?'Generic animation':'Guided recipe';$('planNote').textContent=plan.limitations||`${plan.ingredients.join(', ')}. Narrated in simple English.`;$('planSteps').replaceChildren(...plan.steps.map(step=>node('li',step.text)));$('planPanel').hidden=false;
 }catch(error){errorMessage(error.message);}
 finally{$('previewPlan').disabled=false;}
});
$('form').addEventListener('submit',async event=>{
 event.preventDefault();if(creating||remoteBusy)return;
 if(!setupReady){errorMessage('Video creation is not ready on this computer yet. Please install the required video tools, then restart LifeMotion.');return;}
 creating=true;updateButton();clearTimeout(pollTimer);
 try{
  const job=await request('/api/generate',post(options()));current=job.id;save(current);
  $('download').hidden=true;$('video').pause();$('video').hidden=true;$('placeholder').hidden=false;
  displayJob(job);void poll();
 }catch(error){creating=false;if(error.body?.setup)renderSetup(error.body.setup);if(error.status===409){remoteBusy=true;void loadFilms();}errorMessage(error.message);updateButton();}
});
count();
await Promise.allSettled([checkSetup(),loadFilms(),request('/api/recipes').then(data=>renderRecipes(data.recipes))]);
try{current??=sessionStorage.getItem('mayaJob');}catch{}
if(current&&!creating){
 try{const job=await request('/api/jobs/'+encodeURIComponent(current));restoreControls(job);creating=true;updateButton();void poll();}
 catch{current=null;save(null);}
}
setInterval(()=>{if(!creating)void loadFilms();},15000);
