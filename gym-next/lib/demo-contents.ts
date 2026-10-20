import { randomUUID } from "node:crypto";
import type { Session } from "@/lib/auth";
import { getCoach } from "@/lib/coaches";
import { mutateDemoState, readDemoState } from "@/lib/repositories/demo-state";
import { isHostedDemo, isIsolatedDemoFeatureEnabled } from "@/lib/runtime";

export const demoContentsEnabled = isIsolatedDemoFeatureEnabled;
export type DemoContent = { id: string; owner: string; author: string; title: string; summary: string; body: string; priceCents: number; version: number; published: boolean; createdAt: string; requestId: string; downloads: number };
export type DemoContentPurchase = { id: string; buyer: string; contentId: string; title: string; priceCents: number; commissionCents: number; sellerCents: number; commissionBps: 2000; purchasedAt: string; contentVersion: number };
type Store = { contents: DemoContent[]; contentPurchases: DemoContentPurchase[] };
const local: Store = { contents: [], contentPurchases: [] };
const ownerKey = (session: Session) => `${session.role}:${session.email.toLowerCase()}`;
export class ContentError extends Error { constructor(message: string, public status = 400) { super(message); } }
function guard() { if (!demoContentsEnabled()) throw new ContentError("Contenus disponibles en démonstration isolée uniquement",503); }
async function read(): Promise<Store> { if (!isHostedDemo()) return local; const state=await readDemoState(); return {contents:state.contents ?? [],contentPurchases:state.contentPurchases ?? []}; }
async function change<T>(action: (state:Store)=>T):Promise<T> { return isHostedDemo() ? mutateDemoState(state=>action({contents:state.contents ??= [],contentPurchases:state.contentPurchases ??= []})) : action(local); }
function card(row:DemoContent) { return {id:row.id,author:row.author,title:row.title,summary:row.summary,priceCents:row.priceCents,version:row.version,published:row.published}; }
function text(value:unknown,label:string,max:number) { if (typeof value!=="string" || value.trim().length<3 || value.length>max || /[\u0000-\u0008\u000b-\u001f]/.test(value)) throw new ContentError(`${label} invalide`); return value.trim(); }
function identifier(value:unknown) { if(typeof value!=="string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value)) throw new ContentError("Identifiant invalide"); return value; }
export async function listDemoContents(session:Session) {
 guard(); const state=await read(), key=ownerKey(session);
 const purchases=state.contentPurchases.filter(row=>row.buyer===key);
 return { role:session.role, catalogue:state.contents.filter(row=>row.published).map(card),
 owned:state.contents.filter(row=>row.owner===key).map(row=>({...card(row),downloads:row.downloads,sales:state.contentPurchases.filter(p=>p.contentId===row.id).length,revenueCents:state.contentPurchases.filter(p=>p.contentId===row.id).reduce((sum,p)=>sum+p.sellerCents,0)})),
 library:purchases.map(({buyer:_,...row})=>row), simulated:true };
}
export async function modifyDemoContent(session:Session,input:Record<string,unknown>) {
 guard(); const key=ownerKey(session);
 if(input.action==="create") {
   if(session.role!=="coach" || !session.coachId) throw new ContentError("Création réservée aux coachs",403);
   const coach=await getCoach(session.coachId); if(!coach) throw new ContentError("Profil coach introuvable",403);
   const requestId=identifier(input.requestId), title=text(input.title,"Titre",120), summary=text(input.summary,"Présentation",600), body=text(input.body,"Texte",12000);
   if(input.demoAcknowledged!==true) throw new ContentError("Confirme le caractère fictif de cette ressource");
   if(!Number.isSafeInteger(input.priceCents) || (input.priceCents as number)<1 || (input.priceCents as number)>1000000) throw new ContentError("Prix fictif invalide");
   return change(state=>{
     const repeated=state.contents.find(row=>row.owner===key && row.requestId===requestId);
     if(repeated) { if(repeated.title!==title || repeated.summary!==summary || repeated.body!==body || repeated.priceCents!==input.priceCents) throw new ContentError("Identifiant réutilisé avec un autre contenu",409); return card(repeated); }
     if(state.contents.filter(row=>row.owner===key).length>=50) throw new ContentError("Limite de 50 ressources de démonstration atteinte",409);
     const row:DemoContent={id:randomUUID(),owner:key,author:coach.name,title,summary,body,priceCents:input.priceCents as number,version:1,published:false,createdAt:new Date().toISOString(),requestId,downloads:0};state.contents.push(row); return card(row);
   });
 }
 const id=identifier(input.id);
 if(input.action==="delete") {
   if(session.role!=="coach") throw new ContentError("Suppression réservée à l’auteur",403);
   return change(state=>{
     const index=state.contents.findIndex(row=>row.id===id && row.owner===key);if(index<0)throw new ContentError("Ressource introuvable",404);
     const row=state.contents[index];
     if(input.expectedVersion!==row.version)throw new ContentError("La ressource a changé. Actualise avant de réessayer.",409);
     if(row.published || state.contentPurchases.some(p=>p.contentId===id))throw new ContentError("Retire la ressource du catalogue ; les contenus déjà acquis doivent être conservés.",409);
     state.contents.splice(index,1);return {deleted:true};
   });
 }
 if(input.action==="publish" || input.action==="withdraw") {
   if(session.role!=="coach") throw new ContentError("Action réservée à l’auteur",403);
   const published=input.action==="publish";
   if(published && (!session.coachId || !(await getCoach(session.coachId))?.verified)) throw new ContentError("Un profil coach validé est nécessaire pour publier dans la démo",403);
   return change(state=>{const row=state.contents.find(r=>r.id===id && r.owner===key);if(!row) throw new ContentError("Ressource introuvable",404);
     if(!Number.isSafeInteger(input.expectedVersion) || row.version!==input.expectedVersion) throw new ContentError("La ressource a changé. Actualise avant de réessayer.",409);
     if(row.published!==published) {row.published=published;row.version++;}return card(row);
   });
 }
 if(input.action==="purchase") {
   if(session.role!=="sportif") throw new ContentError("Achat simulé réservé aux sportifs",403);
   if(input.demoAcknowledged!==true) throw new ContentError("Confirme l’achat fictif, sans paiement");
   return change(state=>{
     const existing=state.contentPurchases.find(r=>r.buyer===key && r.contentId===id);if(existing){const {buyer:_,...receipt}=existing;return receipt;}
     const row=state.contents.find(r=>r.id===id && r.published);if(!row) throw new ContentError("Ressource indisponible",404);
     if(input.expectedVersion!==row.version || input.expectedPriceCents!==row.priceCents) throw new ContentError("La ressource a changé. Actualise avant de simuler l’achat.",409);
     const commissionCents=Math.round(row.priceCents*2000/10000);
     const receipt:DemoContentPurchase={id:randomUUID(),buyer:key,contentId:id,title:row.title,priceCents:row.priceCents,commissionCents,sellerCents:row.priceCents-commissionCents,commissionBps:2000,purchasedAt:new Date().toISOString(),contentVersion:row.version};state.contentPurchases.push(receipt);const {buyer:_,...result}=receipt;return result;
   });
 }
 throw new ContentError("Action invalide");
}
export async function accessDemoContent(session:Session,id:string,download=false) {
 guard(); identifier(id); const key=ownerKey(session);
 const access=(state:Store)=>{const row=state.contents.find(r=>r.id===id);if(!row || (row.owner!==key && !state.contentPurchases.some(p=>p.buyer===key && p.contentId===id))) throw new ContentError("Ressource introuvable ou accès non autorisé",404);
   if(download && row.owner!==key) row.downloads++; return {title:row.title,body:row.body,simulated:true};};
 return download ? change(access) : access(await read());
}
