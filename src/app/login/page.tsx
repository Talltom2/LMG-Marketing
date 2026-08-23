"use client";
import {FormEvent,Suspense,useState} from "react";
import {useSearchParams} from "next/navigation";

function LoginForm(){
  const[pw,setPw]=useState("");
  const[error,setError]=useState("");
  const[busy,setBusy]=useState(false);
  const params=useSearchParams();
  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");
    const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
    const d=await r.json();
    if(!r.ok){setError(d.error??'Unable to sign in');setBusy(false);return}
    window.location.href=params.get('next')||'/';
  }
  return <section className="login-card"><div className="login-mark">LMG</div><p className="eyebrow">Laughing Moose Gifts</p><h1>LMG Marketing</h1><p>Enter the system password to continue.</p><form onSubmit={submit}><label>Password<input autoFocus type="password" value={pw} onChange={e=>setPw(e.target.value)} autoComplete="current-password"/></label>{error&&<p className="login-error">{error}</p>}<button disabled={busy||!pw}>{busy?'Checking…':'Access LMG Marketing'}</button></form></section>;
}

export default function Login(){
  return <main className="login-shell"><Suspense fallback={<section className="login-card"><p>Loading secure access…</p></section>}><LoginForm/></Suspense></main>;
}