export const NAME_MAX = 40;

/** A visitor's name as they typed it, tidied: for reactions and comments, in the browser and on the server. */
export const cleanName = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
