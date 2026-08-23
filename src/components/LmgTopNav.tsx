import Link from "next/link";

const links=[
  ["/","Marketing Intelligence"],
  ["/campaigns","Campaign Builder"],
  ["/campaigns/calendar","Campaign Calendar"],
  ["/campaigns/production","Creative Studio"],
  ["/campaigns/metrics","Campaign Metrics"],
  ["/campaigns/diagnostics","Diagnostic Center"],
  ["/campaigns/alerts","Alerts"],
  ["/campaigns/closeout","Closeout & Learning"],
] as const;

function LmgLogo(){
  return <span className="lmg-logo" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M20 15c-6-2-9-6-10-11m10 11c-5 0-9 2-12 6m36-6c6-2 9-6 10-11M44 15c5 0 9 2 12 6M22 18c3-3 17-3 20 0l3 15c1 8-5 19-13 21-8-2-14-13-13-21l3-15Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M25 31h.1M39 31h.1M28 41c3 2 5 2 8 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg></span>;
}

export default function LmgTopNav({active}:{active?:string}){
  return <nav className="lmg-topnav" aria-label="LMG Marketing primary navigation">
    <Link className="lmg-brand" href="/"><LmgLogo/><span className="lmg-brand-copy"><strong>LMG Marketing</strong><small>Laughing Moose Gifts</small></span></Link>
    <div className="lmg-navlinks">{links.map(([href,label])=><Link key={href} className={active===href?"active":""} href={href}>{label}</Link>)}</div>
  </nav>;
}