import {NextRequest,NextResponse} from "next/server";

const PUBLIC_PATHS=["/login","/api/auth/login","/api/wordpress/diagnostics","/favicon.ico"];
async function sha256(value:string){const data=new TextEncoder().encode(value);const digest=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");}
export async function middleware(req:NextRequest){
 const {pathname}=req.nextUrl;
 if(PUBLIC_PATHS.some(p=>pathname===p)||pathname.startsWith("/_next/")||pathname.startsWith("/api/auth/"))return NextResponse.next();
 const password=process.env.LMG_APP_PASSWORD,secret=process.env.LMG_AUTH_SECRET;
 if(!password||!secret){return new NextResponse("LMG Marketing authentication is not configured. Set LMG_APP_PASSWORD and LMG_AUTH_SECRET.",{status:503});}
 const expected=await sha256(`${password}:${secret}`);const token=req.cookies.get("lmg_auth")?.value;
 if(token===expected)return NextResponse.next();
 if(pathname.startsWith("/api/"))return NextResponse.json({error:"Authentication required"},{status:401});
 const url=req.nextUrl.clone();url.pathname="/login";url.searchParams.set("next",pathname);return NextResponse.redirect(url);
}
export const config={matcher:["/((?!_next/static|_next/image).*)"]};