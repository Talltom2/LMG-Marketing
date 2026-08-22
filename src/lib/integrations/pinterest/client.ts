const baseUrl="https://api.pinterest.com/v5";

export function pinterestConfigured(){return Boolean(process.env.PINTEREST_ACCESS_TOKEN);}

export async function pinterestRequest<T>(path:string,params:Record<string,string|number|boolean|undefined>={}):Promise<T>{
 const token=process.env.PINTEREST_ACCESS_TOKEN;
 if(!token)throw new Error("Pinterest API access token is not configured.");
 const url=new URL(`${baseUrl}${path}`);
 for(const[k,v]of Object.entries(params))if(v!==undefined)url.searchParams.set(k,String(v));
 const r=await fetch(url,{headers:{Accept:"application/json",Authorization:`Bearer ${token}`},cache:"no-store"});
 if(!r.ok){const body=await r.text();throw new Error(`Pinterest API request failed (${r.status}): ${body.slice(0,400)}`);}
 return r.json() as Promise<T>;
}
