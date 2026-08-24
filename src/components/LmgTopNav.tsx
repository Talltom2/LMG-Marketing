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

export default function LmgTopNav({active,global=false}:{active?:string;global?:boolean}){
  return <nav aria-label="LMG Marketing" data-lmg-global={global?"true":"false"} className="lmg-topnav" style={{maxWidth:1540,margin:"0 auto 22px",padding:"10px 14px",display:"flex",alignItems:"center",gap:14,overflowX:"auto",whiteSpace:"nowrap",WebkitOverflowScrolling:"touch",scrollbarWidth:"thin",borderRadius:18,background:"#050505",boxShadow:"0 10px 28px rgba(0,0,0,.22)"}}>
    <Link href="/" className="lmg-brand" style={{fontWeight:900,fontSize:15,textDecoration:"none",color:"#fff",padding:"10px 10px 10px 6px",flex:"0 0 auto"}}>LMG Marketing</Link>
    <div className="lmg-navlinks" style={{display:"flex",alignItems:"center",gap:5,flexWrap:"nowrap",marginLeft:"auto",minWidth:"max-content"}}>
      {links.map(([href,label])=>{
        const selected=href==="/"?active==="/":active===href||Boolean(active?.startsWith(`${href}/`));
        return <Link key={href} href={href} className={selected?"active":""} style={{flex:"0 0 auto",display:"inline-block",padding:"9px 10px",borderRadius:9,textDecoration:"none",fontSize:13,fontWeight:800,lineHeight:1,border:selected?"1px solid #fff":"1px solid transparent",background:selected?"#fff":"transparent",color:selected?"#111":"#f4f6ef"}}>{label}</Link>
      })}
    </div>
  </nav>;
}
