import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "To Go — Nunca mais esqueça onde queria ir" },
      { name: "description", content: "Salve restaurantes, organize por listas, veja no mapa e compartilhe com quem você ama." },
      { property: "og:title", content: "To Go — Nunca mais esqueça onde queria ir" },
      { property: "og:description", content: "Salve restaurantes, organize por listas, veja no mapa e compartilhe com quem você ama." },
    ],
  }),
  component: LandingPage,
});

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');

  .lp-root {
    font-family: 'DM Sans', sans-serif;
    background: #f5f0e8;
    color: #1a1a18;
    overflow-x: hidden;
  }

  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 48px;
    background: rgba(245,240,232,0.96);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid #e0d8cc;
  }
  .lp-nav-logo {
    font-family: 'Playfair Display', serif;
    font-size: 22px; font-weight: 700; color: #1a1a18;
    text-decoration: none; cursor: pointer; background: none; border: none;
  }
  .lp-nav-logo span { color: #c4844a; }
  .lp-nav-actions { display: flex; align-items: center; gap: 12px; }
  .lp-nav-login {
    background: transparent; color: #1a1a18;
    border: 1.5px solid #e0d8cc; padding: 9px 20px; border-radius: 100px;
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
    cursor: pointer; transition: border-color .2s, background .2s;
  }
  .lp-nav-login:hover { border-color: #c4844a; background: #fdf5ed; }
  .lp-nav-btn {
    background: #1a1a18; color: #fff;
    border: none; padding: 10px 24px; border-radius: 100px;
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
    cursor: pointer; transition: background .2s, transform .15s;
  }
  .lp-nav-btn:hover { background: #c4844a; transform: translateY(-1px); }

  .lp-hero-wrap { background: #f5f0e8; padding-top: 80px; }
  .lp-hero {
    max-width: 1160px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr;
    align-items: center; gap: 60px;
    padding: 80px 48px 100px;
  }
  .lp-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: #fdf5ed; border: 1px solid #f0d8be;
    border-radius: 100px; padding: 6px 14px;
    font-size: 13px; font-weight: 500; color: #c4844a;
    margin-bottom: 24px;
  }
  .lp-h1 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(38px, 5vw, 58px);
    font-weight: 700; line-height: 1.1;
    color: #1a1a18; letter-spacing: -1px;
    margin-bottom: 20px;
  }
  .lp-h1 em { color: #c4844a; font-style: italic; }
  .lp-sub {
    font-size: 18px; color: #5a5a54;
    line-height: 1.6; margin-bottom: 36px; max-width: 460px;
  }
  .lp-btns { display: flex; gap: 14px; flex-wrap: wrap; }
  .lp-btn-primary {
    background: #c4844a; color: #fff;
    padding: 14px 28px; border-radius: 100px;
    font-size: 16px; font-weight: 500; border: none;
    cursor: pointer; transition: background .2s, transform .15s;
    font-family: 'DM Sans', sans-serif;
  }
  .lp-btn-primary:hover { background: #b5753e; transform: translateY(-2px); }
  .lp-btn-secondary {
    background: transparent; color: #1a1a18;
    padding: 14px 28px; border-radius: 100px;
    font-size: 16px; font-weight: 500;
    border: 1.5px solid #e0d8cc; cursor: pointer;
    transition: border-color .2s, background .2s;
    font-family: 'DM Sans', sans-serif;
    text-decoration: none; display: inline-flex; align-items: center;
  }
  .lp-btn-secondary:hover { border-color: #c4844a; background: #fdf5ed; }
  .lp-stats {
    display: flex; gap: 32px; margin-top: 48px;
    padding-top: 32px; border-top: 1px solid #e0d8cc;
  }
  .lp-stat-num {
    font-family: 'Playfair Display', serif;
    font-size: 28px; font-weight: 700; color: #c4844a;
  }
  .lp-stat-label { font-size: 13px; color: #5a5a54; margin-top: 2px; }

  .lp-visual { position: relative; display: flex; justify-content: center; }
  .lp-blob {
    position: absolute; border-radius: 50%; filter: blur(60px); opacity: .35; z-index: 1;
  }
  .lp-blob-1 { width: 300px; height: 300px; background: #e8a870; top: -40px; right: -40px; }
  .lp-blob-2 { width: 200px; height: 200px; background: #a8c49a; bottom: 20px; left: -20px; }
  .lp-phone {
    width: 260px; background: #fff; border-radius: 36px;
    box-shadow: 0 40px 80px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.06);
    overflow: hidden; position: relative; z-index: 2;
  }
  .lp-phone-bar {
    background: #f5f0e8; padding: 16px 20px 10px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .lp-phone-title { font-family:'Playfair Display',serif; font-size:15px; font-weight:700; }
  .lp-phone-add {
    width: 28px; height: 28px; background: #c4844a;
    border-radius: 50%; display: flex; align-items: center;
    justify-content: center; color: #fff; font-size: 18px; line-height: 1;
  }
  .lp-phone-list { padding: 8px 12px 16px; background: #f5f0e8; }
  .lp-phone-card {
    background: #fff; border-radius: 14px; padding: 12px 14px; margin-bottom: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,.06);
    display: flex; align-items: center; gap: 10px;
  }
  .lp-pc-icon { font-size: 22px; }
  .lp-pc-name { font-size: 13px; font-weight: 600; color: #1a1a18; }
  .lp-pc-loc  { font-size: 11px; color: #5a5a54; margin-top: 2px; }
  .lp-pc-tag  {
    margin-left: auto; font-size: 10px; font-weight: 500;
    padding: 3px 8px; border-radius: 100px; white-space: nowrap;
  }
  .tag-want  { background: #fef3e2; color: #c4844a; }
  .tag-visit { background: #e8f4ea; color: #4a8c55; }
  .tag-fav   { background: #fce8e8; color: #c44a4a; }
  .lp-float {
    position: absolute; z-index: 3; background: #fff; border-radius: 14px;
    padding: 10px 14px; box-shadow: 0 8px 24px rgba(0,0,0,.12); font-size: 12px;
  }
  .lp-float-left  { left: -50px; top: 35%; }
  .lp-float-right { right: -55px; bottom: 28%; }
  .lp-fc-label { font-size: 10px; color: #5a5a54; margin-bottom: 2px; }
  .lp-fc-val   { font-weight: 600; color: #1a1a18; }

  .lp-problem-wrap { background: #1a1a18; }
  .lp-problem { max-width: 1160px; margin: 0 auto; padding: 90px 48px; }
  .lp-problem .lp-sec-eye { color: #e8a870; }
  .lp-problem h2 { color: #fff; margin-bottom: 16px; }
  .lp-problem > p { color: #aaa; font-size: 17px; line-height: 1.7; max-width: 560px; margin-bottom: 56px; }
  .lp-p-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
  .lp-p-card {
    background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
    border-radius: 20px; padding: 28px 24px;
    display: flex; gap: 16px; align-items: flex-start;
  }
  .lp-p-icon  { font-size: 28px; flex-shrink: 0; }
  .lp-p-title { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 6px; }
  .lp-p-desc  { font-size: 13px; color: #888; line-height: 1.5; }

  .lp-feat-wrap { background: #f5f0e8; }
  .lp-feat { max-width: 1160px; margin: 0 auto; padding: 90px 48px; }
  .lp-feat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 48px; }
  .lp-feat-card {
    background: #fff; border-radius: 20px; padding: 28px 24px;
    border: 1px solid #e0d8cc;
    transition: transform .2s, box-shadow .2s;
  }
  .lp-feat-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,.08); }
  .lp-feat-card.wide { grid-column: span 2; }
  .lp-feat-emoji { font-size: 32px; margin-bottom: 16px; }
  .lp-feat-title { font-family:'Playfair Display',serif; font-size:18px; font-weight:700; margin-bottom:8px; }
  .lp-feat-desc  { font-size: 14px; color: #5a5a54; line-height: 1.6; }

  .lp-how-wrap { background: #ede9df; }
  .lp-how { max-width: 900px; margin: 0 auto; padding: 90px 48px; text-align: center; }
  .lp-how h2 { margin-bottom: 56px; }
  .lp-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 40px; }
  .lp-step { position: relative; }
  .lp-step-num {
    width: 48px; height: 48px; border-radius: 50%;
    background: #c4844a; color: #fff;
    font-family:'Playfair Display',serif; font-size:20px; font-weight:700;
    display: flex; align-items:center; justify-content:center;
    margin: 0 auto 20px;
  }
  .lp-step-title { font-size:16px; font-weight:600; margin-bottom:8px; }
  .lp-step-desc  { font-size:14px; color:#5a5a54; line-height:1.6; }
  .lp-step-arrow { position:absolute; top:24px; right:-20px; font-size:20px; color:#e8a870; }

  .lp-testi-wrap { background: #fff; }
  .lp-testi { max-width: 1160px; margin: 0 auto; padding: 90px 48px; }
  .lp-testi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-top: 48px; }
  .lp-t-card {
    background: #f5f0e8; border-radius: 20px; padding: 28px 24px;
    border: 1px solid #e0d8cc;
  }
  .lp-t-quote { font-size: 36px; color: #c4844a; line-height: 1; margin-bottom: 12px; font-family:'Playfair Display',serif; }
  .lp-t-text  { font-size: 14px; color: #5a5a54; line-height: 1.7; margin-bottom: 20px; }
  .lp-t-author { display: flex; align-items:center; gap:12px; }
  .lp-t-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: #fdf5ed; font-size: 20px;
    display: flex; align-items:center; justify-content:center;
  }
  .lp-t-name { font-size:14px; font-weight:600; }
  .lp-t-role { font-size:12px; color:#5a5a54; }

  .lp-price-wrap { background: #ede9df; }
  .lp-price { max-width: 800px; margin: 0 auto; padding: 90px 48px; text-align: center; }
  .lp-price h2 { margin-bottom: 48px; }
  .lp-price-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; text-align:left; }
  .lp-price-card {
    background: #fff; border-radius: 24px; padding: 36px 32px;
    border: 1px solid #e0d8cc;
  }
  .lp-price-card.pro { background: #1a1a18; border-color: #1a1a18; }
  .lp-price-plan { font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:#c4844a; margin-bottom:16px; }
  .lp-price-card.pro .lp-price-plan { color: #e8a870; }
  .lp-price-val {
    font-family:'Playfair Display',serif;
    font-size:48px; font-weight:700; color:#1a1a18; line-height:1;
  }
  .lp-price-card.pro .lp-price-val { color: #fff; }
  .lp-price-per { font-size:14px; color:#5a5a54; margin-bottom:28px; margin-top:4px; }
  .lp-price-card.pro .lp-price-per { color: #888; }
  .lp-price-feats { list-style:none; margin-bottom:32px; padding: 0; }
  .lp-price-feats li {
    font-size:14px; color:#5a5a54; padding: 8px 0;
    border-bottom: 1px solid #e0d8cc;
    display:flex; align-items:center; gap:8px;
  }
  .lp-price-feats li::before { content:'✓'; color:#c4844a; font-weight:700; }
  .lp-price-card.pro .lp-price-feats li { color:#ccc; border-color: rgba(255,255,255,.1); }
  .lp-price-card.pro .lp-price-feats li::before { color:#e8a870; }
  .lp-price-btn {
    display:block; text-align:center; text-decoration:none;
    padding:14px; border-radius:100px; font-size:15px; font-weight:600;
    cursor:pointer; border:none; width:100%;
    font-family: 'DM Sans', sans-serif;
    transition: background .2s, transform .15s;
  }
  .lp-price-btn-f { background: #f5f0e8; color:#1a1a18; border: 1.5px solid #e0d8cc; }
  .lp-price-btn-f:hover { border-color:#c4844a; background:#fdf5ed; }
  .lp-price-btn-p { background: #c4844a; color:#fff; }
  .lp-price-btn-p:hover { background:#b5753e; transform:translateY(-1px); }

  .lp-cta-wrap { background: #c4844a; }
  .lp-cta { max-width: 700px; margin: 0 auto; padding: 90px 48px; text-align:center; }
  .lp-cta h2 { font-family:'Playfair Display',serif; font-size:clamp(32px,5vw,50px); color:#fff; margin-bottom:16px; }
  .lp-cta h2 em { font-style:italic; }
  .lp-cta p { color:rgba(255,255,255,.85); font-size:18px; line-height:1.6; margin-bottom:36px; }
  .lp-cta-btn {
    display:inline-block; background:#fff; color:#c4844a;
    padding:16px 36px; border-radius:100px;
    font-size:17px; font-weight:700; border:none; cursor:pointer;
    font-family: 'DM Sans', sans-serif;
    transition:transform .2s, box-shadow .2s;
  }
  .lp-cta-btn:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(0,0,0,.15); }
  .lp-cta-note { margin-top:16px; font-size:13px; color:rgba(255,255,255,.65); }

  .lp-footer {
    background: #1a1a18; padding: 40px 48px;
    display: flex; align-items:center; justify-content:space-between;
    flex-wrap: wrap; gap: 16px;
  }
  .lp-foot-logo { font-family:'Playfair Display',serif; font-size:20px; font-weight:700; color:#fff; }
  .lp-foot-logo span { color:#e8a870; }
  .lp-foot-copy { font-size:13px; color:#666; }
  .lp-foot-links { display:flex; gap:24px; }
  .lp-foot-links a { font-size:13px; color:#888; text-decoration:none; cursor:pointer; }
  .lp-foot-links a:hover { color:#fff; }

  .lp-sec-eye {
    font-size:13px; font-weight:600; text-transform:uppercase;
    letter-spacing:1.5px; color:#c4844a; margin-bottom:12px;
  }
  .lp-h2 {
    font-family:'Playfair Display',serif;
    font-size:clamp(30px,4vw,44px); font-weight:700;
    line-height:1.15; letter-spacing:-.5px; color:#1a1a18;
  }
  .lp-h2 em { font-style:italic; color:#c4844a; }

  .lp-reveal {
    opacity:0; transform:translateY(24px);
    transition:opacity .55s ease, transform .55s ease;
  }
  .lp-reveal.lp-in { opacity:1; transform:none; }

  @media (max-width: 768px) {
    .lp-nav { padding: 16px 20px; }
    .lp-hero { grid-template-columns:1fr; padding:60px 20px 80px; gap:40px; }
    .lp-visual { display:none; }
    .lp-stats { gap:20px; flex-wrap:wrap; }
    .lp-problem { padding:60px 20px; }
    .lp-p-cards { grid-template-columns:1fr; }
    .lp-feat { padding:60px 20px; }
    .lp-feat-grid { grid-template-columns:1fr; }
    .lp-feat-card.wide { grid-column:span 1; }
    .lp-how { padding:60px 20px; }
    .lp-steps { grid-template-columns:1fr; gap:32px; }
    .lp-step-arrow { display:none; }
    .lp-testi { padding:60px 20px; }
    .lp-testi-grid { grid-template-columns:1fr; }
    .lp-price { padding:60px 20px; }
    .lp-price-cards { grid-template-columns:1fr; }
    .lp-cta { padding:60px 20px; }
    .lp-footer { flex-direction:column; align-items:flex-start; padding:32px 20px; }
    .lp-float { display:none; }
  }
`;

function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const revealRef = useRef<IntersectionObserver | null>(null);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate({ to: "/dashboard", search: { list: undefined } });
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.getElementById("lp-styles")) {
      const styleEl = document.createElement("style");
      styleEl.id = "lp-styles";
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    }

    revealRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add("lp-in");
            }, i * 80);
            revealRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    document.querySelectorAll(".lp-reveal").forEach((el) => {
      revealRef.current?.observe(el);
    });

    return () => {
      revealRef.current?.disconnect();
      document.getElementById("lp-styles")?.remove();
    };
  }, []);

  const goToLogin = () => navigate({ to: "/login" });
  const goToSignup = () => navigate({ to: "/login" });
  const goToPricing = () => navigate({ to: "/pricing" });

  return (
    <div className="lp-root">
      <nav className="lp-nav">
        <button className="lp-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          To <span>Go</span>
        </button>
        <div className="lp-nav-actions">
          <button className="lp-nav-login" onClick={goToLogin}>Entrar</button>
          <button className="lp-nav-btn" onClick={goToSignup}>Começar grátis →</button>
        </div>
      </nav>

      <div className="lp-hero-wrap">
        <div className="lp-hero">
          <div>
            <div className="lp-eyebrow lp-reveal">🍽️ Lista pessoal de restaurantes</div>
            <h1 className="lp-h1 lp-reveal">
              Nunca mais esqueça <em>onde queria ir</em>
            </h1>
            <p className="lp-sub lp-reveal">
              Salve restaurantes, organize por listas, veja no mapa e compartilhe com quem você ama. Simples assim.
            </p>
            <div className="lp-btns lp-reveal">
              <button className="lp-btn-primary" onClick={goToSignup}>Criar minha lista grátis</button>
              <a className="lp-btn-secondary" href="#features">Ver como funciona</a>
            </div>
            <div className="lp-stats lp-reveal">
              <div>
                <div className="lp-stat-num">20+</div>
                <div className="lp-stat-label">restaurantes no free</div>
              </div>
              <div>
                <div className="lp-stat-num">∞</div>
                <div className="lp-stat-label">no plano Pro</div>
              </div>
              <div>
                <div className="lp-stat-num">R$0</div>
                <div className="lp-stat-label">para começar</div>
              </div>
            </div>
          </div>

          <div className="lp-visual lp-reveal">
            <div className="lp-blob lp-blob-1" />
            <div className="lp-blob lp-blob-2" />
            <div className="lp-float lp-float-left">
              <div className="lp-fc-label">Adicionado agora</div>
              <div className="lp-fc-val">🍣 Kappou</div>
            </div>
            <div className="lp-phone">
              <div className="lp-phone-bar">
                <span className="lp-phone-title">To Go</span>
                <span className="lp-phone-add">+</span>
              </div>
              <div className="lp-phone-list">
                {[
                  { icon: "🍝", name: "Fasano", loc: "Jardins", tag: "❤️ Fav", cls: "tag-fav" },
                  { icon: "🍣", name: "Kappou", loc: "Pinheiros", tag: "Quero ir", cls: "tag-want" },
                  { icon: "🥩", name: "Cora", loc: "Higienópolis", tag: "✓ Visitei", cls: "tag-visit" },
                  { icon: "🍜", name: "Lotte", loc: "Jung-gu · Coreia do Sul", tag: "Quero ir", cls: "tag-want" },
                ].map((r) => (
                  <div className="lp-phone-card" key={r.name}>
                    <span className="lp-pc-icon">{r.icon}</span>
                    <div>
                      <div className="lp-pc-name">{r.name}</div>
                      <div className="lp-pc-loc">{r.loc}</div>
                    </div>
                    <span className={`lp-pc-tag ${r.cls}`}>{r.tag}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lp-float lp-float-right">
              <div className="lp-fc-label">Lista compartilhada</div>
              <div className="lp-fc-val">📍 SP Favoritos</div>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-problem-wrap">
        <div className="lp-problem">
          <div className="lp-sec-eye lp-reveal">O problema</div>
          <h2 className="lp-h2 lp-reveal" style={{ color: "#fff" }}>
            Você esquece <em>onde queria ir</em>
          </h2>
          <p className="lp-reveal">
            Recebeu uma indicação incrível, salvou nos favoritos do Maps, anotou no bloco de notas… e sumiu. Acontece com todo mundo. O To Go resolve isso de vez.
          </p>
          <div className="lp-p-cards">
            {[
              { icon: "😵", title: "Indicações se perdem", desc: "Você ouve sobre um lugar incrível e esquece o nome em horas." },
              { icon: "🗂️", title: "Salvo em mil lugares", desc: "Favoritos do Maps, stories, notas, WhatsApp. Espalhado por tudo." },
              { icon: "🤷", title: '"Onde a gente vai hoje?"', desc: "Na hora de decidir, você não lembra de nenhum dos lugares que queria ir." },
            ].map((p) => (
              <div className="lp-p-card lp-reveal" key={p.title}>
                <div className="lp-p-icon">{p.icon}</div>
                <div>
                  <div className="lp-p-title">{p.title}</div>
                  <div className="lp-p-desc">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-feat-wrap" id="features">
        <div className="lp-feat">
          <div className="lp-sec-eye lp-reveal">Funcionalidades</div>
          <h2 className="lp-h2 lp-reveal">
            Tudo que você precisa para <em>nunca esquecer</em>
          </h2>
          <div className="lp-feat-grid">
            <div className="lp-feat-card wide lp-reveal">
              <div className="lp-feat-emoji">🗺️</div>
              <div className="lp-feat-title">Veja tudo no mapa</div>
              <div className="lp-feat-desc">Visualize todos os seus restaurantes no mapa e descubra quais estão perto de você agora. Perfeito para planejar o próximo passeio.</div>
            </div>
            {[
              { emoji: "📋", title: "Listas organizadas", desc: 'Crie listas para "Quero ir", "Favoritos", "Viagem SP" — o que fizer sentido pra você.' },
              { emoji: "✅", title: "Marcar como visitado", desc: "Registre que foi ao restaurante e acompanhe seu histórico de descobertas gastronômicas." },
              { emoji: "🔗", title: "Compartilhar via link", desc: "Mande sua lista para amigos ou receba a deles. Sem precisar baixar nada." },
              { emoji: "🌍", title: "Internacionais", desc: "Restaurantes fora do Brasil aparecem com país e cidade — perfeito para quem viaja." },
              { emoji: "🏷️", title: "Tags personalizadas", desc: 'Adicione tags como "romântico", "vegano", "vista incrível" e filtre por elas.' },
            ].map((f) => (
              <div className="lp-feat-card lp-reveal" key={f.title}>
                <div className="lp-feat-emoji">{f.emoji}</div>
                <div className="lp-feat-title">{f.title}</div>
                <div className="lp-feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-how-wrap">
        <div className="lp-how">
          <div className="lp-sec-eye lp-reveal">Como funciona</div>
          <h2 className="lp-h2 lp-reveal">
            Três passos e sua lista <em>está pronta</em>
          </h2>
          <div className="lp-steps">
            {[
              { n: "1", title: "Crie sua conta", desc: "Acesse mytogo.app e cadastre-se em segundos. Sem cartão de crédito.", arrow: true },
              { n: "2", title: "Salve restaurantes", desc: "Adicione os lugares que você quer conhecer ou já amou. Nome, bairro, categoria e notas.", arrow: true },
              { n: "3", title: "Organize e explore", desc: "Filtre por lista, veja no mapa, compartilhe com amigos. Sua vida gastronômica organizada.", arrow: false },
            ].map((s) => (
              <div className="lp-step lp-reveal" key={s.n}>
                <div className="lp-step-num">{s.n}</div>
                <div className="lp-step-title">{s.title}</div>
                <div className="lp-step-desc">{s.desc}</div>
                {s.arrow && <div className="lp-step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-testi-wrap">
        <div className="lp-testi">
          <div className="lp-sec-eye lp-reveal">Depoimentos</div>
          <h2 className="lp-h2 lp-reveal">Quem já usa <em>não abre mão</em></h2>
          <div className="lp-testi-grid">
            {[
              { text: "Finalmente um lugar só para os meus restaurantes. Antes eu perdia indicação toda semana — agora salvo na hora e nunca mais esqueço.", name: "Ana R.", role: "Usuária Free · São Paulo", av: "👩‍🦱" },
              { text: "O To Go virou parte do meu dia a dia de foodie. As listas por cidade me ajudaram demais nas últimas viagens.", name: "Marília S.", role: "Usuária Pro · São Paulo", av: "👩" },
              { text: 'Criei uma lista "Restaurantes do Rio" antes de viajar, compartilhei com minha namorada e chegamos lá já sabendo o roteiro. Perfeito.', name: "Pedro F.", role: "Usuário Pro · Rio de Janeiro", av: "🧑" },
            ].map((t) => (
              <div className="lp-t-card lp-reveal" key={t.name}>
                <div className="lp-t-quote">"</div>
                <div className="lp-t-text">{t.text}</div>
                <div className="lp-t-author">
                  <div className="lp-t-avatar">{t.av}</div>
                  <div>
                    <div className="lp-t-name">{t.name}</div>
                    <div className="lp-t-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-price-wrap">
        <div className="lp-price">
          <div className="lp-sec-eye lp-reveal">Planos</div>
          <h2 className="lp-h2 lp-reveal">
            Comece grátis, <em>faça upgrade</em> quando quiser
          </h2>
          <div className="lp-price-cards">
            <div className="lp-price-card lp-reveal">
              <div className="lp-price-plan">Free</div>
              <div className="lp-price-val">R$0</div>
              <div className="lp-price-per">para sempre</div>
              <ul className="lp-price-feats">
                {["Até 20 restaurantes", "3 listas", "Visualização no mapa", "Marcar como visitado", "Compartilhar via link"].map((f) => <li key={f}>{f}</li>)}
              </ul>
              <button className="lp-price-btn lp-price-btn-f" onClick={goToSignup}>Começar grátis</button>
            </div>
            <div className="lp-price-card pro lp-reveal">
              <div className="lp-price-plan">Pro</div>
              <div className="lp-price-val">R$12</div>
              <div className="lp-price-per">/mês · ou R$89/ano</div>
              <ul className="lp-price-feats">
                {["Restaurantes ilimitados", "Listas ilimitadas", "Fotos, notas e tags", "Filtros avançados", "Exportar lista em PDF", "Listas colaborativas", "Restaurantes internacionais"].map((f) => <li key={f}>{f}</li>)}
              </ul>
              <button className="lp-price-btn lp-price-btn-p" onClick={goToPricing}>Assinar Pro →</button>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-cta-wrap">
        <div className="lp-cta lp-reveal">
          <h2>Sua lista começa <em>agora</em></h2>
          <p>Chega de esquecer onde queria ir. Junte-se a quem já organiza sua vida gastronômica com o To Go.</p>
          <button className="lp-cta-btn" onClick={goToSignup}>Criar minha conta grátis →</button>
          <div className="lp-cta-note">Sem cartão de crédito · Upgrade quando quiser</div>
        </div>
      </div>

      <footer className="lp-footer">
        <div className="lp-foot-logo">To <span>Go</span></div>
        <div className="lp-foot-copy">© 2026 John Charles Long · To Go</div>
        <div className="lp-foot-links">
          <a onClick={() => navigate({ to: "/privacy" })}>Privacidade</a>
          <a onClick={() => navigate({ to: "/terms" })}>Termos</a>
          <a onClick={goToLogin}>Entrar</a>
        </div>
      </footer>
    </div>
  );
}
