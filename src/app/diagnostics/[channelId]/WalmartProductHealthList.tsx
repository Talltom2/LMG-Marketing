"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import ZeroInventoryActions from "./ZeroInventoryActions";

type P={sku:string;name:string;productType:string|null;health:"GREEN"|"YELLOW"|"RED";inventory:number|null;buyBoxWinRate:number|null;traffic:string|null;priceCompetitive:boolean|null;reasons:string[]};
type Summary={totalCatalog:number;publishedActive:number;unpublished:number;otherStatus:number;inventoryRows:number;pricingOffers:number};
const color=(h:P["health"])=>h==="RED"?"#dc2626":h==="YELLOW"?"#eab308":"#16a34a";

export default function WalmartProductHealthList(){
  const[products,setProducts]=useState<P[]>([]);
  const[summary,setSummary]=useState<Summary|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  useEffect(()=>{fetch("/api/integrations/walmart/products",{cache:"no-store"}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.message);setProducts(b.products??[]);setSummary(b.summary??null)}).catch(e=>setError(e instanceof Error?e.message:"Unable to load products.")).finally(()=>setLoading(false));},[]);
  const counts=useMemo(()=>({total:products.length,red:products.filter(p=>p.health==="RED").length,yellow:products.filter(p=>p.health==="YELLOW").length,green:products.filter(p=>p.health==="GREEN").length}),[products]);
  return <section className="panel" style={{display:"block",width:"100%"}}>
    <style>{`.walmart-product-scroll{scrollbar-width:auto;scrollbar-color:#777 #e8e8e8}.walmart-product-scroll::-webkit-scrollbar{width:18px}.walmart-product-scroll::-webkit-scrollbar-track{background:#e8e8e8;border-radius:10px}.walmart-product-scroll::-webkit-scrollbar-thumb{background:#777;border:3px solid #e8e8e8;border-radius:10px}.walmart-product-scroll::-webkit-scrollbar-thumb:hover{background:#555}`}</style>
    <div style={{width:"100%",minWidth:0}}>
      <p className="eyebrow">Active Product Health</p><h2>Walmart products</h2><p>Click a product name or SKU to open its full diagnostic workbench.</p>
      <div style={{display:"flex",gap:22,flexWrap:"wrap",margin:"14px 0 8px",fontSize:"1.02rem"}}><strong>{counts.total} Active</strong><span style={{color:"#dc2626"}}><strong>{counts.red}</strong> Red</span><span style={{color:"#a16207"}}><strong>{counts.yellow}</strong> Yellow</span><span style={{color:"#15803d"}}><strong>{counts.green}</strong> Green</span></div>
      {summary&&<div style={{display:"flex",gap:18,flexWrap:"wrap",margin:"0 0 18px",color:"#687168",fontSize:".9rem"}}><span><strong>{summary.totalCatalog}</strong> total catalog</span><span><strong>{summary.publishedActive}</strong> published</span><span><strong>{summary.unpublished}</strong> unpublished</span><span><strong>{summary.otherStatus}</strong> other status</span><span><strong>{summary.inventoryRows}</strong> inventory rows received</span><span><strong>{summary.pricingOffers}</strong> pricing offers received</span></div>}
      {loading&&<p>Loading Walmart product health…</p>}{error&&<p>{error}</p>}
      <div className="walmart-product-scroll" style={{width:"100%",maxHeight:"72vh",overflowY:"scroll",overflowX:"hidden",paddingRight:8}}>
        <div style={{width:"100%",display:"grid",gap:8}}>
          {!loading&&products.map(p=><article key={p.sku} style={{display:"grid",gridTemplateColumns:"18px minmax(250px,2.4fr) 76px 76px 82px minmax(130px,.95fr) minmax(220px,1.2fr)",gap:8,alignItems:"center",padding:"11px 8px",border:"1px solid #ddd",borderRadius:8,width:"100%",boxSizing:"border-box",fontSize:".96rem"}}>
            <span title={p.health} style={{width:15,height:15,borderRadius:"50%",background:color(p.health),display:"inline-block"}}/>
            <div style={{minWidth:0}}><Link href={`/diagnostics/product?sku=${encodeURIComponent(p.sku)}`} style={{textDecoration:"none",color:"inherit"}}><strong style={{display:"block",lineHeight:1.22}}>{p.name}</strong><small style={{display:"block",marginTop:3,lineHeight:1.2}}>{p.sku}{p.productType?` · ${p.productType}`:""}</small></Link></div>
            <div>Inventory<br/><strong>{p.inventory==null?"N/A":p.inventory}</strong></div>
            <div>Traffic<br/><strong>{p.traffic??"—"}</strong></div>
            <div>Buy Box<br/><strong>{p.buyBoxWinRate==null?"—":`${p.buyBoxWinRate.toFixed(1)}%`}</strong></div>
            <div><strong>{p.health}</strong><br/><small style={{lineHeight:1.15}}>{p.reasons.join(" · ")||"No live issue detected"}</small></div>
            <div style={{minWidth:0}}><ZeroInventoryActions sku={p.sku} name={p.name}/>{p.inventory===0?<small style={{display:"block",marginTop:5}}>Out of stock</small>:p.inventory==null?<small style={{display:"block",marginTop:5}}>Inventory unavailable</small>:p.inventory<=3?<small style={{display:"block",marginTop:5}}>Low stock</small>:<small style={{display:"block",marginTop:5}}>Inventory healthy</small>}</div>
          </article>)}
        </div>
      </div>
    </div>
  </section>
}
