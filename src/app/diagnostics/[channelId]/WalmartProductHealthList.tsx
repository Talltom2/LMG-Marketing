"use client";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import ZeroInventoryActions from "./ZeroInventoryActions";

type P={sku:string;name:string;productType:string|null;health:"GREEN"|"YELLOW"|"RED";inventory:number|null;buyBoxWinRate:number|null;traffic:string|null;priceCompetitive:boolean|null;reasons:string[]};
const color=(h:P["health"])=>h==="RED"?"#dc2626":h==="YELLOW"?"#eab308":"#16a34a";

export default function WalmartProductHealthList(){
  const[products,setProducts]=useState<P[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  const scroller=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{fetch("/api/integrations/walmart/products",{cache:"no-store"}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.message);setProducts(b.products??[])}).catch(e=>setError(e instanceof Error?e.message:"Unable to load products.")).finally(()=>setLoading(false));},[]);
  const counts=useMemo(()=>({total:products.length,red:products.filter(p=>p.health==="RED").length,yellow:products.filter(p=>p.health==="YELLOW").length,green:products.filter(p=>p.health==="GREEN").length}),[products]);
  function vertical(amount:number){scroller.current?.scrollBy({top:amount,behavior:"smooth"});}
  return <section className="panel">
    <div style={{width:"100%",minWidth:0}}>
      <p className="eyebrow">Active Product Health</p><h2>Walmart products</h2><p>Click a product name or SKU to open its full diagnostic workbench.</p>
      <div style={{display:"flex",gap:18,flexWrap:"wrap",margin:"14px 0 18px",fontSize:"1.02rem"}}>
        <strong>{counts.total} Active</strong><span style={{color:"#dc2626"}}><strong>{counts.red}</strong> Red</span><span style={{color:"#a16207"}}><strong>{counts.yellow}</strong> Yellow</span><span style={{color:"#15803d"}}><strong>{counts.green}</strong> Green</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:10}}><small>Use the up/down controls to move through the product list.</small><div style={{display:"flex",gap:8}}><button type="button" aria-label="Scroll product table up" onClick={()=>vertical(-520)} style={{width:38,height:38,borderRadius:8,fontSize:20,lineHeight:1}}>⌃</button><button type="button" aria-label="Scroll product table down" onClick={()=>vertical(520)} style={{width:38,height:38,borderRadius:8,fontSize:20,lineHeight:1}}>⌄</button></div></div>
      {loading&&<p>Loading Walmart product health…</p>}{error&&<p>{error}</p>}
      <div ref={scroller} style={{width:"100%",maxHeight:"72vh",overflowY:"auto",overflowX:"hidden",paddingRight:4,scrollBehavior:"smooth"}}>
        <div style={{width:"100%",display:"grid",gap:8}}>
          {!loading&&products.map(p=><article key={p.sku} style={{display:"grid",gridTemplateColumns:"18px minmax(0,2.4fr) minmax(72px,.55fr) minmax(76px,.6fr) minmax(82px,.65fr) minmax(120px,1fr) minmax(180px,1.3fr)",gap:10,alignItems:"center",padding:"12px",border:"1px solid #ddd",borderRadius:8,width:"100%",minWidth:0}}><span title={p.health} style={{width:15,height:15,borderRadius:"50%",background:color(p.health),display:"inline-block"}}/><div style={{minWidth:0}}><Link href={`/diagnostics/product?sku=${encodeURIComponent(p.sku)}`} style={{textDecoration:"none",color:"inherit"}}><strong style={{display:"block",overflowWrap:"anywhere"}}>{p.name}</strong><small style={{display:"block",overflowWrap:"anywhere"}}>{p.sku}{p.productType?` · ${p.productType}`:""}</small></Link></div><div style={{minWidth:0}}>Inventory<br/><strong>{p.inventory==null?"Not returned":p.inventory}</strong></div><div style={{minWidth:0}}>Traffic<br/><strong>{p.traffic??"—"}</strong></div><div style={{minWidth:0}}>Buy Box<br/><strong>{p.buyBoxWinRate==null?"—":`${p.buyBoxWinRate.toFixed(1)}%`}</strong></div><div style={{minWidth:0}}><strong>{p.health}</strong><br/><small style={{overflowWrap:"anywhere"}}>{p.reasons.join(" · ")||"No live issue detected"}</small></div><div style={{minWidth:0}}><ZeroInventoryActions sku={p.sku} name={p.name}/>{p.inventory===0?<small style={{display:"block",marginTop:6}}>Out of stock</small>:p.inventory==null?<small style={{display:"block",marginTop:6}}>Inventory not returned by Walmart.</small>:p.inventory<=3?<small style={{display:"block",marginTop:6}}>Low stock — consider replenishment.</small>:<small style={{display:"block",marginTop:6}}>Inventory healthy</small>}</div></article>)}
        </div>
      </div>
    </div>
  </section>
}
