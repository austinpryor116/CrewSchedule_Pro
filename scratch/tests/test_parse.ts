import { parseHI1Schedule } from "./src/lib/parser";
import { RAW_HI1_AUG_TEXT } from "./src/lib/demoData";

const seqs = parseHI1Schedule(RAW_HI1_AUG_TEXT);
console.log(JSON.stringify(seqs, null, 2));
