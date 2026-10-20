/**
 * A link to a private file that is signed when it is opened (/app/archivo, see its route), for buttons that may be
 * clicked long after the page loaded. `download`: save it instead of opening it.
 */
export const fileHref = (ref: string, download = false) => `/app/archivo?ref=${encodeURIComponent(ref)}${download ? "&dl=1" : ""}`;
