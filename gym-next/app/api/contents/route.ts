import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { ContentError, demoContentsEnabled, listDemoContents, modifyDemoContent } from "@/lib/demo-contents";
import { rateLimit } from "@/lib/request-guards";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
async function handle(request:Request,write:boolean){
 const session=await currentSession();if(!session)return NextResponse.json({error:"Connexion requise"},{status:401,headers});
 if(!demoContentsEnabled())return NextResponse.json({error:"Catalogue indisponible hors démo isolée"},{status:503,headers});
 try{
  if(write){
   const origin=request.headers.get("origin");if(origin && origin!==new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin)throw new ContentError("Origine refusée",403);
   if(!rateLimit(request,`contents-${session.role}-${session.email}`,40,60000).allowed)throw new ContentError("Trop de demandes",429);
   const reader=request.body?.getReader();if(!reader)throw new ContentError("Requête invalide");
   const chunks:Uint8Array[]=[];let bytes=0;while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>20000){await reader.cancel();throw new ContentError("Requête trop volumineuse",413);}chunks.push(value);}
   let input:unknown;try{input=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new ContentError("JSON invalide");}
   if(!input || typeof input!=="object" || Array.isArray(input))throw new ContentError("Requête invalide");
   await modifyDemoContent(session,input as Record<string,unknown>);
  }
  return NextResponse.json({data:await listDemoContents(session)},{headers});
 }catch(error){return NextResponse.json({error:error instanceof ContentError?error.message:"Catalogue indisponible. Réessayez."},{status:error instanceof ContentError?error.status:503,headers});}
}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
