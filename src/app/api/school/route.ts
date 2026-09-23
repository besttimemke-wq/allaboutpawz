import {NextRequest,NextResponse} from "next/server";
import {getVisitor} from "@/lib/visitor";
import {getSchoolSnapshot,setMeetingStatus,setScheduleBlockStatus,listInstructorDaySnapshots} from "@/lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
  try{
    const visitor=getVisitor(request);
    return NextResponse.json({...await getSchoolSnapshot(visitor.id),breakCourseId:(await listInstructorDaySnapshots(visitor.id)).find((s:any)=>s.day.state==="BREAK_LOCKED")?.day?.courseId||null});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to load the school Day."},{status:401});
  }
}

export async function POST(request:NextRequest){
  try{
    const visitor=getVisitor(request);
    const body=await request.json() as {action?:string;id?:number;status?:string};
    if(body.action==="meeting-status"){
      await setMeetingStatus(visitor.id,Number(body.id),String(body.status||"SCHEDULED"));
    }else if(body.action==="schedule-status"){
      await setScheduleBlockStatus(visitor.id,Number(body.id),String(body.status||"UPCOMING"));
    }else{
      return NextResponse.json({error:"Unknown school action."},{status:400});
    }
    return NextResponse.json({...await getSchoolSnapshot(visitor.id),breakCourseId:(await listInstructorDaySnapshots(visitor.id)).find((s:any)=>s.day.state==="BREAK_LOCKED")?.day?.courseId||null});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"School action failed."},{status:500});
  }
}
