import Link from "next/link";

const links=[
  ["/campaigns/calendar","Calendar"],
  ["/campaigns","Build"],
  ["/promotional-assets","Opportunities"],
  ["/campaigns/execution","Execute"],
  ["/campaigns/metrics","Metrics"],
  ["/campaigns/diagnostics","Diagnostics"],
  ["/campaigns/alerts","Alerts"],
  ["/campaigns/production","Creative"],
  ["/campaigns/closeout","Learning"],
] as const;

export default function LmgTopNav({active,global=false}:{active?:string;global?:boolean}){
  return <nav aria-label="LMG Marketing" data-lmg-global={global?"true":"false"} className="lmg-topnav" style={{maxWidth:1540,margin:"0 auto 22px",padding:"10px 14px",display:"flex",alignItems:"center",gap:14,overflowX:"auto",whiteSpace:"nowrap",WebkitOverflowScrolling:"touch",scrollbarWidth:"thin",borderRadius:18,background:"#050505",boxShadow:"0 10px 28px rgba(0,0,0,.22)"}}>
    <Link href="/" className="lmg-brand" aria-label="LMG Marketing Dashboard" style={{display:"flex",alignItems:"center",gap:10,textDecoration:"none",color:"#fff",padding:"4px 6px",flex:"0 0 auto"}}>
      <img src="/lmg-logo-nav.jpg" alt="Laughing Moose Gifts" width={180} height={100} style={{display:"block",height:48,width:"auto",borderRadius:8}}/>
    </Link>
    <div className="lmg-navlinks" style={{display:"flex",alignItems:"center",gap:5,flexWrap:"nowrap",marginLeft:0,minWidth:"max-content"}}>
      {links.map(([href,label])=>{
        const selected=href==="/"?active==="/":active===href||Boolean(active?.startsWith(`${href}/`));
        return <Link key={href} href={href} className={selected?"active":""} style={{flex:"0 0 auto",display:"inline-block",padding:"9px 10px",borderRadius:9,textDecoration:"none",fontSize:13,fontWeight:800,lineHeight:1,border:selected?"1px solid #fff":"1px solid transparent",background:selected?"#fff":"transparent",color:selected?"#111":"#f4f6ef"}}>{label}</Link>
      })}
    </div>
  </nav>;
}
