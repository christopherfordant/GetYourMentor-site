import { isMessageAttachment } from "@/lib/message-attachment-contract";
import type {Message} from "@/lib/messages";
export type MessageOrder="newest"|"oldest";
export function isDisplayMessage(value:unknown):value is Message {
 if(!value||typeof value!=="object")return false;const m=value as Partial<Message>;
 return [m.id,m.senderEmail,m.recipientName,m.body,m.createdAt].every(v=>typeof v==="string") && !!m.id && (m.attachment===undefined||isMessageAttachment(m.attachment)) && (m.coachId===undefined||typeof m.coachId==="string") && (m.ownerRole===undefined||["sportif","club"].includes(m.ownerRole)) && (m.authorRole===undefined||["sportif","coach","club"].includes(m.authorRole));
}
export function messageCorrespondent(message:Message,coachView:boolean){
 return coachView?JSON.stringify([message.ownerRole??"sportif",message.senderEmail]):JSON.stringify([message.coachId??null,message.recipientName]);
}
export function messageContacts(messages:readonly Message[],coachView:boolean){
 const seen=new Map<string,string>();
 for(const m of messages){const key=messageCorrespondent(m,coachView),label=coachView?`${m.senderEmail}${m.ownerRole==="club"?" · structure":" · sportif"}`:m.recipientName;if(!seen.has(key))seen.set(key,label);}
 const result=[...seen].map(([value,label])=>({value,label}));const counts=new Map<string,number>();for(const c of result)counts.set(c.label,(counts.get(c.label)??0)+1);
 return result.map(c=>({...c,label:(counts.get(c.label)??0)>1?`${c.label} · ${JSON.parse(c.value)[0]??"historique sans identifiant"}`:c.label})).sort((a,b)=>a.label.localeCompare(b.label,"fr")||a.value.localeCompare(b.value));
}
export function selectMessages(messages:readonly Message[],coachView:boolean,correspondent:string,query:string,order:MessageOrder){
 const q=query.trim().toLocaleLowerCase("fr");
 return messages.map((message,index)=>({message,index})).filter(({message:m})=>(!correspondent||messageCorrespondent(m,coachView)===correspondent)&&(!q||`${m.body} ${m.recipientName} ${m.senderEmail}`.toLocaleLowerCase("fr").includes(q))).sort((a,b)=>{const x=Date.parse(a.message.createdAt),y=Date.parse(b.message.createdAt),validX=Number.isFinite(x),validY=Number.isFinite(y);if(!validX||!validY)return validX?-1:validY?1:a.index-b.index;return (order==="newest"?y-x:x-y)||a.index-b.index;}).map(row=>row.message);
}
