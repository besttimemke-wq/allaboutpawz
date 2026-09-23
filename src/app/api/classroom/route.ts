import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import {
  commandLearningDay,
  getLearningDaySnapshot,
  listInstructorDaySnapshots,
  resolveHumanNeed,
} from "@/lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
  try{
    const visitor=getVisitor(request);
    return NextResponse.json({classrooms:await listInstructorDaySnapshots(visitor.id)});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to load Classroom."},{status:401});
  }
}

export async function POST(request:NextRequest){
  try{
    const visitor=getVisitor(request);
    const body=await request.json() as {command?:string;courseId?:number;dayId?:number;queueId?:number;resolution?:string};
    const courseId=Number(body.courseId),dayId=Number(body.dayId);
    if(!Number.isInteger(courseId)||!Number.isInteger(dayId)){
      return NextResponse.json({error:"A Day and course are required."},{status:400});
    }
    const snapshot=await getLearningDaySnapshot(visitor.id,courseId);
    if(!snapshot?.day||snapshot.day.id!==dayId){
      return NextResponse.json({error:"Learning Day not found."},{status:404});
    }
    if(body.command==="CHECK_IN"){
      await commandLearningDay(visitor.id,dayId,{
        state:"HUMAN_HANDOFF",
        eventType:"COHOST_CHECKED_IN",
        payload:{cohost:"Jamie Carter",queueId:body.queueId||null},
      });
    }else if(body.command==="RESOLVE_AND_CHECK_OUT"){
      if(Number.isInteger(Number(body.queueId))){
        await resolveHumanNeed(visitor.id,Number(body.queueId),String(body.resolution||"Live mentoring completed."));
      }
      await commandLearningDay(visitor.id,dayId,{
        state:"AWAITING_ATTEMPT",
        eventType:"COHOST_CHECKED_OUT",
        payload:{cohost:"Jamie Carter",resolution:String(body.resolution||"Live mentoring completed.")},
      });
    }else{
      return NextResponse.json({error:"Unknown Classroom command."},{status:400});
    }
    return NextResponse.json({classrooms:await listInstructorDaySnapshots(visitor.id)});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Classroom action failed."},{status:500});
  }
}
