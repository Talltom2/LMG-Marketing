import Link from "next/link";

const links=[
  ["/","Dashboard"],
  ["/campaigns","Campaigns"],
  ["/campaigns/calendar","Calendar"],
  ["/campaigns/execution","Execution"],
  ["/campaigns/metrics","Metrics"],
  ["/campaigns/diagnostics","Diagnostics"],
  ["/campaigns/alerts","Alerts"],
  ["/campaigns/production","Creative"],
  ["/campaigns/closeout","Learning"],
  ["/promotional-assets","Opportunities"],
] as const;

export default function LmgTopNav({active}:{active?:string}){
  return <nav aria-label="LMG Marketing" style={{maxWidth:1540,margin:"0 auto",padding:"12px 20px",display:"flex",alignItems:"center",gap:8,overflowX:"auto",whiteSpace:"nowrap",WebkitOverflowScrolling:"touch",scrollbarWidth:"thin"}}>
    <Link href="/" style={{fontWeight:900,fontSize:15,textDecoration:"none",color:"#17351d",paddingRight:8,flex:"0 0 auto"}}>LMG Marketing</Link>
    {links.map(([href,label])=>{
      const selected=href==="/"?active==="/":active===href||Boolean(active?.startsWith(`${href}/`));
      return <Link key={href} href={href} style={{flex:"0 0 auto",display:"inline-block",padding:"7px 9px",borderRadius:8,textDecoration:"none",fontSize:13,fontWeight:800,lineHeight:1,border:selected?"1px solid #18351e":"1px solid transparent",background:selected?"#18351e":"transparent",color:selected?"#fff":"#35583a"}}>{label}</Link>
    })}
  </nav>;
}
