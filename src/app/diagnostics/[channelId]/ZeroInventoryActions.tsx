"use client";
import {useState} from "react";

type Props={sku:string;name:string};
export default function ZeroInventoryActions({sku,name}:Props){
 const[message,setMessage]=useState("");const[working,setWorking]=useState(false);
 async function send(action:"REORDER"|"RETIRE"|"DELETE",note?:string){setWorking(true);setMessage("");try{const r=await fetch("/api/integrations/walmart/product-action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sku,name,action,note})});const b=await r.json();if(!r.ok)throw new Error(b.message??"Unable to save action.");setMessage(b.message);}catch(e){setMessage(e instanceof Error?e.message:"Unable to save action.");}finally{setWorking(false)}}
 function reorder(e:React.MouseEvent){e.preventDefault();e.stopPropagation();const note=window.prompt(`Reorder note for ${sku}:`,`Order more inventory for ${name}`);if(note!==null)void send("REORDER",note);}
 function retire(e:React.MouseEvent){e.preventDefault();e.stopPropagation();if(window.confirm(`Retire ${sku}? This will queue a Walmart retirement action for approval/execution and remove it from active marketing once executed.`))void send("RETIRE");}
 function remove(e:React.MouseEvent){e.preventDefault();e.stopPropagation();if(window.confirm(`Delete ${sku}? This is a high-risk destructive action. LMG Marketing will queue the deletion request and will not report it as deleted until Walmart confirms execution.`))void send("DELETE");}
 return <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><button type="button" disabled={working} onClick={reorder} style={{padding:"6px 8px"}}>Reorder</button><button type="button" disabled={working} onClick={retire} style={{padding:"6px 8px"}}>Retire</button><button type="button" disabled={working} onClick={remove} style={{padding:"6px 8px"}}>Delete</button>{message&&<small style={{width:"100%"}}>{message}</small>}</div>;
}
