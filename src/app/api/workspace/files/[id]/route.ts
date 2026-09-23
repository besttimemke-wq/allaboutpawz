import { NextRequest } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { getWorkspaceFile } from "@/lib/db";
export const runtime="nodejs";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const v=getVisitor(request); const {id}=await params; const f=await getWorkspaceFile(v.id,Number(id));
 if(!f)return new Response("Not found",{status:404});
 return new Response(f.data as BodyInit,{headers:{"Content-Type":f.mime,"Content-Disposition":`attachment; filename="${f.name.replace(/"/g,"")}"`}});
}
