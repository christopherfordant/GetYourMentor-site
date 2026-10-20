import type { Session } from "@/lib/auth";
import { isHostedDemo, isIsolatedDemoFeatureEnabled } from "@/lib/runtime";
import { mutateDemoState, readDemoState } from "@/lib/repositories/demo-state";
import { listReservations } from "@/lib/reservations";
import { personalSessionSummary } from "@/lib/domain/progress-summary";
export type PersonalGoal={owner:string;title:string|null;targetSessions:number|null;version:number;updatedAt:string;requestId:string;signature:string};
const local:PersonalGoal[]=[];
export class ProgressError extends Error{constructor(message:string,public status=400){super(message);}}
function guard(session:Session){if(!isIsolatedDemoFeatureEnabled())throw new ProgressError("Suivi disponible en démonstration isolée uniquement",503);if(session.role!=="sportif")throw new ProgressError("Suivi personnel réservé au profil sportif",403);}
const key=(session:Session)=>`sportif:${session.email.toLowerCase()}`;
function publicGoal(row?:PersonalGoal){return {title:row?.title ?? null,targetSessions:row?.targetSessions ?? null,version:row?.version ?? 0,updatedAt:row?.updatedAt ?? null};}
export async function readPersonalProgress(session:Session){
 guard(session);const [goals,reservations]=await Promise.all([isHostedDemo()?readDemoState().then(state=>state.personalGoals ?? []):Promise.resolve(local),listReservations({ownerEmail:session.email})]);
 return {goal:publicGoal(goals.find(row=>row.owner===key(session))),summary:personalSessionSummary(reservations.filter(row=>row.ownerEmail===session.email)),simulated:true,attendanceVerified:false};
}
export async function savePersonalGoal(session:Session,input:Record<string,unknown>){
 guard(session);if(input.action!=="save" && input.action!=="clear")throw new ProgressError("Action invalide");
 if(!Number.isSafeInteger(input.expectedVersion)||(input.expectedVersion as number)<0)throw new ProgressError("Version invalide");
 if(typeof input.requestId!=="string" || !/^[a-zA-Z0-9-]{1,80}$/.test(input.requestId))throw new ProgressError("Identifiant invalide");
 if(input.action==="save" && (input.demoAcknowledged!==true || typeof input.title!=="string" || input.title.trim().length<3 || input.title.length>120 || /[\u0000-\u001f]/.test(input.title) || !Number.isSafeInteger(input.targetSessions) || (input.targetSessions as number)<1 || (input.targetSessions as number)>1000))throw new ProgressError("Confirme un objectif fictif de 3 à 120 caractères et un total de 1 à 1 000 séances");
 const title=input.action==="save"?(input.title as string).trim():null,targetSessions=input.action==="save"?input.targetSessions as number:null,signature=JSON.stringify({action:input.action,title,targetSessions});
 const change=(goals:PersonalGoal[])=>{const index=goals.findIndex(row=>row.owner===key(session)),current=goals[index];
  if(current?.requestId===input.requestId){if(current.signature!==signature)throw new ProgressError("Identifiant réutilisé avec une autre demande",409);return publicGoal(current);}
  if((current?.version ?? 0)!==input.expectedVersion)throw new ProgressError("L’objectif a changé. Actualise avant de réessayer.",409);
  const row:PersonalGoal={owner:key(session),title,targetSessions,version:(current?.version ?? 0)+1,updatedAt:new Date().toISOString(),requestId:input.requestId as string,signature};
  if(index<0)goals.push(row);else goals[index]=row;return publicGoal(row);
 };
 return isHostedDemo()?mutateDemoState(state=>change(state.personalGoals ??= [])):change(local);
}
