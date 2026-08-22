"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";

type P={sku:string;name:string;productType:string|null;health:"GREEN"|"YELLOW"|"RED";inventory:number|null;buyBoxWinRate:number|null;traffic:string|null;priceCompetitive:boolean|null;reasons:string[]};
const color=(h:P["health"])=>h==="RED"?"#dc2626":h==="YELLOW"?"#eab308":"#16a34a";

export default function WalmartProductHealthList(){
  const[products,setProducts]=useState<P[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  useEffect(()=>{fetch("/api/integrations/walmart/products",{cache:"no-store"}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.message);setProducts(b.products??[])}).catch(e=>setError(e instanceof Error?e.message:"Unable to load products.")).finally(()=>setLoading(false));},[]);
  const counts=useMemo(()=>({total:products.length,red:products.filter(p=>p.health==="RED").length,yellow:products.filter(p=>p.health==="YELLOW").length,green:products.filter(p=>p.health==="GREEN").length}),[products]);
  return <section className="panel">
    <div style={{width:"100%"}}>
      <p className="eyebrow">Active Product Health</p><h2>Walmart products</h2><p>Click any active SKU to open its full diagnostic workbench.</p>
      <div style={{display:"flex",gap:18,flexWrap:"wrap",margin:"14px 0 18px",fontSize:"1.02rem"}}>
        <strong>{counts.total} Active</strong><span style={{color:"#dc2626"}}><strong>{counts.red}</strong> Red</span><span style={{color:"#a16207"}}><strong>{counts.yellow}</strong> Yellow</span><span style={{color:"#15803d"}}><strong>{counts.green}</strong> Green</span>
      </div>
      {loading&&<p>Loading Walmart product health…</p>}{error&&<p>{error}</p>}
      <div style={{width:"100%",maxHeight:"72vh",overflowY:"auto",overflowX:"auto",paddingRight:4}}>
        <div style={{minWidth:900,display:"grid",gap:8}}>
          {!loading&&products.map(p=><Link key={p.sku} href={`/diagnostics/product?sku=${encodeURIComponent(p.sku)}`} style={{textDecoration:"none",color:"inherit"}}><article style={{display:"grid",gridTemplateColumns:"24px minmax(320px,2.2fr) 110px 120px 120px minmax(180px,1.2fr)",gap:14,alignItems:"center",padding:"12px 14px",border:"1px solid #ddd",borderRadius:8,width:"100%"}}><span title={p.health} style={{width:17,height:17,borderRadius:"50%",background:color(p.health),display:"inline-block"}}/><div><strong>{p.name}</strong><br/><small>{p.sku}{p.productType?` · ${p.productType}`:""}</small></div><div>Inventory<br/><strong>{p.inventory==null?"—":p.inventory}</strong></div><div>Traffic<br/><strong>{p.traffic??"—"}</strong></div><div>Buy Box<br/><strong>{p.buyBoxWinRate==null?"—":`${p.buyBoxWinRate.toFixed(1)}%`}</strong></div><div><strong>{p.health}</strong><br/><small>{p.reasons.join(" · ")||"No live issue detected"}</small></div></article></Link>)}
        </div>
      </div>
    </div>
  </section>
}
