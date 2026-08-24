import crypto from "node:crypto";

function b64url(input:Buffer|string){return Buffer.from(input).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}

async function accessToken(){
  const email=process.env.GA4_CLIENT_EMAIL?.trim();
  const privateKey=process.env.GA4_PRIVATE_KEY?.replace(/\\n/g,"\n").trim();
  if(!email||!privateKey) throw new Error("GA4 service-account credentials are not configured");
  const now=Math.floor(Date.now()/1000);
  const header=b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const payload=b64url(JSON.stringify({iss:email,scope:"https://www.googleapis.com/auth/analytics.readonly",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));
  const unsigned=`${header}.${payload}`;
  const signature=crypto.createSign("RSA-SHA256").update(unsigned).end().sign(privateKey);
  const assertion=`${unsigned}.${b64url(signature)}`;
  const body=new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion});
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body,cache:"no-store"});
  if(!response.ok) throw new Error(`GA4 OAuth failed: ${response.status} ${await response.text()}`);
  const json=await response.json() as {access_token?:string};
  if(!json.access_token) throw new Error("GA4 OAuth response did not include an access token");
  return json.access_token;
}

export type Ga4DailyFunnel={date:string;sessions:number;users:number;pageViews:number;addToCarts:number;checkouts:number;transactions:number};

export async function fetchGa4DailyFunnel(startDate:string,endDate:string):Promise<Ga4DailyFunnel[]>{
  const propertyId=process.env.GA4_PROPERTY_ID?.trim();
  if(!propertyId) throw new Error("GA4_PROPERTY_ID is not configured");
  const token=await accessToken();
  const response=await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`,{
    method:"POST",
    headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},
    body:JSON.stringify({dateRanges:[{startDate,endDate}],dimensions:[{name:"date"}],metrics:[{name:"sessions"},{name:"totalUsers"},{name:"screenPageViews"},{name:"addToCarts"},{name:"checkouts"},{name:"transactions"}],orderBys:[{dimension:{dimensionName:"date"}}],limit:10000}),
    cache:"no-store",
  });
  if(!response.ok) throw new Error(`GA4 Data API failed: ${response.status} ${await response.text()}`);
  const json=await response.json() as {rows?:Array<{dimensionValues?:Array<{value?:string}>,metricValues?:Array<{value?:string}>}>};
  return (json.rows??[]).map(row=>{
    const raw=row.dimensionValues?.[0]?.value??"";
    const date=raw.length===8?`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`:raw;
    const m=row.metricValues??[];
    return {date,sessions:Number(m[0]?.value??0),users:Number(m[1]?.value??0),pageViews:Number(m[2]?.value??0),addToCarts:Number(m[3]?.value??0),checkouts:Number(m[4]?.value??0),transactions:Number(m[5]?.value??0)};
  });
}

export function ga4ConfigStatus(){
  return {propertyId:!!process.env.GA4_PROPERTY_ID?.trim(),clientEmail:!!process.env.GA4_CLIENT_EMAIL?.trim(),privateKey:!!process.env.GA4_PRIVATE_KEY?.trim()};
}
