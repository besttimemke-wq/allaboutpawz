import "dotenv/config";
import { retrieve, buildContext, pathwayCodeFromCourse } from "../src/lib/rag";

const code = pathwayCodeFromCourse({ code: "ACA", area: "Animal Care Assistant", statute: "" });
console.log("1. pathwayCodeFromCourse({code:'ACA'}) =", code);

const chunks = await retrieve("demo-avery", "How do I safely restrain a puppy for bathing?", "ACA", 3);
console.log(`\n2. retrieve('puppy safety', ACA, 3) = ${chunks.length} chunks:`);
for (const c of chunks) {
  console.log(`   [${c.pathwayCode}/${c.moduleCode}] safety=${c.safetyFlag} ${c.text.slice(0, 80)}...`);
}

const ctx = await buildContext("demo-avery", "What is the sanitation cycle between dogs?", "ACA");
console.log(`\n3. buildContext('sanitation', ACA) = ${ctx.length} chars`);
if (ctx.length > 0) console.log(ctx.slice(0, 300) + "...");
