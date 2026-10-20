import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { readPersonalProgress,savePersonalGoal,ProgressError } from "@/lib/personal-progress";
import { rateLimit } from "@/lib/request-guards";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
async function handle(request:Request,write:boolean){const session=await currentSession();if(!session)return NextResponse.json({error:"Connexion requise"},{status:401,headers});
 try{if(write){
  // Authorize before reading or changing any account data.
  if(session.role!=="sportif")throw new ProgressError("Suivi personnel réservé au profil sportif",403);
  const origin=request.headers.get("origin");if(origin && origin!==new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin)throw new ProgressError("Origine refusée",403);
  if(!rateLimit(request,`progress-${session.role}-${session.email}`,30,60000).allowed)throw new ProgressError("Trop de demandes",429);
  const reader=request.body?.getReader();if(!reader)throw new ProgressError("Requête invalide");const chunks:Uint8Array[]=[];let bytes=0;
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>4096){await reader.cancel();throw new ProgressError("Requête trop volumineuse",413);}chunks.push(value);}
  let input:unknown;try{input=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new ProgressError("JSON invalide");}if(!input || typeof input!=="object" || Array.isArray(input))throw new ProgressError("Requête invalide");
  await savePersonalGoal(session,input as Record<string,unknown>);
 }return NextResponse.json({data:await readPersonalProgress(session)},{headers});
 }catch(error){return NextResponse.json({error:error instanceof ProgressError?error.message:"Suivi indisponible. Réessayez."},{status:error instanceof ProgressError?error.status:503,headers});}}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
