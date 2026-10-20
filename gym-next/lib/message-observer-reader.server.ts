// Private read seam only: no default provider, route, CLI or write capability.
import { observationResult, prepareObservationExpectation, observeMessageRecord, type MessageObservation } from "./message-observer.server";
export type ObservationSelector = Readonly<{messageId:string;requestId:string;runId:string;senderEmail:string;coachId:string;ownerRole:"sportif"|"club"}>;
export type TargetMessageReader = (selector: ObservationSelector) => Promise<unknown>;
export async function observeSelectedMessage(authorization: unknown, expected: unknown, readTarget: TargetMessageReader): Promise<MessageObservation> {
 const e = prepareObservationExpectation(expected);
 if (authorization !== true || !e || typeof readTarget !== "function") return observationResult("REFUSED");
 const selector = Object.freeze({messageId:e.messageId,requestId:e.requestId,runId:e.runId,senderEmail:e.senderEmail,coachId:e.coachId,ownerRole:e.ownerRole});
 try { return observeMessageRecord(await readTarget(selector),e); }
 catch { return observationResult("READ_FAILED"); }
}
