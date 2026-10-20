export const nextRoutes = {
  home: "/",
  search: "/recherche",
  directory: "/coachs",
  coach: "/coach",
  slot: "/creneau",
  recap: "/recapitulatif",
  account: "/compte",
  payment: "/paiement",
  clubSignup: "/inscription-club",
} as const;

export const buildNextPath = (
  page: string,
  paramsObject: Record<string, string | undefined>,
) => {
  const search = new URLSearchParams();

  Object.entries(paramsObject).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `${page}?${query}` : page;
};
