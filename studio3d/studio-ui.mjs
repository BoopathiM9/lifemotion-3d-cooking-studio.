const $=id=>document.getElementById(id);
let setupReady=true,creating=false,remoteBusy=false,current=null,pollTimer;
const icons={'chicken-biryani':'🍲','sundal':'🥥','masala-dosa':'🥞',pancakes:'🥞','vegetable-sandwich':'🥪','vegetable-fried-rice':'🍚','tomato-pasta':'🍝',noodles:'🍜',chapati:'🫓','vegetable-soup':'🥣',salad:'🥗'};
const statusNames={
  queued:'Queued',
  PENDING:'Queued',
  narration:'Recording narration',
  VOICE_GENERATION:'Recording narration',
  preview:'Creating preview',
  ANIMATION_GENERATION:'Creating preview',
  rendering:'Rendering full film',
  VIDEO_RENDERING:'Rendering full film',
  FINAL_VALIDATION:'Validating final video',
  complete:'Ready to watch',
  COMPLETED:'Ready to watch',
  failed:'Needs another try',
  FAILED:'Needs another try'
};

function node(tag,text,className){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;}

// Cloud API base when deployed on AWS Amplify; relative path for local development and tests
const API_BASE = (typeof window !== 'undefined' && window.location.hostname.includes('amplifyapp.com'))
  ? 'https://k0cdmsjevc.execute-api.us-east-1.amazonaws.com'
  : '';

async function request(path,options){
 const fullPath = path.startsWith('/api') ? API_BASE + path : path;
 let response;
 try {
  response = await fetch(fullPath, options);
 } catch(netErr) {
  throw Error(`Could not connect to Studio backend (${netErr.message || 'Network error'}). Check that CookMotion server is running.`);
 }
 let body;
 try{body=await response.json();}catch{throw Error('The studio returned an invalid response. Please try again.');}
 if(!response.ok){const error=Error(body.error||body.message||`Request failed with status ${response.status}`);error.body=body;error.status=response.status;throw error;}
 return body;
}

const options=()=>({prompt:$('prompt').value.trim(),voice:$('voice').value,format:$('format').value});
const post=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const save=id=>{try{id?sessionStorage.setItem('mayaJob',id):sessionStorage.removeItem('mayaJob');}catch{}};

function updateButton(){
 $('generate').disabled=creating||remoteBusy||!$('prompt').value.trim();
 $('generateText').textContent=creating?'Generating video…':remoteBusy?'Generation in progress':'Generate video';
 $('formHint').textContent=creating?'Your video is being created. You can keep this page open.':remoteBusy?'A video is already being generated. Please wait for it to finish.':'Type any recipe or dish name. Chef Maya prepares the ingredients, narration, and 3D steps.';
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
 $('create').scrollIntoView();$('prompt').focus({preventScroll:true});
}

function renderRecipes(recipes){
 const priority=['chicken-biryani','masala-dosa','vegetable-fried-rice','pancakes'];
 const ordered=[...priority.map(id=>recipes.find(r=>r.id===id)).filter(Boolean),...recipes.filter(r=>!priority.includes(r.id))];
 $('quickRecipes').replaceChildren();
 for(const recipe of ordered){
  if(priority.includes(recipe.id)){
    const button=node('button',recipe.name.replace('Vegetable ','Veg '),'recipe-chip');
    button.type='button';
    button.dataset.recipe=recipe.id;
    button.setAttribute('aria-label',`Use ${recipe.name} recipe`);
    button.addEventListener('click',()=>chooseRecipe(recipe));
    $('quickRecipes').append(button);
  }
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
 const isComplete = job.status === 'complete' || job.status === 'COMPLETED';
 const isFailed = job.status === 'failed' || job.status === 'FAILED';
 const source = isComplete ? job.videoUrl : job.previewUrl;
 
 if ($('cinemaHeading')) {
   $('cinemaHeading').textContent = isComplete ? '🎬 Chef Maya Cooking Film (முழு வீடியோ)' : 'Chef Maya 3D Cooking Cinema';
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
 $('download').hidden = !(isComplete && job.videoUrl);
 if (job.videoUrl) {
   $('download').dataset.url = job.videoUrl;
   $('download').href = job.videoUrl;
   $('download').download = `cookmotion-${job.recipe || 'cooking'}.mp4`;
   $('download').textContent = '📥 Download Full HD MP4';
 }
 $('filmTitle').textContent = job.title || 'Cooking Film';
 $('filmDescription').textContent = isComplete
   ? 'Complete animated cooking film with synchronized voice narration and subtitles.'
   : isFailed
   ? 'Generation stopped. Please try again.'
   : 'Animating Maya in the kitchen...';
 $('filmBadge').textContent = isComplete ? '✨ Movie Ready' : isFailed ? 'Stopped' : 'Animating';
}

function displayJob(job){
 $('progressArea').hidden=false;
 const failed = job.status === 'failed' || job.status === 'FAILED';
 const isComplete = job.status === 'complete' || job.status === 'COMPLETED';
 $('progressArea').classList.toggle('error',failed);
 $('stages').hidden=failed;
 $('progress').hidden=failed;

 $('status').textContent = job.message || statusNames[job.status] || statusNames[job.stage] || 'Preparing your film';
 $('progressText').textContent = `${Math.round(job.progress||0)}%`;
 $('progress').value = job.progress||0;

 // Sync with <ol id="stages"> in index.html: ['recipe', 'narration', 'render', 'export']
 let activeStageIndex = 0;
 const stage = (job.stage || job.status || job.legacyStatus || '').toUpperCase();
 if (stage.includes('RECIPE') || stage.includes('STORYBOARD') || stage.includes('QUEUED') || stage.includes('PENDING')) {
   activeStageIndex = 0;
 } else if (stage.includes('VOICE') || stage.includes('NARRATION')) {
   activeStageIndex = 1;
 } else if (stage.includes('ANIMATION') || stage.includes('RENDER') || stage.includes('PREVIEW')) {
   activeStageIndex = 2;
 } else if (stage.includes('FINAL') || stage.includes('COMPLETE') || stage.includes('EXPORT')) {
   activeStageIndex = 3;
 }

 document.querySelectorAll('#stages li').forEach((item, idx) => {
   item.classList.toggle('current', idx === activeStageIndex && !failed && !isComplete);
   item.classList.toggle('done', idx < activeStageIndex || (idx === 3 && isComplete));
 });

 displayMedia(job);
}

async function poll(){
 clearTimeout(pollTimer);if(!current)return;let repeat=true;
 try{
  const job=await request('/api/jobs/'+encodeURIComponent(current));displayJob(job);
  if(job.status==='failed' || job.status==='FAILED'){
    repeat=false;creating=false;remoteBusy=false;save(null);current=null;
    errorMessage(`Video rendering stopped: ${job.message || 'Generation failed on studio server'}`);
    updateButton();
    return;
  }
  if(job.status==='complete' || job.status==='COMPLETED'){
    repeat=false;creating=false;remoteBusy=false;save(null);current=null;updateButton();
  }
 }catch(error){
  if(error.status===404){repeat=false;creating=false;current=null;save(null);errorMessage('Your video session was not found. Please click Generate video to start.');updateButton();}
  else $('status').textContent=`Checking render progress... (${error.message || 'reconnecting'})`;
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
  a.download = $('download').download || 'cookmotion-cooking-film.mp4';
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

let approvedRecipe = null;

function displayRecipePlan(data) {
  approvedRecipe = data.rawRecipe || data;
  const section = $('planPanel');
  if (!section) return;

  $('planTitle').textContent = data.title || 'Cooking Recipe';
  $('planSourceBadge').textContent = data.source || 'Verified Recipe';

  // Warnings box
  const warnBox = $('assetWarningBox');
  const allWarnings = [...(data.warnings || [])];
  if (data.ollamaStatus && !data.ollamaStatus.available) {
    allWarnings.push('Local Ollama offline: Used CookMotion verified cooking curriculum');
  } else if (data.ollamaStatus && data.ollamaStatus.available && !data.ollamaStatus.modelInstalled) {
    allWarnings.push(`Qwen model missing: run 'ollama run ${data.ollamaStatus.models?.[0] || 'qwen2.5:1.5b'}'`);
  }

  if (allWarnings.length > 0) {
    warnBox.hidden = false;
    $('assetWarningText').textContent = allWarnings.join(' • ');
  } else {
    warnBox.hidden = true;
  }

  // Ingredients Chips
  const ingWrap = $('ingredientsChips');
  ingWrap.replaceChildren();
  const ings = data.ingredientDetails || data.ingredients || [];
  for (const ing of ings) {
    const chip = node('div', '', 'ingredient-chip');
    const dot = node('span', '', 'ingredient-color-dot');
    dot.style.backgroundColor = (typeof ing === 'object' && ing.color) || '#e2e8f0';
    const name = typeof ing === 'string' ? ing : ing.name;
    const qty = typeof ing === 'object' && ing.quantity ? ` (${ing.quantity})` : '';
    const label = node('span', `${name}${qty}`);
    chip.append(dot, label);
    ingWrap.append(chip);
  }

  // Storyboard steps list <ol id="planSteps">
  const stepsList = $('planSteps');
  stepsList.replaceChildren();
  if (Array.isArray(data.steps)) {
    data.steps.forEach(step => {
      const li = node('li', typeof step === 'string' ? step : step.text);
      stepsList.append(li);
    });
  }

  $('recipeEditorInput').value = JSON.stringify(approvedRecipe, null, 2);
  $('editRecipeBox').hidden = true;
  section.hidden = false;
}

$('previewPlan')?.addEventListener('click', async () => {
  const promptVal = $('prompt').value.trim();
  if (!promptVal) return;
  $('previewPlan').disabled = true;
  try {
    const data = await request('/api/plan', post(options()));
    displayRecipePlan(data);
  } catch (error) {
    errorMessage(`Recipe planning error: ${error.message}`);
  } finally {
    $('previewPlan').disabled = false;
  }
});

$('editRecipeBtn')?.addEventListener('click', () => {
  const box = $('editRecipeBox');
  box.hidden = !box.hidden;
  if (!box.hidden) {
    $('recipeEditorInput').focus();
  }
});

$('recipeEditorInput')?.addEventListener('input', () => {
  try {
    const updated = JSON.parse($('recipeEditorInput').value);
    if (updated.title) $('planDishTitle').textContent = updated.title;
    approvedRecipe = updated;
  } catch {}
});

$('confirmGenerateBtn')?.addEventListener('click', async () => {
  if (creating || remoteBusy || !approvedRecipe) return;
  creating = true;
  updateButton();
  clearTimeout(pollTimer);
  $('progressArea').hidden = false;
  $('progressArea').classList.remove('error');
  $('status').textContent = 'Starting 3D video render in studio...';
  $('progressText').textContent = '5%';
  $('progress').value = 5;
  $('stages').hidden = false;
  $('progress').hidden = false;

  try {
    const payload = {
      ...options(),
      recipe: approvedRecipe
    };
    const job = await request('/api/generate', post(payload));
    if (job.status === 'complete' || job.status === 'COMPLETED') {
      creating = false;
      current = null;
      save(null);
      displayJob(job);
      updateButton();
      return;
    }
    current = job.id;
    save(current);
    $('download').hidden = true;
    if ($('video')) { $('video').pause(); $('video').hidden = true; }
    if ($('placeholder')) $('placeholder').hidden = false;
    displayJob(job);
    void poll();
  } catch (error) {
    creating = false;
    errorMessage(`Error: ${error.message || 'Generation failed. Please try again.'}`);
    updateButton();
  }
});

$('prompt').addEventListener('input', () => { count(); });

$('form').addEventListener('submit', async event => {
  event.preventDefault();
  if (creating || remoteBusy) return;
  const promptVal = $('prompt').value.trim();
  if (!promptVal) return;

  if (!setupReady) {
    errorMessage('Video creation is not ready on this computer yet. Please install the required video tools, then restart CookMotion.');
    return;
  }

  creating = true;
  updateButton();
  clearTimeout(pollTimer);
  try {
    const job = await request('/api/generate', post(options()));
    if (job.status === 'complete' || job.status === 'COMPLETED') {
      creating = false;
      current = null;
      save(null);
      displayJob(job);
      updateButton();
      return;
    }
    current = job.id;
    save(current);
    $('download').hidden = true;
    if ($('video')) { $('video').pause(); $('video').hidden = true; }
    if ($('placeholder')) $('placeholder').hidden = false;
    displayJob(job);
    void poll();
  } catch (error) {
    creating = false;
    if (error.body?.setup) renderSetup(error.body.setup);
    errorMessage(error.message);
    updateButton();
  }
});

count();
await Promise.allSettled([checkSetup(), request('/api/recipes').then(data => renderRecipes(data.recipes))]);
try { current = sessionStorage.getItem('mayaJob'); } catch {}
if (current && !creating) {
  try {
    const job = await request('/api/jobs/' + encodeURIComponent(current));
    if (job.status !== 'complete' && job.status !== 'COMPLETED' && job.status !== 'failed' && job.status !== 'FAILED') {
      creating = true;
      updateButton();
      void poll();
    } else {
      current = null;
      save(null);
    }
  } catch {
    current = null;
    save(null);
  }
}
