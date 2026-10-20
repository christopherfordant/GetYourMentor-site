import { readFile } from "node:fs/promises";import path from "node:path";
export async function GET(){return new Response(await readFile(path.join(process.cwd(),"public/images/demo-sport.svg")),{headers:{"Content-Type":"image/svg+xml","Cache-Control":"public, max-age=3600"}});}
