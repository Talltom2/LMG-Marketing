import Link from "next/link";

const links=[
  ["/","Marketing Intelligence"],
  ["/campaigns","Campaign Builder"],
  ["/campaigns/calendar","Campaign Calendar"],
  ["/campaigns/metrics","Campaign Metrics"],
  ["/diagnostics","Diagnostic Center"],
] as const;

export default function LmgTopNav({active}:{active?:string}){
  return <nav className="lmg-topnav" aria-label="LMG Marketing primary navigation">
    <Link className="lmg-brand" href="/"><span className="lmg-brand-mark">LMG</span><span><strong>LMG Marketing</strong><small>Laughing Moose Gifts</small></span></Link>
    <div className="lmg-navlinks">{links.map(([href,label])=><Link key={href} className={active===href?"active":""} href={href}>{label}</Link>)}</div>
  </nav>;
}