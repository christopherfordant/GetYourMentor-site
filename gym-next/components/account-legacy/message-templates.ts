// Draft suggestions only: no inferred booking, health advice or automatic sending.
export const coachMessageTemplates = [
 {id:"welcome",label:"Accueil et objectifs",body:"Bonjour, merci pour votre message. Précisez votre objectif et vos disponibilités pour préparer notre échange."},
 {id:"preparation",label:"Préparer la séance",body:"Bonjour, pour préparer la séance, vous pouvez me poser vos questions sur le lieu de rendez-vous, la tenue ou le matériel. Nous préciserons ensemble les informations pratiques dans cet échange."},
 {id:"availability",label:"Disponibilités",body:"Bonjour, quelles disponibilités souhaitez-vous proposer ? Le créneau retenu doit être confirmé dans votre réservation sur GetYourMentor. Cet échange ne modifie pas votre réservation."},
] as const;
