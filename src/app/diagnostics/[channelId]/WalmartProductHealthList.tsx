"use client";
import Link from "next/link";
import {useEffect,useState} from "react";

type P={sku:string;name:string;productType:string|null;health:"GREEN"|"YELLOW"|"RED";buyBoxWinRate:number|null;traffic:string|null;priceCompetitive:boolean|null;reasons:string[]};
const color=(h:P["health"])=>h==="RED"?"#dc2626":h==="YELLOW"?"#eab308":"#16a34a";

export default function WalmartProductHealthList(){
  const[products,setProducts]=useState<P[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");

  useEffect(()=>{
    fetch("/api/integrations/walmart/products",{cache:"no-store"})
      .then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.message);setProducts(b.products??[])})
      .catch(e=>setError(e instanceof Error?e.message:"Unable to load products."))
      .finally(()=>setLoading(false));
  },[]);

  return <section className="panel" style={{display:"block"}}>
    <div style={{width:"100%",marginBottom:16}}>
      <p className="eyebrow">Active Product Health</p>
      <h2>Walmart products</h2>
      <p>Click any active product to open its full diagnostic workbench.</p>
      {!loading&&<p><small>{products.length} active products shown.</small></p>}
    </div>

    {loading&&<p>Loading Walmart product health…</p>}
    {error&&<p>{error}</p>}

    <div style={{width:"100%",maxHeight:"70vh",overflowY:"auto",overflowX:"auto",paddingRight:4}}>
      <div style={{minWidth:900,display:"grid",gap:8}}>
        {products.map(p=><Link key={p.sku} href={`/diagnostics/product?sku=${encodeURIComponent(p.sku)}`} target="_blank" style={{textDecoration:"none",color:"inherit",display:"block",width:"100%"}}>
          <article style={{width:"100%",display:"grid",gridTemplateColumns:"24px minmax(360px,2.4fr) minmax(120px,.7fr) minmax(120px,.7fr) minmax(220px,1.2fr)",gap:16,alignItems:"center",padding:"14px 16px",border:"1px solid #ddd",borderRadius:10,boxSizing:"border-box"}}>
            <span title={p.health} style={{width:18,height:18,borderRadius:"50%",background:color(p.health),display:"inline-block"}}/>
            <div><strong>{p.name}</strong><br/><small>{p.sku}{p.productType?` · ${p.productType}`:""}</small></div>
            <div>Traffic<br/><strong>{p.traffic??"—"}</strong></div>
            <div>Buy Box<br/><strong>{p.buyBoxWinRate==null?"—":`${p.buyBoxWinRate.toFixed(1)}%`}</strong></div>
            <div><strong>{p.health}</strong><br/><small>{p.reasons.join(" · ")||"No live issue detected"}</small></div>
          </article>
        </Link>)}
      </div>
    </div>
  </section>
}
