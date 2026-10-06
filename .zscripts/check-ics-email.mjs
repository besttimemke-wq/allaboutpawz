import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: key, Authorization: `Bearer ${key}` }
const rows = await (await fetch(`${url}/rest/v1/email_messages?select=id,toEmail,template,subject,status,providerMessageId,sentAt&order=createdAt.desc&limit=5`, { headers: H })).json()
for (const r of rows) console.log(`${r.template} | ${r.status} | ${r.toEmail} | ${r.providerMessageId || "-"} | ${r.sentAt || "-"}`)
