import type { StructureOffer } from "@/lib/structure-offers";
export type Summary = { id: string; coachName: string; service: string; slots: string[]; status: string; price: number; participantCount?: number; reservationCode?: string };
type Coach = { id: string; name: string };
export type PlanningData = { offers: Omit<StructureOffer, "ownerEmail">[]; reservations: Summary[]; coaches: Coach[] };
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const slots = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(text);
const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
export function isPlanningOffer(value: unknown): value is PlanningData["offers"][number] {
 return object(value) && [value.id,value.coachId,value.title,value.duration,value.createdAt].every(text) && slots(value.slots) && (value.capacity === undefined || count(value.capacity)) && (value.location === undefined || text(value.location));
}
function array<T>(payload: unknown, valid: (row: unknown) => row is T): T[] {
 if (!object(payload) || !Array.isArray(payload.data) || !payload.data.every(valid)) throw new Error("Réponse du planning invalide");
 return payload.data;
}
export function parsePlanningData(offers: unknown, reservations?: unknown, affiliations?: unknown): PlanningData {
 const result: PlanningData = {offers: array(offers,isPlanningOffer), reservations:[], coaches:[]};
 if (reservations !== undefined) result.reservations = array(reservations,(v): v is Summary => object(v) && [v.id,v.coachName,v.service].every(text) && slots(v.slots) && ["requested","accepted","paid","cancelled","rejected"].includes(String(v.status)) && typeof v.price === "number" && Number.isFinite(v.price) && v.price >= 0 && (v.participantCount === undefined || count(v.participantCount)) && (v.reservationCode === undefined || text(v.reservationCode)));
 if (affiliations !== undefined) {
  const rows = array(affiliations,(v): v is {coachId:string;coachName:string;status:string;structureConsent:boolean;coachConsent:boolean} => object(v) && [v.coachId,v.coachName].every(text) && ["pending","accepted","rejected"].includes(String(v.status)) && typeof v.structureConsent === "boolean" && typeof v.coachConsent === "boolean");
  result.coaches = [...new Map(rows.filter(v=>v.status==="accepted" && v.structureConsent && v.coachConsent).map(v=>[v.coachId,{id:v.coachId,name:v.coachName}])).values()];
 }
 return result;
}
