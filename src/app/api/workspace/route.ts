import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import {
  listWorkspaceNotes, saveWorkspaceNote, deleteWorkspaceNote,
  listWorkspaceEvents, saveWorkspaceEvent, deleteWorkspaceEvent,
  listWorkspaceFiles, saveWorkspaceFile, deleteWorkspaceFile,
  listAssignmentStates, saveAssignmentState,
  listWorkspaceMessages, saveWorkspaceMessage, listLearningEvidence, saveLearningEvidence, workspaceSummary,
} from "@/lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";

async function snapshot(ownerId:string){
  return {
    notes:await listWorkspaceNotes(ownerId), events:await listWorkspaceEvents(ownerId),
    files:await listWorkspaceFiles(ownerId), assignments:await listAssignmentStates(ownerId),
    messages:await listWorkspaceMessages(ownerId), evidence:await listLearningEvidence(ownerId), summary:await workspaceSummary(ownerId),
  };
}
export async function GET(request:NextRequest){
  try { const v=getVisitor(request); return NextResponse.json(await snapshot(v.id)); }
  catch(e){ return NextResponse.json({error:e instanceof Error?e.message:"Unauthorized"},{status:401}); }
}
export async function POST(request:NextRequest){
  try{
    const v=getVisitor(request);
    const type=request.headers.get("content-type")||"";
    if(type.includes("multipart/form-data")){
      const form=await request.formData(); const file=form.get("file");
      if(!(file instanceof File)) return NextResponse.json({error:"Choose a file."},{status:400});
      if(file.size>10_000_000) return NextResponse.json({error:"Files must be under 10 MB."},{status:400});
      await saveWorkspaceFile(v.id,{courseId:Number(form.get("courseId"))||null,name:file.name,mime:file.type||"application/octet-stream",data:new Uint8Array(await file.arrayBuffer())});
      return NextResponse.json(await snapshot(v.id));
    }
    const body=await request.json() as any;
    if(body.action==="save-note") await saveWorkspaceNote(v.id,body);
    else if(body.action==="delete-note") await deleteWorkspaceNote(v.id,Number(body.id));
    else if(body.action==="save-event") await saveWorkspaceEvent(v.id,body);
    else if(body.action==="delete-event") await deleteWorkspaceEvent(v.id,Number(body.id));
    else if(body.action==="delete-file") await deleteWorkspaceFile(v.id,Number(body.id));
    else if(body.action==="assignment") await saveAssignmentState(v.id,body);
    else if(body.action==="message") await saveWorkspaceMessage(v.id,{sender:v.name,recipient:body.recipient||"Instructor",content:String(body.content||"").slice(0,4000)});
    else if(body.action==="evidence") await saveLearningEvidence(v.id,{courseId:Number(body.courseId),kind:String(body.kind||"Professor exchange"),title:String(body.title||"Learning evidence").slice(0,200),content:String(body.content||"").slice(0,12000)});
    else return NextResponse.json({error:"Unknown workspace action."},{status:400});
    return NextResponse.json(await snapshot(v.id));
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Workspace action failed."},{status:500});}
}
