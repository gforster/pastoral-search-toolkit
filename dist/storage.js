import {validateProject} from './domain.js';
export const PREFIX='pastoral-search-toolkit:v1:';
export class ProjectStore {
  constructor(storage) { this.storage=storage; }
  list() {
    const projects=[],errors=[];
    for(let i=0;i<this.storage.length;i++){
      const key=this.storage.key(i);if(!key?.startsWith(PREFIX))continue;
      try{projects.push(validateProject(JSON.parse(this.storage.getItem(key))));}catch{errors.push(key.slice(PREFIX.length));}
    }
    return {projects:projects.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),errors};
  }
  load(id) { const raw=this.storage.getItem(PREFIX+id);return raw?validateProject(JSON.parse(raw)):null; }
  save(p) {
    const clean=validateProject(p);
    const raw=this.storage.getItem(PREFIX+p.id);
    if(raw){let existing;try{existing=validateProject(JSON.parse(raw));}catch{throw new Error('The saved project could not be read. Export your current work before recovering it.');}
      if(existing.revision!==p.revision)throw new Error('This project changed in another tab. Export this tab’s work, then reload to use the latest saved copy.');
    } else if(p.revision>0) throw new Error('This project was removed in another tab. Export your current work to preserve it.');
    clean.revision=p.revision+1;clean.updatedAt=new Date().toISOString();
    this.storage.setItem(PREFIX+p.id,JSON.stringify(clean));p.revision=clean.revision;p.updatedAt=clean.updatedAt;return p;
  }
  remove(id,revision) {const p=this.load(id);if(p&&p.revision!==revision)throw new Error('The project changed in another tab. Reload before deleting it.');this.storage.removeItem(PREFIX+id);}
  recoverRaw(id) {return this.storage.getItem(PREFIX+id);}
}
