import type { Message } from "./messages";
import type { Session } from "./auth";
import { getCoach } from "./coaches";
export async function messageBelongsToCoach(message: Message, coachId?: string) {
  if (!coachId) return false;
  return message.coachId ? message.coachId === coachId : (await getCoach(message.recipientName))?.id === coachId;
}
export async function messageParticipant(message: Message, session: Session) {
  if (session.role === "coach") return messageBelongsToCoach(message, session.coachId);
  return ["sportif", "club"].includes(session.role) && message.senderEmail === session.email && (message.ownerRole ?? "sportif") === session.role;
}
