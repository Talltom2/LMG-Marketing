"use client";
import {useState} from "react";

export default function DashboardAssistantBox(){
  const[text,setText]=useState("");
  function submit(e:React.FormEvent){
    e.preventDefault();
    const q=text.trim();
    if(!q)return;
    const url=`https://chatgpt.com/?q=${encodeURIComponent(`LMG Marketing: ${q}`)}`;
    window.open(url,"_blank","noopener,noreferrer");
  }
  return <section className="dashboard-assistant">
    <div><span className="assistant-eyebrow">ASK CHATGPT ABOUT LMG MARKETING</span><h2>What would you like me to do?</h2><p>Ask a question, request a change, or describe something you want revised in LMG Marketing.</p></div>
    <form onSubmit={submit} className="assistant-form"><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Example: Review the September campaign and tell me what you would change…" rows={3}/><button type="submit" disabled={!text.trim()}>Ask / Request Update →</button></form>
    <small>This opens ChatGPT with your request. Direct in-dashboard execution can be connected as the next integration step.</small>
  </section>;
}
