export async function generateCampaignImage(prompt:string,sourceImageUrl?:string){
 const key=process.env.OPENAI_API_KEY;if(!key)throw new Error("OPENAI_API_KEY is not configured in production.");
 const content:any[]=[{type:"input_text",text:prompt}];if(sourceImageUrl)content.push({type:"input_image",image_url:sourceImageUrl});
 const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-terra",input:[{role:"user",content}],tools:[{type:"image_generation",model:"gpt-image-2",action:sourceImageUrl?"edit":"generate",input_fidelity:"high",size:"1536x1024",quality:"high",output_format:"jpeg"}]})});
 const data:any=await r.json();if(!r.ok)throw new Error(data?.error?.message??"Campaign image generation failed.");
 const item=(data.output??[]).find((x:any)=>x.type==="image_generation_call"||x.type==="image_generation");const b64=item?.result??item?.b64_json??item?.image_base64;if(!b64)throw new Error("Campaign image generation returned no image payload.");
 const buf=Buffer.from(b64,"base64");return{buffer:buf,dataUrl:`data:image/jpeg;base64,${b64}`};
}
