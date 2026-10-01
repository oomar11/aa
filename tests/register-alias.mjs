// يسجّل resolver يفهم "@/..." ويكمّل امتداد .ts عشان node --test يشغّل الكود مباشرة.
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
