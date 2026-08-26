import {NextRequest,NextResponse} from "next/server";

export const dynamic="force-dynamic";

export async function POST(request:NextRequest){
 try{
  const key=process.env.OPENAI_API_KEY;
  if(!key)return NextResponse.json({error:"OPENAI_API_KEY is not configured in the production environment."},{status:503});
  const body=await request.json() as {prompt?:string;sourceImageUrl?:string;orientation?:"portrait"|"landscape"};
  const prompt=String(body.prompt??"").trim();
  const sourceImageUrl=String(body.sourceImageUrl??"").trim();
  const orientation=body.orientation==="portrait"?"portrait":"landscape";
  if(!prompt)return NextResponse.json({error:"Image prompt is required."},{status:400});
  const content:any[]=[{type:"input_text",text:`${prompt}\n\nRequired composition: ${orientation}. Compose specifically for a ${orientation} marketing image and keep the principal product comfortably inside the crop-safe area.`}];
  if(sourceImageUrl)content.push({type:"input_image",image_url:sourceImageUrl});
  const size=orientation==="portrait"?"1024x1536":"1536x1024";
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-terra",input:[{role:"user",content}],tools:[{type:"image_generation",model:"gpt-image-2",action:sourceImageUrl?"edit":"generate",input_fidelity:"high",size,quality:"high",output_format:"jpeg"}]})});
  const data:any=await r.json();
  if(!r.ok)return NextResponse.json({error:data?.error?.message??"Image generation failed."},{status:r.status});
  const item=(data.output??[]).find((x:any)=>x.type==="image_generation_call"||x.type==="image_generation");
  const b64=item?.result??item?.b64_json??item?.image_base64;
  if(!b64)return NextResponse.json({error:"Image generation completed without an image payload."},{status:502});
  return NextResponse.json({imageUrl:`data:image/jpeg;base64,${b64}`,orientation,size});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to generate campaign image"},{status:500});}
}
