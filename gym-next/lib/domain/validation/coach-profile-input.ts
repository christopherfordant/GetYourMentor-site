function isFiniteNumber(value: unknown) {
  return value !== "" && Number.isFinite(Number(value));
}

function tooLong(value: unknown, max: number) {
  return typeof value === "string" && value.length > max;
}

export function validateCoachProfileInput(body: unknown) {
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const textFields = ["specialty", "city", "description", "disciplines", "diplomas", "sessionTypes", "availability", "photoUrl"];
  if (textFields.some((field) => tooLong(input[field], 5000))) return "Profil trop long";
  if (input.priceFrom !== undefined && (!isFiniteNumber(input.priceFrom) || Number(input.priceFrom) < 0 || Number(input.priceFrom) > 10000)) return "Tarif invalide";

  for (const [name, min, max] of [["latitude", -90, 90], ["longitude", -180, 180]] as const) {
    if (input[name] !== undefined && input[name] !== null && (!isFiniteNumber(input[name]) || Number(input[name]) < min || Number(input[name]) > max)) {
      return "Coordonnées de localisation invalides";
    }
  }
  if (input.serviceRadiusKm !== undefined && (!isFiniteNumber(input.serviceRadiusKm) || ![1, 5, 10].includes(Number(input.serviceRadiusKm)))) return "Rayon d’intervention invalide";
  if (input.gender !== undefined && !["homme", "femme"].includes(String(input.gender))) return "Genre invalide";
  if (input.practice !== undefined && !["interieur", "exterieur"].includes(String(input.practice))) return "Lieu de pratique invalide";
  if (input.level !== undefined && !["debutant", "intermediaire", "confirme"].includes(String(input.level))) return "Niveau invalide";
  if (input.format !== undefined && !["presentiel", "visio"].includes(String(input.format))) return "Format invalide";
  if (input.availabilityTags !== undefined && (!Array.isArray(input.availabilityTags) || input.availabilityTags.some((value) => !["morning", "afternoon"].includes(String(value))))) return "Disponibilité invalide";
  return null;
}
