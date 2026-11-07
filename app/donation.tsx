'use client';
import { useState } from 'react';
type Camp = { id: number; title: string };
type Preset = { value: string; label: string; desc: string };
type Pix = { qr: string; code: string; receiver: string; txid: string; provider: string };
const DEFAULT_PRESETS: Preset[] = [
 { value: '50', label: 'R$ 50', desc: '1 cesta' },
 { value: '100', label: 'R$ 100', desc: '2 cestas' },
 { value: '120', label: 'R$ 120', desc: '1 curso' },
 { value: '180', label: 'R$ 180', desc: 'kit completo' },
];
export default function Donation({ campaigns, presets }: { campaigns: Camp[]; presets?: Preset[] }) {
 const options = presets?.length ? presets : DEFAULT_PRESETS;
 const [amount,setAmount] = useState(options[0]?.value || '50');
 const [name,setName] = useState(''); const [email,setEmail] = useState('');
 const [message,setMessage] = useState(''); const [campaign,setCampaign] = useState('');
 const [pix,setPix] = useState<Pix | null>(null); const [loading,setLoading] = useState(false);
 const [error,setError] = useState(''); const [copyError,setCopyError] = useState('');
 const [copied,setCopied] = useState(false); const [reporting,setReporting] = useState(false);
 const [reported,setReported] = useState(false); const [reportError,setReportError] = useState('');
 async function submit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault(); setLoading(true); setError(''); setPix(null); setCopied(false); setReported(false); setReportError(''); setCopyError('');
  try {
   const r = await fetch('/api/pix',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({amount,name,email,message,campaignId:campaign || null})});
   const j = await r.json(); if (!r.ok) throw Error(j.error || 'Erro ao gerar Pix');
   if (typeof j.code !== 'string' || typeof j.qr !== 'string' || !/^[A-F0-9]{24}$/.test(j.txid)) throw Error('Resposta Pix incompleta. Tente novamente.');
   setPix({code:j.code,qr:j.qr,receiver:j.receiver,txid:j.txid,provider:j.provider || 'static_pix'});
  } catch(e) {setError(e instanceof Error ? e.message : 'Erro ao gerar Pix');} finally {setLoading(false);}
 }
 async function copyPix() { if (!pix) return; setCopyError(''); try {await navigator.clipboard.writeText(pix.code);setCopied(true);} catch {setCopyError('Não foi possível copiar automaticamente. Selecione o código e copie manualmente.');} }
 async function reportPayment() {
  if (!pix || !copied || reporting || reported || pix.provider === 'mercadopago') return;
  setReporting(true);setReportError('');
  try {const r=await fetch('/api/pix/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({txid:pix.txid})});const j=await r.json();if(!r.ok)throw Error(j.error || 'Não foi possível registrar o aviso.');setReported(true);} catch(e){setReportError(e instanceof Error?e.message:'Erro ao registrar aviso.');} finally{setReporting(false);}
 }
 return <form onSubmit={submit}>
  <div className="amount-options">{options.map(p=><button key={p.value} type="button" className={`amount-btn ${amount===p.value?'active':''}`} onClick={()=>setAmount(p.value)}>{p.label}{p.desc && <small>{p.desc}</small>}</button>)}</div>
  <div className="field"><label htmlFor="valor">Ou digite outro valor (R$)</label><input id="valor" type="number" step="0.01" min="1" max="1000000" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Ex: 250" /></div>
  <div className="field"><label htmlFor="nome">Seu nome (opcional)</label><input id="nome" maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Como podemos te chamar?" /></div>
  <div className="field"><label htmlFor="email">E-mail para gerar o Pix pelo Mercado Pago</label><input id="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="seuemail@exemplo.com" /><small>Necessário para o Pix automático; enquanto o sistema antigo estiver ativo, é opcional.</small></div>
  <div className="field"><label htmlFor="msg">Mensagem (opcional)</label><textarea id="msg" maxLength={500} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Deixe uma mensagem de carinho..." rows={3}/></div>
  {campaigns.length>0 && <div className="field"><label htmlFor="camp">Destinar a um projeto</label><select id="camp" value={campaign} onChange={e=>setCampaign(e.target.value)}><option value="">Contribuição geral</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></div>}
  <button className="btn btn-gold btn-lg" style={{width:'100%'}} disabled={loading} type="submit">{loading?'Gerando Pix seguro...':'Gerar Pix agora'}</button>
  {error && <p className="error" role="alert">{error}</p>}
  {pix && <div className="pix-result">
   <img width={220} height={220} src={pix.qr} alt="QR Code Pix" style={{maxWidth:'100%',height:'auto',background:'#fff',padding:10,borderRadius:12}}/>
   <p style={{marginBottom:12,fontSize:'0.95rem',color:'#fff'}}><strong>Beneficiário: {pix.receiver}</strong></p>
   <p style={{marginBottom:12,color:'#d7e8df',fontSize:13}}>Confira o nome do beneficiário no aplicativo do banco antes de pagar.</p>
   <div className="pix-code" style={{overflowWrap:'anywhere'}}>{pix.code}</div>
   <button type="button" onClick={copyPix} style={{width:'100%',padding:'15px 18px',marginTop:14,borderRadius:12,border:'1px solid #fff',background:'#fff',color:'#153b30',fontWeight:700,fontSize:15,cursor:'pointer'}}>{copied?'✓ Código Pix copiado':'Copiar código Pix'}</button>
   {copyError && <p role="alert" style={{color:'#ffe4c9',marginTop:8}}>{copyError}</p>}
   {pix.provider==='mercadopago' ? <p className="trust-note" style={{color:'#d7e8df',marginTop:20}}>🔒 A confirmação do pagamento é automática após verificação pelo Mercado Pago. Não é necessário avisar que pagou.</p> : <>
    {copied && !reported && <div style={{marginTop:22,paddingTop:18,borderTop:'1px solid rgba(255,255,255,.2)'}}><p style={{color:'#fff',textAlign:'center',marginBottom:12}}>Já concluiu o pagamento no aplicativo do banco?</p><button type="button" disabled={reporting} onClick={reportPayment} style={{width:'100%',padding:'15px 18px',border:0,borderRadius:12,background:'#d8b56b',color:'#153b30',fontWeight:700,fontSize:15,cursor:reporting?'wait':'pointer'}}>{reporting?'Registrando aviso...':'Já fiz o Pix — Confirmar doação'}</button>{reportError && <p role="alert" style={{color:'#ffe4c9',marginTop:10}}>{reportError}</p>}</div>}
    {reported && <div role="status" style={{background:'#e5f4e9',color:'#153b30',padding:18,borderRadius:12,marginTop:18,textAlign:'center'}}><strong>✓ Aviso recebido. Obrigado!</strong><p style={{marginTop:8}}>Registramos que você informou ter realizado o Pix. A associação verificará o recebimento no banco.</p></div>}
    <p className="trust-note" style={{color:'#d7e8df',marginTop:20}}>🔒 O aviso do doador não comprova o pagamento nem confirma a receita.</p>
   </>}
  </div>}
  {!pix && <p className="trust-note">🔒 Pagamento seguro via Pix · A geração do código não comprova pagamento.</p>}
 </form>;
}
