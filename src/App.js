import React from "react";import { useState, useEffect, useRef } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const IDR = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const today = () => new Date().toISOString().slice(0, 10);
const CATS = ["🍜 Makan", "🚗 Transport", "🛍️ Belanja", "💊 Kesehatan", "🎬 Hiburan", "📚 Pendidikan", "🏠 Rumah", "💸 Lainnya"];
const CAT_COLORS = { "🍜 Makan":"#F59E0B","🚗 Transport":"#3B82F6","🛍️ Belanja":"#EC4899","💊 Kesehatan":"#10B981","🎬 Hiburan":"#8B5CF6","📚 Pendidikan":"#06B6D4","🏠 Rumah":"#F97316","💸 Lainnya":"#6B7280" };
const TABS = ["Dashboard", "Transaksi", "Goals", "AI Advisor"];

const DEMO = {
  transactions: [
    { id:1, type:"income",  amount:5000000,  cat:"💸 Lainnya",    desc:"Gaji bulan ini",         date:"2026-03-01" },
    { id:2, type:"expense", amount:150000,   cat:"🍜 Makan",       desc:"Makan siang + kopi",     date:"2026-03-01" },
    { id:3, type:"expense", amount:50000,    cat:"🚗 Transport",   desc:"Bensin",                 date:"2026-03-01" },
    { id:4, type:"income",  amount:2500000,  cat:"💸 Lainnya",     desc:"Freelance web design",   date:"2026-02-28" },
    { id:5, type:"expense", amount:350000,   cat:"🛍️ Belanja",     desc:"Skincare",               date:"2026-02-28" },
    { id:6, type:"expense", amount:80000,    cat:"🎬 Hiburan",     desc:"Netflix",                date:"2026-02-27" },
  ],
  goals: [
    { id:1, name:"💻 Laptop Baru", target:12000000, saved:4500000, deadline:"2026-08-01" },
    { id:2, name:"✈️ Liburan Lombok", target:3000000, saved:1200000, deadline:"2026-06-01" },
  ],
  budget: { "🍜 Makan":1500000,"🚗 Transport":500000,"🛍️ Belanja":800000,"💊 Kesehatan":300000,"🎬 Hiburan":300000,"📚 Pendidikan":200000,"🏠 Rumah":1000000,"💸 Lainnya":400000 }
};

// ── main ─────────────────────────────────────────────────────────────────────
export default function BudgetAI() {
  const [tab, setTab] = useState("Dashboard");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [txForm, setTxForm] = useState({ type:"expense", amount:"", cat:CATS[0], desc:"", date:today() });
  const [showTxForm, setShowTxForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ name:"", target:"", saved:"", deadline:"" });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editBudget, setEditBudget] = useState(false);
  const [chat, setChat] = useState([{ role:"assistant", content:"Halo! 👋 Saya **FinAI**, asisten keuangan pintarmu. Tanya apa aja — analisis pengeluaran, tips hemat, cara nabung lebih cepat, atau saran investasi untuk pemula. Gimana keuanganmu sekarang? 💰" }]);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const chatEndRef = useRef(null);

  // load
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("finai-data");
        setData(r ? JSON.parse(r.value) : DEMO);
      } catch { setData(DEMO); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chat]);

  const persist = async (d) => { setData(d); try { await window.storage.set("finai-data", JSON.stringify(d)); } catch {} };

  const showToast = (msg, type="ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

  // derived
  const thisMonth = () => new Date().toISOString().slice(0,7);
  const monthTx = (d) => d.transactions.filter(t => t.date.startsWith(thisMonth()));
  const totalIncome = (d) => monthTx(d).filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
  const totalExpense = (d) => monthTx(d).filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);
  const balance = (d) => totalIncome(d) - totalExpense(d);
  const expByCat = (d) => {
    const res = {};
    monthTx(d).filter(t=>t.type==="expense").forEach(t => { res[t.cat] = (res[t.cat]||0)+t.amount; });
    return res;
  };

  // add transaction
  const addTx = async () => {
    if (!txForm.amount || !txForm.desc) { showToast("Lengkapi semua field!", "err"); return; }
    const tx = { ...txForm, amount: Number(txForm.amount), id: Date.now() };
    const nd = { ...data, transactions: [tx, ...data.transactions] };
    await persist(nd);
    setShowTxForm(false);
    setTxForm({ type:"expense", amount:"", cat:CATS[0], desc:"", date:today() });
    showToast(tx.type==="income" ? "Pemasukan dicatat! 💚" : "Pengeluaran dicatat! 📝");
  };

  // add goal
  const addGoal = async () => {
    if (!goalForm.name || !goalForm.target) { showToast("Lengkapi nama & target!", "err"); return; }
    const g = { ...goalForm, target:Number(goalForm.target), saved:Number(goalForm.saved||0), id:Date.now() };
    const nd = { ...data, goals: [...data.goals, g] };
    await persist(nd);
    setShowGoalForm(false);
    setGoalForm({ name:"", target:"", saved:"", deadline:"" });
    showToast("Goal ditambahkan! 🎯");
  };

  const addToGoal = async (id, amt) => {
    const nd = { ...data, goals: data.goals.map(g => g.id===id ? {...g, saved:Math.min(g.saved+amt,g.target)} : g) };
    await persist(nd);
    showToast("Tabungan diupdate! 💰");
  };

  const deleteTx = async (id) => { await persist({ ...data, transactions: data.transactions.filter(t=>t.id!==id) }); showToast("Dihapus"); };
  const deleteGoal = async (id) => { await persist({ ...data, goals: data.goals.filter(g=>g.id!==id) }); showToast("Goal dihapus"); };

  const saveBudget = async (cat, val) => {
    const nd = { ...data, budget: { ...data.budget, [cat]: Number(val)||0 } };
    await persist(nd);
  };

  // AI chat
  const sendChat = async () => {
    if (!input.trim() || aiLoading) return;
    const userMsg = input.trim(); setInput("");
    const newChat = [...chat, { role:"user", content:userMsg }];
    setChat(newChat); setAiLoading(true);

    const summary = data ? `
Ringkasan keuangan bulan ini:
- Total pemasukan: ${IDR(totalIncome(data))}
- Total pengeluaran: ${IDR(totalExpense(data))}
- Saldo: ${IDR(balance(data))}
- Pengeluaran per kategori: ${JSON.stringify(expByCat(data))}
- Budget yang ditetapkan: ${JSON.stringify(data.budget)}
- Goals aktif: ${data.goals.map(g=>`${g.name} (target:${IDR(g.target)}, terkumpul:${IDR(g.saved)})`).join(", ")}
` : "";

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system:`Kamu adalah FinAI, asisten keuangan personal yang ramah, cerdas, dan supportif untuk pengguna Indonesia. 
Kamu memberikan saran keuangan yang praktis, realistis, dan mudah dipahami.
Gunakan bahasa Indonesia yang santai tapi profesional. Gunakan emoji secukupnya.
Selalu berikan saran yang actionable dan spesifik.

${summary}

Jika pengguna bertanya tentang keuangannya, gunakan data di atas untuk memberikan analisis yang personal dan akurat.`,
          messages: newChat.map(m => ({ role:m.role, content:m.content }))
        })
      });
      const d = await res.json();
      const reply = d.content?.find(c=>c.type==="text")?.text || "Maaf, ada gangguan. Coba lagi ya!";
      setChat(prev => [...prev, { role:"assistant", content:reply }]);
    } catch {
      setChat(prev => [...prev, { role:"assistant", content:"Koneksi bermasalah. Pastikan API key sudah terhubung ya! 🙏" }]);
    }
    setAiLoading(false);
  };

  const renderMd = (text) => text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');

  if (loading || !data) return (
    <div style={{background:"#0C0E14",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#7C6AF7",fontFamily:"monospace",fontSize:"1.1rem"}}>Loading FinAI...</div>
    </div>
  );

  const inc = totalIncome(data), exp = totalExpense(data), bal = balance(data);
  const ebc = expByCat(data);
  const savRate = inc > 0 ? Math.round(((inc-exp)/inc)*100) : 0;

  return (
    <div style={{background:"#0C0E14",minHeight:"100vh",fontFamily:"'DM Sans',system-ui,sans-serif",color:"#E2E8F0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#0C0E14}::-webkit-scrollbar-thumb{background:#2D2F3E;border-radius:4px}
        input,select,textarea{outline:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .tab-btn:hover{color:#A78BFA!important}
        .tx-row:hover{background:rgba(124,106,247,0.06)!important}
        .btn-hover:hover{opacity:0.85;transform:translateY(-1px)}
        .card-hover:hover{border-color:#4C4F6B!important}
      `}</style>

      {toast && (
        <div style={{position:"fixed",top:16,right:16,zIndex:9999,background:toast.type==="err"?"#EF4444":"#7C6AF7",color:"white",padding:"10px 20px",borderRadius:12,fontSize:"0.85rem",fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",animation:"fadeUp 0.3s ease"}}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{background:"rgba(12,14,20,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #1A1D2E",padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,background:"linear-gradient(135deg,#7C6AF7,#A78BFA)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem"}}>💰</div>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1.1rem",fontWeight:800,color:"#E2E8F0",lineHeight:1}}>FinAI</div>
            <div style={{fontSize:"0.65rem",color:"#4C4F6B",letterSpacing:"0.08em",textTransform:"uppercase"}}>Smart Budget Planner</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {TABS.map(t => (
            <button key={t} onClick={()=>setTab(t)} className="tab-btn"
              style={{background:tab===t?"rgba(124,106,247,0.15)":"transparent",border:tab===t?"1px solid rgba(124,106,247,0.3)":"1px solid transparent",borderRadius:100,padding:"7px 14px",fontSize:"0.78rem",fontWeight:tab===t?600:400,color:tab===t?"#A78BFA":"#4C4F6B",cursor:"pointer",transition:"all 0.2s"}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"20px 24px",maxWidth:900,margin:"0 auto"}}>

        {/* ── DASHBOARD ── */}
        {tab==="Dashboard" && (
          <div style={{animation:"fadeUp 0.4s ease"}}>
            {/* Summary cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
              {[
                {label:"Pemasukan",val:IDR(inc),color:"#10B981",icon:"📈",sub:"bulan ini"},
                {label:"Pengeluaran",val:IDR(exp),color:"#EF4444",icon:"📉",sub:"bulan ini"},
                {label:"Saldo",val:IDR(bal),color:bal>=0?"#7C6AF7":"#EF4444",icon:"💳",sub:"tersisa"},
                {label:"Saving Rate",val:savRate+"%",color:savRate>=20?"#10B981":savRate>=10?"#F59E0B":"#EF4444",icon:"🎯",sub:savRate>=20?"Excellent!":savRate>=10?"Cukup baik":"Perlu ditingkatkan"},
              ].map((c,i)=>(
                <div key={i} className="card-hover" style={{background:"#13151F",border:"1px solid #1A1D2E",borderRadius:16,padding:"18px 16px",transition:"border-color 0.2s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{fontSize:"1.4rem"}}>{c.icon}</div>
                    <div style={{fontSize:"0.65rem",color:"#4C4F6B",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>{c.label}</div>
                  </div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1.25rem",fontWeight:800,color:c.color,marginTop:10,lineHeight:1}}>{c.val}</div>
                  <div style={{fontSize:"0.72rem",color:"#4C4F6B",marginTop:6}}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Budget vs actual */}
            <div style={{background:"#13151F",border:"1px solid #1A1D2E",borderRadius:16,padding:20,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:"0.95rem",fontWeight:800,color:"#E2E8F0"}}>Budget vs Pengeluaran</div>
                <button onClick={()=>{setEditBudget(!editBudget)}} style={{background:"rgba(124,106,247,0.15)",color:"#A78BFA",border:"1px solid rgba(124,106,247,0.25)",borderRadius:100,padding:"5px 14px",fontSize:"0.75rem",fontWeight:600,cursor:"pointer"}}>
                  {editBudget?"Selesai":"Edit Budget"}
                </button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {CATS.map(cat => {
                  const spent = ebc[cat]||0, budget = data.budget[cat]||0, pct = budget>0?Math.min((spent/budget)*100,100):0;
                  const over = spent > budget && budget > 0;
                  return (
                    <div key={cat}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                        <span style={{fontSize:"0.82rem",color:"#A0A8C0",fontWeight:500}}>{cat}</span>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {editBudget ? (
                            <input type="number" defaultValue={budget}
                              onBlur={e=>saveBudget(cat,e.target.value)}
                              style={{background:"#1E2030",border:"1px solid #2D2F3E",borderRadius:6,padding:"3px 8px",fontSize:"0.75rem",color:"#E2E8F0",width:90,textAlign:"right"}} />
                          ) : (
                            <span style={{fontSize:"0.75rem",color:over?"#EF4444":"#4C4F6B"}}>{IDR(spent)} / {IDR(budget)}</span>
                          )}
                          {over && <span style={{fontSize:"0.65rem",background:"rgba(239,68,68,0.15)",color:"#EF4444",padding:"2px 7px",borderRadius:100,fontWeight:700}}>OVER</span>}
                        </div>
                      </div>
                      <div style={{background:"#1A1D2E",borderRadius:100,height:6,overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:100,width:pct+"%",background:over?"#EF4444":`${CAT_COLORS[cat]}`,transition:"width 0.5s ease"}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent tx */}
            <div style={{background:"#13151F",border:"1px solid #1A1D2E",borderRadius:16,padding:20}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"0.95rem",fontWeight:800,color:"#E2E8F0",marginBottom:14}}>Transaksi Terbaru</div>
              {data.transactions.slice(0,5).map(t=>(
                <div key={t.id} className="tx-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 8px",borderRadius:10,transition:"background 0.2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:36,height:36,borderRadius:10,background:t.type==="income"?"rgba(16,185,129,0.12)":"rgba(239,68,68,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem"}}>
                      {t.type==="income"?"💚":"💸"}
                    </div>
                    <div>
                      <div style={{fontSize:"0.85rem",fontWeight:600,color:"#C8D0E0"}}>{t.desc}</div>
                      <div style={{fontSize:"0.72rem",color:"#4C4F6B"}}>{t.cat} · {t.date}</div>
                    </div>
                  </div>
                  <div style={{fontSize:"0.9rem",fontWeight:700,color:t.type==="income"?"#10B981":"#EF4444"}}>
                    {t.type==="income"?"+":"-"}{IDR(t.amount)}
                  </div>
                </div>
              ))}
              <button onClick={()=>setTab("Transaksi")} style={{marginTop:8,background:"transparent",border:"none",color:"#7C6AF7",fontSize:"0.82rem",fontWeight:600,cursor:"pointer",padding:"4px 0"}}>
                Lihat semua →
              </button>
            </div>
          </div>
        )}

        {/* ── TRANSAKSI ── */}
        {tab==="Transaksi" && (
          <div style={{animation:"fadeUp 0.4s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1.1rem",fontWeight:800}}>Semua Transaksi</div>
              <button onClick={()=>setShowTxForm(!showTxForm)} className="btn-hover"
                style={{background:"#7C6AF7",color:"white",border:"none",borderRadius:100,padding:"10px 20px",fontSize:"0.85rem",fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>
                + Catat Transaksi
              </button>
            </div>

            {showTxForm && (
              <div style={{background:"#13151F",border:"1px solid #2D2F3E",borderRadius:16,padding:20,marginBottom:20,animation:"fadeUp 0.3s ease"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{fontSize:"0.72rem",fontWeight:600,color:"#4C4F6B",textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:6}}>Tipe</label>
                    <select value={txForm.type} onChange={e=>setTxForm({...txForm,type:e.target.value})}
                      style={{width:"100%",background:"#1A1D2E",border:"1px solid #2D2F3E",borderRadius:10,padding:"10px 12px",fontSize:"0.85rem",color:txForm.type==="income"?"#10B981":"#EF4444",fontWeight:600,cursor:"pointer"}}>
                      <option value="expense">💸 Pengeluaran</option>
                      <option value="income">💚 Pemasukan</option>
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:"0.72rem",fontWeight:600,color:"#4C4F6B",textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:6}}>Jumlah (Rp)</label>
                    <input type="number" value={txForm.amount} onChange={e=>setTxForm({...txForm,amount:e.target.value})}
                      placeholder="150000"
                      style={{width:"100%",background:"#1A1D2E",border:"1px solid #2D2F3E",borderRadius:10,padding:"10px 12px",fontSize:"0.85rem",color:"#E2E8F0"}} />
                  </div>
                  <div>
                    <label style={{fontSize:"0.72rem",fontWeight:600,color:"#4C4F6B",textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:6}}>Kategori</label>
                    <select value={txForm.cat} onChange={e=>setTxForm({...txForm,cat:e.target.value})}
                      style={{width:"100%",background:"#1A1D2E",border:"1px solid #2D2F3E",borderRadius:10,padding:"10px 12px",fontSize:"0.85rem",color:"#E2E8F0",cursor:"pointer"}}>
                      {CATS.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:"0.72rem",fontWeight:600,color:"#4C4F6B",textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:6}}>Tanggal</label>
                    <input type="date" value={txForm.date} onChange={e=>setTxForm({...txForm,date:e.target.value})}
                      style={{width:"100%",background:"#1A1D2E",border:"1px solid #2D2F3E",borderRadius:10,padding:"10px 12px",fontSize:"0.85rem",color:"#E2E8F0"}} />
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={{fontSize:"0.72rem",fontWeight:600,color:"#4C4F6B",textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:6}}>Keterangan</label>
                  <input value={txForm.desc} onChange={e=>setTxForm({...txForm,desc:e.target.value})}
                    placeholder="Makan siang, bensin, gaji..."
                    style={{width:"100%",background:"#1A1D2E",border:"1px solid #2D2F3E",borderRadius:10,padding:"10px 12px",fontSize:"0.85rem",color:"#E2E8F0"}} />
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>setShowTxForm(false)} style={{flex:1,background:"#1A1D2E",color:"#4C4F6B",border:"1px solid #2D2F3E",borderRadius:100,padding:"10px",fontSize:"0.85rem",fontWeight:600,cursor:"pointer"}}>Batal</button>
                  <button onClick={addTx} className="btn-hover" style={{flex:2,background:"#7C6AF7",color:"white",border:"none",borderRadius:100,padding:"10px",fontSize:"0.85rem",fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>Simpan ✓</button>
                </div>
              </div>
            )}

            <div style={{background:"#13151F",border:"1px solid #1A1D2E",borderRadius:16,overflow:"hidden"}}>
              {data.transactions.length===0 ? (
                <div style={{textAlign:"center",padding:"40px",color:"#4C4F6B"}}>Belum ada transaksi</div>
              ) : data.transactions.map((t,i)=>(
                <div key={t.id} className="tx-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:i<data.transactions.length-1?"1px solid #1A1D2E":"none",transition:"background 0.2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:38,height:38,borderRadius:10,background:t.type==="income"?"rgba(16,185,129,0.12)":"rgba(239,68,68,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem"}}>
                      {t.cat.split(" ")[0]}
                    </div>
                    <div>
                      <div style={{fontSize:"0.88rem",fontWeight:600,color:"#C8D0E0"}}>{t.desc}</div>
                      <div style={{fontSize:"0.72rem",color:"#4C4F6B",marginTop:2}}>{t.cat} · {new Date(t.date).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{fontSize:"0.92rem",fontWeight:700,color:t.type==="income"?"#10B981":"#EF4444",textAlign:"right"}}>
                      {t.type==="income"?"+":"-"}{IDR(t.amount)}
                    </div>
                    <button onClick={()=>deleteTx(t.id)} style={{background:"rgba(239,68,68,0.1)",color:"#EF4444",border:"none",borderRadius:8,padding:"5px 9px",cursor:"pointer",fontSize:"0.8rem"}}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GOALS ── */}
        {tab==="Goals" && (
          <div style={{animation:"fadeUp 0.4s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1.1rem",fontWeight:800}}>Financial Goals 🎯</div>
              <button onClick={()=>setShowGoalForm(!showGoalForm)} className="btn-hover"
                style={{background:"#7C6AF7",color:"white",border:"none",borderRadius:100,padding:"10px 20px",fontSize:"0.85rem",fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>
                + Tambah Goal
              </button>
            </div>

            {showGoalForm && (
              <div style={{background:"#13151F",border:"1px solid #2D2F3E",borderRadius:16,padding:20,marginBottom:20,animation:"fadeUp 0.3s ease"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  {[
                    {label:"Nama Goal",key:"name",placeholder:"💻 Laptop Baru"},
                    {label:"Target (Rp)",key:"target",placeholder:"12000000",type:"number"},
                    {label:"Sudah Terkumpul (Rp)",key:"saved",placeholder:"0",type:"number"},
                    {label:"Deadline",key:"deadline",type:"date"},
                  ].map(f=>(
                    <div key={f.key}>
                      <label style={{fontSize:"0.72rem",fontWeight:600,color:"#4C4F6B",textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:6}}>{f.label}</label>
                      <input type={f.type||"text"} value={goalForm[f.key]} onChange={e=>setGoalForm({...goalForm,[f.key]:e.target.value})}
                        placeholder={f.placeholder||""}
                        style={{width:"100%",background:"#1A1D2E",border:"1px solid #2D2F3E",borderRadius:10,padding:"10px 12px",fontSize:"0.85rem",color:"#E2E8F0"}} />
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>setShowGoalForm(false)} style={{flex:1,background:"#1A1D2E",color:"#4C4F6B",border:"1px solid #2D2F3E",borderRadius:100,padding:"10px",fontSize:"0.85rem",fontWeight:600,cursor:"pointer"}}>Batal</button>
                  <button onClick={addGoal} className="btn-hover" style={{flex:2,background:"#7C6AF7",color:"white",border:"none",borderRadius:100,padding:"10px",fontSize:"0.85rem",fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>Tambah Goal ✓</button>
                </div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
              {data.goals.map(g=>{
                const pct = Math.round((g.saved/g.target)*100);
                const sisa = g.target-g.saved;
                const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline)-new Date())/(1000*60*60*24)) : null;
                const done = pct >= 100;
                return (
                  <div key={g.id} className="card-hover" style={{background:"#13151F",border:`1px solid ${done?"rgba(16,185,129,0.3)":"#1A1D2E"}`,borderRadius:16,padding:20,transition:"border-color 0.2s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1rem",fontWeight:800,color:"#E2E8F0"}}>{g.name}</div>
                      <button onClick={()=>deleteGoal(g.id)} style={{background:"transparent",border:"none",color:"#4C4F6B",cursor:"pointer",fontSize:"0.9rem"}}>✕</button>
                    </div>
                    <div style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{fontSize:"1.1rem",fontWeight:800,color:done?"#10B981":"#7C6AF7",fontFamily:"'Syne',sans-serif"}}>{IDR(g.saved)}</span>
                        <span style={{fontSize:"0.78rem",color:"#4C4F6B"}}>dari {IDR(g.target)}</span>
                      </div>
                      <div style={{background:"#1A1D2E",borderRadius:100,height:8,overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:100,width:pct+"%",background:done?"#10B981":"linear-gradient(90deg,#7C6AF7,#A78BFA)",transition:"width 0.5s ease"}} />
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                        <span style={{fontSize:"0.75rem",fontWeight:700,color:done?"#10B981":"#A78BFA"}}>{pct}%</span>
                        {daysLeft!==null && <span style={{fontSize:"0.72rem",color:daysLeft<30?"#EF4444":"#4C4F6B"}}>{daysLeft>0?`${daysLeft} hari lagi`:"⚠️ Lewat deadline"}</span>}
                      </div>
                    </div>
                    {!done && (
                      <div style={{borderTop:"1px solid #1A1D2E",paddingTop:12,display:"flex",gap:8}}>
                        <span style={{fontSize:"0.75rem",color:"#4C4F6B",alignSelf:"center"}}>Tambah:</span>
                        {[50000,100000,500000].map(amt=>(
                          <button key={amt} onClick={()=>addToGoal(g.id,amt)} className="btn-hover"
                            style={{flex:1,background:"rgba(124,106,247,0.1)",color:"#A78BFA",border:"1px solid rgba(124,106,247,0.2)",borderRadius:8,padding:"5px",fontSize:"0.7rem",fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}>
                            +{amt>=1000000?amt/1000000+"jt":amt/1000+"rb"}
                          </button>
                        ))}
                      </div>
                    )}
                    {done && <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:10,padding:"8px 12px",textAlign:"center",fontSize:"0.85rem",fontWeight:700,color:"#10B981"}}>🎉 Goal tercapai!</div>}
                    {!done && <div style={{marginTop:8,fontSize:"0.75rem",color:"#4C4F6B",textAlign:"right"}}>Sisa: {IDR(sisa)}</div>}
                  </div>
                );
              })}
              {data.goals.length===0 && (
                <div style={{gridColumn:"1/-1",textAlign:"center",padding:"40px",color:"#4C4F6B"}}>
                  <div style={{fontSize:"2rem",marginBottom:8}}>🎯</div>
                  <div>Belum ada goals. Yuk set target keuanganmu!</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AI ADVISOR ── */}
        {tab==="AI Advisor" && (
          <div style={{animation:"fadeUp 0.4s ease",height:"calc(100vh - 160px)",display:"flex",flexDirection:"column"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1.1rem",fontWeight:800,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,background:"linear-gradient(135deg,#7C6AF7,#A78BFA)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem"}}>✨</div>
              AI Financial Advisor
            </div>

            {/* Quick prompts */}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              {["Analisis pengeluaranku bulan ini","Tips hemat berdasarkan dataku","Berapa lama sampai goals tercapai?","Saran investasi untuk pemula"].map(p=>(
                <button key={p} onClick={()=>{setInput(p);}}
                  style={{background:"rgba(124,106,247,0.1)",border:"1px solid rgba(124,106,247,0.2)",color:"#A78BFA",borderRadius:100,padding:"6px 14px",fontSize:"0.75rem",fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}>
                  {p}
                </button>
              ))}
            </div>

            {/* Chat area */}
            <div style={{flex:1,overflowY:"auto",background:"#13151F",border:"1px solid #1A1D2E",borderRadius:16,padding:16,display:"flex",flexDirection:"column",gap:12,marginBottom:12}}>
              {chat.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",animation:"fadeUp 0.3s ease"}}>
                  {m.role==="assistant" && (
                    <div style={{width:28,height:28,background:"linear-gradient(135deg,#7C6AF7,#A78BFA)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8rem",flexShrink:0,marginRight:8,marginTop:2}}>✨</div>
                  )}
                  <div style={{
                    maxWidth:"80%",padding:"12px 16px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                    background:m.role==="user"?"#7C6AF7":"#1A1D2E",
                    color:m.role==="user"?"white":"#C8D0E0",
                    fontSize:"0.88rem",lineHeight:1.7
                  }} dangerouslySetInnerHTML={{__html:renderMd(m.content)}} />
                </div>
              ))}
              {aiLoading && (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,background:"linear-gradient(135deg,#7C6AF7,#A78BFA)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8rem"}}>✨</div>
                  <div style={{background:"#1A1D2E",borderRadius:"16px 16px 16px 4px",padding:"12px 16px",display:"flex",gap:4}}>
                    {[0,1,2].map(i=>(
                      <div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#7C6AF7",animation:"pulse 1.2s ease infinite",animationDelay:`${i*0.2}s`}} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{display:"flex",gap:10}}>
              <input value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}}}
                placeholder="Tanya tentang keuanganmu..."
                style={{flex:1,background:"#13151F",border:"1px solid #2D2F3E",borderRadius:12,padding:"12px 16px",fontSize:"0.88rem",color:"#E2E8F0"}} />
              <button onClick={sendChat} disabled={aiLoading}
                style={{background:aiLoading?"#2D2F3E":"#7C6AF7",color:"white",border:"none",borderRadius:12,padding:"12px 20px",fontSize:"0.88rem",fontWeight:700,cursor:aiLoading?"not-allowed":"pointer",transition:"all 0.2s",minWidth:70}}>
                {aiLoading?"...":"Kirim"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
