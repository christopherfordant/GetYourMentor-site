// Shared form transport checks; no session, provider, logging or automatic retry.
export class FormRejection extends Error {}
export async function readFormData(response:Response):Promise<Record<string,unknown>> {
 const payload:unknown=await response.json().catch(()=>null);
 if(!response.ok){const error=payload&&typeof payload==="object"&&"error" in payload?payload.error:undefined;throw new FormRejection(typeof error==="string"&&error.length<=300?error:"Envoi refusé. Vérifiez les informations puis réessayez.");}
 if(!payload||typeof payload!=="object"||!("data" in payload)||!payload.data||typeof payload.data!=="object"||Array.isArray(payload.data))throw new Error("Unconfirmed response");
 return payload.data as Record<string,unknown>;
}
export async function readAuthFormData(response:Response,email:string,role?:string){
 const d=await readFormData(response);
 if(typeof d.email!=="string"||d.email.toLowerCase()!==email.trim().toLowerCase()||typeof d.role!=="string"||!["sportif","coach","club","admin"].includes(d.role)||(role&&d.role!==role)||[d.coachId,d.coachName].some(v=>v!==undefined&&typeof v!=="string"))throw new Error("Unconfirmed session");
 return d as {email:string;role:"sportif"|"coach"|"club"|"admin";coachId?:string;coachName?:string};
}
