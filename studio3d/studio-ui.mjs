const $=id=>document.getElementById(id);
let setupReady=true,creating=false,remoteBusy=false,current=null,pollTimer;
const icons={'chicken-biryani':'🍲','sundal':'🥥','masala-dosa':'🥞',pancakes:'🥞','vegetable-sandwich':'🥪','vegetable-fried-rice':'🍚','tomato-pasta':'🍝',noodles:'🍜',chapati:'🫓','vegetable-soup':'🥣',salad:'🥗'};
const statusNames={queued:'Queued',narration:'Recording narration',preview:'Making a preview',rendering:'Animating the full film',complete:'Ready to watch',failed:'Needs another try'};
function node(tag,text,className){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;}

// Always communicate directly with the AWS Lambda Cloud API Gateway - Never run or fall back to local computer
const API_BASE = 'https://k0cdmsjevc.execute-api.us-east-1.amazonaws.com';

async function request(path,options){
 const fullPath = path.startsWith('/api') ? API_BASE + path : path;
 let response;
 try {
  response = await fetch(fullPath, options);
 } catch(netErr) {
  throw Error(`Could not connect to Cloud Studio (${netErr.message || 'Network error'}). Please check your internet connection.`);
 }
 let body;
 try{body=await response.json();}catch{throw Error('The cloud studio returned an invalid response. Please try again.');}
 if(!response.ok){const error=Error(body.error||body.message||`Cloud request failed with status ${response.status}`);error.body=body;error.status=response.status;throw error;}
 return body;
}

const options=()=>({prompt:$('prompt').value.trim(),voice:$('voice').value,format:$('format').value});
const post=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const save=id=>{try{id?sessionStorage.setItem('mayaJob',id):sessionStorage.removeItem('mayaJob');}catch{}};

function updateButton(){
 $('generate').disabled=creating||remoteBusy||!$('prompt').value.trim();
 $('generateText').textContent=creating?'Generating video…':remoteBusy?'Generation in progress':'Generate video';
 $('formHint').textContent=creating?'Your video is being created in the cloud. You can keep this page open.':remoteBusy?'A video is already being generated. Please wait for it to finish.':'Type any recipe or dish name. Chef Maya prepares the ingredients, narration, and 3D steps.';
}

function count(){ $('charCount').textContent=`${$('prompt').value.length} / 2000`;updateButton();}

function errorMessage(message){
 $('progressArea').hidden=false;
 $('progressArea').classList.add('error');
 $('status').textContent=message;
 $('stages').hidden=true;
 $('progress').hidden=true;
}

async function copyText(text,button){
 try{await navigator.clipboard.writeText(text);button.textContent='Copied';setTimeout(()=>button.textContent='Copy',1800);}catch{button.textContent='Select & copy';}
}

function renderSetup(setup){
 setupReady = setup ? (setup.ready !== false) : true;
 updateButton();
}

async function checkSetup(refresh=false){
 try{renderSetup(await request('/api/setup'+(refresh?'?refresh=1':'')));}
 catch{setupReady=true;updateButton();}
}

function chooseRecipe(recipe){
 if(creating)return;
 const isTamil = $('voice').value === 'ta-IN-PallaviNeural';
 $('prompt').value = isTamil ? recipe.name : `Teach children how to make ${recipe.name.toLowerCase()} step by step in simple English.`;
 count();
 save(null);
 current = null;
 if ($('video')) { $('video').pause(); $('video').hidden = true; }
 if ($('placeholder')) $('placeholder').hidden = false;
 if ($('download')) $('download').hidden = true;
 if ($('filmTitle')) $('filmTitle').textContent = 'No video generated';
 if ($('filmBadge')) $('filmBadge').textContent = 'Waiting';
 if ($('progressArea')) $('progressArea').hidden = true;
 document.querySelectorAll('.recipe-chip').forEach(button=>button.classList.toggle('active',button.dataset.recipe===recipe.id));
 $('create').scrollIntoView({behavior:'smooth'});$('prompt').focus({preventScroll:true});
}

function renderRecipes(recipes){
 const priority=['chicken-biryani','sundal','masala-dosa','vegetable-fried-rice','pancakes'];
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
 
 if ($('cinemaHeading')) {
   $('cinemaHeading').textContent = job.status === 'complete' ? '🎬 Chef Maya Cooking Film (முழு வீடியோ)' : 'Chef Maya 3D Cooking Cinema';
 }

 if (source && video) {
   if (video.getAttribute('src') !== source) {
     video.src = source;
     video.load();
     video.muted = false;
     video.volume = 1.0;
     const playPromise = video.play();
     if (playPromise !== undefined) {
       playPromise.catch(() => {
         video.muted = true;
         video.play().catch(() => {});
       });
     }
   }
   if (placeholder) placeholder.hidden = true;
   video.hidden = false;
 }
 $('download').hidden = !(job.status === 'complete' && job.videoUrl);
 if (job.videoUrl) {
   $('download').dataset.url = job.videoUrl;
   $('download').href = job.videoUrl;
   $('download').download = `chef-maya-${job.recipe || 'cooking'}.mp4`;
   $('download').textContent = '📥 Download Full HD MP4';
 }
 $('filmTitle').textContent = job.title || 'Cooking Film';
 $('filmDescription').textContent = job.status === 'complete' ? 'Complete animated cooking film with synchronized voice narration and subtitles.' : job.status === 'failed' ? 'Generation stopped. Please try again.' : 'Animating Maya in the kitchen...';
 $('filmBadge').textContent = job.status === 'complete' ? '✨ Movie Ready' : job.status === 'failed' ? 'Stopped' : 'Animating';
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
  if(job.status==='failed'){
    repeat=false;creating=false;remoteBusy=false;save(null);current=null;
    errorMessage(`Video rendering stopped: ${job.message || 'Generation failed on cloud service'}`);
    updateButton();
    return;
  }
  if(job.status==='complete'){repeat=false;creating=false;remoteBusy=false;save(null);current=null;updateButton();}
 }catch(error){
  if(error.status===404){repeat=false;creating=false;current=null;save(null);errorMessage('Your video session was not found. Please click Generate video to start.');updateButton();}
  else $('status').textContent=`Checking cloud render progress... (${error.message || 'reconnecting'})`;
 }finally{if(repeat&&current)pollTimer=setTimeout(poll,2500);}
}

$('video').addEventListener('click', () => { $('video').muted = false; });
$('download').addEventListener('click', async (e) => {
 e.preventDefault();
 const url = $('download').dataset.url || $('download').href;
 if (!url || url === '#' || url.startsWith('javascript:')) return;
 const originalText = $('download').textContent;
 $('download').textContent = '⏳ Preparing Download...';
 try {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch failed');
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = $('download').download || 'chef-maya-cooking-film.mp4';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  $('download').textContent = '✅ Downloaded!';
  setTimeout(() => { $('download').textContent = originalText; }, 3500);
 } catch (err) {
  window.open(url, '_blank');
  $('download').textContent = originalText;
 }
});

$('prompt').addEventListener('input', () => { count(); });

$('form').addEventListener('submit',async event=>{
 event.preventDefault();if(creating||remoteBusy)return;
 creating=true;updateButton();clearTimeout(pollTimer);
 $('progressArea').hidden=false;$('progressArea').classList.remove('error');
 $('status').textContent='Connecting to AWS cloud video studio...';
 $('progressText').textContent='0%';$('progress').value=0;$('stages').hidden=false;$('progress').hidden=false;
 try{
  const job=await request('/api/generate',post(options()));
  if(job.status==='complete'){creating=false;current=null;save(null);displayJob(job);updateButton();return;}
  current=job.id;save(current);
  $('download').hidden=true;$('video').pause();$('video').hidden=true;$('placeholder').hidden=false;
  displayJob(job);void poll();
 }catch(error){
  creating=false;
  errorMessage(`Error: ${error.message || 'Cloud video generation failed. Please try again.'}`);
  updateButton();
 }
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
