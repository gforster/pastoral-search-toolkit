import {FIELD_MAP,MODULES,PATHS} from './data.js';
import {newProject,setAnswer,escapeHtml as e,uid,now,reviewModule,invalidateReviews,importBackup,serializeBackup,readiness,resolved,MAX_BACKUP_BYTES} from './domain.js';
import {ProjectStore,PREFIX} from './storage.js';
import {makeDocument,documentMarkdown} from './documents.js';
import {homeView,projectsView,orientationView,sidebar,dashboardView,moduleView,tasksView,documentsView,aboutView,base} from './views.js';
const app=document.querySelector('#app'),announcer=document.querySelector('#announcer');
const cache=new Map(),saveErrors=new Map(),unsavedIds=new Set();let store,current=null,draft=null,draftPath='',step=0,saveError='',message='',unsaved=false,loadError='';
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.querySelector('#main')?.focus();});
try{store=new ProjectStore(window.localStorage);}catch{loadError='Browser storage is unavailable. You can work here, but export a backup before closing the page.';}
function projects(){
  if(!store)return {projects:[...cache.values()],errors:[]};
  try{const r=store.list();for(const p of r.projects)if(!cache.has(p.id))cache.set(p.id,p);return {...r,projects:[...new Map([...r.projects,...cache.values()].map(p=>[p.id,p])).values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};}
  catch{loadError='Saved projects could not be read. Your existing browser data has not been removed.';return {projects:[...cache.values()],errors:[]};}
}
function getProject(id){if(cache.has(id))return cache.get(id);const p=store?.load(id);if(p)cache.set(id,p);return p;}
function notify(text){message=text;announcer.textContent=text;updateFeedback();}
function updateFeedback(){
  saveError=saveErrors.get(active()?.id)||'';unsaved=unsavedIds.size>0;
  const f=document.querySelector('#feedback');if(f)f.innerHTML=`${loadError?`<div class="error-banner" role="alert">${e(loadError)}</div>`:''}${saveError?`<div class="error-banner" role="alert"><strong>Not saved on this device.</strong> ${e(saveError)} <button class="button" data-export>Export current work</button><button class="button" data-reload>Reload saved copy</button></div>`:''}${message?`<div class="feedback-message" role="status">${e(message)}<button class="text-button" data-dismiss aria-label="Dismiss message">Dismiss</button></div>`:''}`;
  const s=document.querySelector('#save-indicator');if(s){s.textContent=saveError||loadError?'Keep a backup — saving unavailable':current?'Saved on this device':'Private · no account';s.classList.toggle('save-warning',!!(saveError||loadError));}
  const p=active();if(p)for(const el of document.querySelectorAll('select[data-field]')){const a=p.answers[el.dataset.field];const value=a?.status==='known'?a.value:'';if(el.value!==value)el.value=value;updateAnswerControl(el.dataset.field);}
}
function save(p=current){
  if(!p)return;cache.set(p.id,p);p.updatedAt=now();
  try{if(!store)throw new Error('Browser storage is unavailable. Export a backup before closing this page.');store.save(p);saveErrors.delete(p.id);unsavedIds.delete(p.id);}
  catch(err){saveError=err.name==='QuotaExceededError'?'This browser’s storage is full. Your current work is still here; export it before leaving.':err.message;saveErrors.set(p.id,saveError);unsavedIds.add(p.id);}updateFeedback();
}
function active(){return current||draft;}
function recordChange(module){const p=active();invalidateReviews(p,module);p.updatedAt=now();if(current)save();}
function route(){const [path,query]=(location.hash.slice(1)||'home').split('?');return {parts:path.split('/'),field:new URLSearchParams(query).get('field')};}
function render(focus=false){
  const {parts,field}=route();let view='',shell=false,section='',moduleId='';current=null;
  try{
    if(parts[0]==='home')view=homeView(projects().projects);
    else if(parts[0]==='projects'){const ps=projects();view=projectsView(ps.projects,ps.errors);}
    else if(parts[0]==='about')view=aboutView();
    else if(parts[0]==='new'){const path=PATHS.some(p=>p[0]===parts[1])?parts[1]:'sudden';if(!draft||draftPath!==path){draft=newProject(path);draftPath=path;step=0;}view=orientationView(draft,step);}
    else if(parts[0]==='project'){
      current=getProject(parts[1]);if(!current)throw new Error('This project is not on this device. Open a saved project or import its backup.');
      shell=true;section=parts[2]||'dashboard';moduleId=section==='module'?parts[3]:'';
      if(section==='dashboard')view=dashboardView(current);else if(section==='module')view=moduleView(current,moduleId);else if(section==='tasks')view=tasksView(current,parts[3]);else if(section==='documents')view=documentsView(current,parts[3]);else throw new Error('That page is not part of this workbook.');
    }else throw new Error('That page could not be found.');
  }catch(err){view=`<main id="main" class="standalone narrow" tabindex="-1"><h1>Let’s find your workbook.</h1><p>${e(err.message)}</p><a class="button primary" href="#projects">Open a project</a><a class="button" href="#home">Starting points</a></main>`;shell=false;}
  document.title=`${current?current.name+' · ':''}Pastoral Search Toolkit`;
  app.innerHTML=`<header class="site-header"><a class="brand" href="#home"><img src="./favicon.svg" alt="" width="36" height="36"><span>Pastoral Search<span class="brand-sub">TOOLKIT</span></span></a><nav aria-label="Main"><span id="save-indicator" class="save-indicator"></span><a href="#projects">Open a project</a><a href="#about">About the toolkit</a></nav></header><div id="feedback" class="feedback"></div>${shell?`<div class="mobile-project-bar"><button class="button" data-toggle-nav aria-expanded="false" aria-controls="project-navigation">Workbook navigation</button><button class="text-button" data-export>Backup</button></div><div class="workspace">${sidebar(current,section,moduleId)}<main id="main" class="project-main ${section==='documents'&&parts[3]?'document-main':''}" tabindex="-1">${view}</main></div>`:view}<footer class="site-footer"><span>Feedback preview · Independent Fundamental Baptist roots</span><a href="https://github.com/gforster/pastoral-search-toolkit/issues/new" target="_blank" rel="noopener noreferrer">Give feedback ↗</a><a href="https://github.com/gforster/pastoral-search-toolkit" target="_blank" rel="noopener noreferrer">Free & open source ↗</a></footer><dialog id="confirm-dialog" aria-labelledby="confirm-title"><div class="dialog-content"><h2 id="confirm-title"></h2><p id="confirm-description"></p><div class="actions"><button class="button" data-cancel-dialog>Cancel</button><button class="button danger-button" id="confirm-action">Confirm</button></div></div></dialog>`;
  updateFeedback();if(focus){document.querySelector('#main')?.focus({preventScroll:true});window.scrollTo(0,0);}
  if(field&&FIELD_MAP[field]&&focus){document.getElementById(`item-${field}`)?.scrollIntoView({block:'center'});document.getElementById(`field-${field}`)?.focus({preventScroll:true});}
}
function download(text,name,type='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function safeName(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,80)||'church';}
function exportProject(){const p=active();if(!p){notify('Open a project before exporting its backup.');return;}download(serializeBackup(p),`${safeName(p.name)}-${new Date().toISOString().slice(0,10)}.json`);notify('Backup downloaded. Keep it somewhere secure; it contains your complete workbook.');}
function confirmAction(title,description,button,action){const dialog=document.querySelector('#confirm-dialog');document.querySelector('#confirm-title').textContent=title;document.querySelector('#confirm-description').textContent=description;const b=document.querySelector('#confirm-action');b.textContent=button;b.onclick=()=>{dialog.close();try{action();}catch(err){notify(err.message);}};dialog.showModal();}
function updateAnswerControl(id){const p=active(),a=p.answers[id],f=FIELD_MAP[id],label=document.querySelector(`[data-status-for="${id}"]`);if(label)label.textContent=a?.status==='not_applicable'?'Not applicable':resolved(p,f)?'Recorded':a?.value?'Needs confirmation':'Not known yet';}
function handleEdit(el){
  const p=active();if(!p)return;
  try{
    if(el.dataset.field){const id=el.dataset.field;setAnswer(p,id,el.value,el.value?'known':'unknown');if(current)save();updateAnswerControl(id);}
    else if(el.dataset.inventory)p.inventory[el.dataset.inventory]=el.value;
    else if(el.dataset.qualification){const {qualification,part}=el.dataset;p.qualifications[qualification]||={};p.qualifications[qualification][part]=el.value;recordChange('qualifications');}
    else if(el.dataset.requirement){const r=p.requirements.find(r=>r.id===el.dataset.requirement);if(r){r[el.dataset.part]=el.value;recordChange('convictions');}}
  }catch(err){notify(err.message);}
}
app.addEventListener('input',event=>{if(event.target.matches('input[data-field],textarea[data-field],textarea[data-qualification],textarea[data-requirement]'))handleEdit(event.target);});
app.addEventListener('change',async event=>{
  const el=event.target,p=active();try{
    if(el.id==='import-file'){const file=el.files[0];if(!file)return;if(file.size>MAX_BACKUP_BYTES)throw new Error('Choose a project JSON backup smaller than 2 MB.');const imported=importBackup(await file.text());save(imported);location.hash=`project/${imported.id}/dashboard`;notify('Backup opened as a separate project. Your other projects are unchanged.');return;}
    if(!p)return;
    if(el.matches('select[data-field],select[data-inventory],select[data-requirement]')){handleEdit(el);if(['event','associate','interim','internalCandidate'].includes(el.dataset.field))render();}
    if(el.dataset.milestone!==undefined){p.milestone=el.value;save();render();}
    if(el.dataset.question){p.questions=el.checked?[...new Set([...p.questions,el.dataset.question])]:p.questions.filter(id=>id!==el.dataset.question);recordChange('interviews');}
    if(el.dataset.resolveTask){const t=p.tasks.find(t=>t.id===el.dataset.resolveTask);if(t){t.resolved=el.checked;recordChange('call');render();notify(t.resolved?'Prerequisite recorded as resolved. Verify final call prerequisites again if this affects an earlier review.':'Prerequisite reopened.');}}
  }catch(err){notify(err.message);}
});
app.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;const d=button.dataset,p=active();try{
    if(d.dismiss!==undefined){message='';updateFeedback();}
    if(d.cancelDialog!==undefined)document.querySelector('#confirm-dialog').close();
    if(d.toggleNav!==undefined){const expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));document.querySelector('.sidebar').classList.toggle('is-open',!expanded);}
    if(d.export!==undefined)exportProject();
    if(d.reload!==undefined)confirmAction('Reload the saved copy?','Unsaved changes to any project in this tab will be lost. Export each affected project first if you need to keep those changes.','Reload',()=>{unsaved=false;location.reload();});
    if(d.recover){const raw=store?.recoverRaw(d.recover);if(raw)download(raw,'pastoral-project-recovery.json');}
    if(d.delete){const target=getProject(d.delete);confirmAction('Delete this project from this device?',`“${target.name}” will be removed from this browser. A downloaded backup is the only way to restore it.`,'Delete project',()=>{store?.remove(target.id,target.revision);cache.delete(target.id);saveErrors.delete(target.id);unsavedIds.delete(target.id);render();notify('Project removed from this device. Downloaded backups are unchanged.');});}
    if(d.orientation){if(d.orientation==='cancel'){draft=null;location.hash='home';}else if(d.orientation==='back'){step=Math.max(0,step-1);render(true);}else if(d.orientation==='next'){step=Math.min(2,step+1);render(true);}else{const created=draft;save(created);draft=null;location.hash=`project/${created.id}/dashboard`;notify('Your project is ready. Open any module, and export a backup as your work develops.');}}
    if(!p)return;
    if(d.unknown){setAnswer(p,d.unknown,'','unknown');if(current)save();render();document.getElementById(`field-${d.unknown}`)?.focus();notify('Recorded as unknown. When required, this remains an open decision for its milestone.');}
    if(d.na){setAnswer(p,d.na,'',p.answers[d.na]?.status==='not_applicable'?'unknown':'not_applicable');if(current)save();render();}
    if(d.stage){p.milestone=d.stage;save();render(true);notify('Current focus changed. This does not mark earlier work complete.');}
    if(d.review){reviewModule(p,d.review);save();render();notify('Module reviewed. Changes to related information will prompt another review.');}
    if(d.addRequirement!==undefined){if(p.requirements.length>=200)throw new Error('This project already has 200 considerations.');p.requirements.push({id:uid(),statement:'',evidence:'',category:'conviction',status:'draft'});recordChange('convictions');render();document.querySelector('.requirement-card:last-of-type textarea')?.focus();}
    if(d.removeRequirement)confirmAction('Remove this consideration?','Its statement and notes will be removed from this workbook.','Remove',()=>{p.requirements=p.requirements.filter(r=>r.id!==d.removeRequirement);recordChange('convictions');render();});
    if(d.removeTask)confirmAction('Remove this church prerequisite?','Removing it changes the readiness check. Only remove a requirement that your church has determined does not apply.','Remove prerequisite',()=>{p.tasks=p.tasks.filter(t=>t.id!==d.removeTask);recordChange('call');render();});
    if(d.markdown){const doc=makeDocument(p,d.markdown);download(documentMarkdown(doc),`${safeName(p.name)}-${doc.code.toLowerCase()}.md`,'text/markdown;charset=utf-8');notify('Document downloaded as Markdown. Review it before sharing.');}
    if(d.print!==undefined)window.print();
  }catch(err){notify(err.message);}
});
app.addEventListener('submit',event=>{
  if(event.target.id!=='add-task-form')return;event.preventDefault();if(!current)return;const data=new FormData(event.target),label=String(data.get('label')).trim();if(!label)return;if(current.tasks.length>=200){notify('This project already has 200 additional prerequisites.');return;}
  current.tasks.push({id:uid(),label,owner:String(data.get('owner')).trim(),due:Number(data.get('due')),resolved:false});recordChange('call');render();notify('Church prerequisite added to the readiness checks.');
});
window.addEventListener('hashchange',()=>{message='';render(true);});
window.addEventListener('storage',event=>{
  if(event.key&&!event.key.startsWith(PREFIX))return;
  const ids=event.key?[event.key.slice(PREFIX.length)]:[...cache.keys()];
  for(const id of ids){if(current?.id===id||unsavedIds.has(id)){saveErrors.set(id,'This project changed in another tab. Export any work you want to preserve, then reload the saved copy.');unsavedIds.add(id);}else cache.delete(id);}updateFeedback();
});
window.addEventListener('beforeunload',event=>{if(unsaved){event.preventDefault();event.returnValue='';}});
render();

// Optional browser-agent interface; project data is never transmitted automatically.
const modelContext=document.modelContext;
if(modelContext?.registerTool){
  const lifecycle=new AbortController();
  const definitions=[
    {name:'read_project_readiness',title:'Read project readiness',description:'Read the current milestone and unresolved labels without changing the project.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object.');if(!current)throw new Error('Open a project first.');const r=readiness(current);return {milestone:current.milestone,readyForHumanReview:r.ready,openDecisions:[...r.missing.map(f=>f.label),...r.custom.map(t=>t.label)]};}},
    {name:'open_workbook_module',title:'Open workbook module',description:'Open a module in the current project. Does not change answers or mark work complete.',inputSchema:{type:'object',properties:{moduleId:{type:'string',enum:MODULES.map(m=>m.id)}},required:['moduleId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Object.keys(input).some(k=>k!=='moduleId')||!MODULES.some(m=>m.id===input.moduleId))throw new Error('Choose a valid moduleId.');if(!current)throw new Error('Open a project first.');history.replaceState(null,'',`${base(current)}/module/${input.moduleId}`);render(true);return {openedModule:input.moduleId};}},
  ];
  for(const tool of definitions){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Normal browser use remains available. */}}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
