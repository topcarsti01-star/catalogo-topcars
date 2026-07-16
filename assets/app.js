/* TOP CARS — Catálogo · CSV público (Vitrina segura A:Y) */

/* ---------- 1. Config ---------- */
const DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS_L6f8slq3-5t7KRkYjy5qSwIbrm8kVklFR9os7-FFLFbvnjCg0jNOzsh8t0gWvFiMCISB5dy6s8NG/pub?gid=0&single=true&output=csv";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzEjzU-m4nZk7ZjvnWBaxG-wZ2AwjqSFCstb561ORAwbxZdYRHX-KJdtgGyg9fs0Mbd/exec";

const TITLE_BASE = "Top Cars — Catálogo";
const GENERAL  = { nombre: "Top Cars", tel: "595974867100" };
const ASESORES = {
  fede:     { nombre: "Federico Ojeda",    tel: "595981981151" },
  federico: { nombre: "Federico Ojeda",    tel: "595981981151" },
  esteban:  { nombre: "Esteban Parceriza", tel: "595981484985" },
  fredy:    { nombre: "Fredy Benítez",     tel: "595971237864" }
};
const COL = {
  marca: 1, modelo: 2, version: 3, anio: 4, km: 5, combustible: 6,
  transmision: 7, motor: 8, potencia_hp: 9, traccion: 10, carroceria: 11,
  color_ext: 12, color_int: 13, estado: 18, destacados: 20, fotos: 21,
  precio_lista: 22, moneda: 23, publicar_precio: 24
};
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const EAGER = 3;
const TV_MS = 6000;
const MET_KEY = "tc_metrics";

/* Los 3 asesores, para los selectores de contacto */
const EQUIPO = [
  { key: "fede",    nombre: "Federico Ojeda",    tel: "595981981151" },
  { key: "esteban", nombre: "Esteban Parceriza", tel: "595981484985" },
  { key: "fredy",   nombre: "Fredy Benítez",     tel: "595971237864" }
];

/* Qué significa cada eje del radar (tooltip) */
const RADAR_DESC = {
  "Potencia":   "Rendimiento del motor y aceleración, según los HP declarados.",
  "Confort":    "Comodidad de marcha y equipamiento, según carrocería y año.",
  "Tecnología": "Nivel de equipamiento electrónico y asistencias, según el año.",
  "Eficiencia": "Consumo estimado según tipo de combustible y potencia.",
  "Off-road":   "Aptitud fuera del asfalto, según tracción y carrocería.",
  "Espacio":    "Capacidad interior y de carga, según el tipo de carrocería."
};

/* ---------- 2. Estado ---------- */
let VEHICULOS = [], ASESOR = GENERAL, ASESOR_KEY = "";
let galIndex = 0, lazyIO = null, lazyBackstop = false;
let COMPARE = [], PAUSADOS = new Set(JSON.parse(localStorage.getItem("tc_pausados") || "[]"));
let GAL = [];   // fotos del vehículo abierto (carrusel + lightbox comparten índice)
let tvTimer = null, tvIdx = 0;

/* ---------- 3. Utils ---------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Glifo real de WhatsApp (relleno, con el auricular). Un contorno simple
   relleno se ve como una mancha, por eso usamos el path completo. */
const WA_PATH = "M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.8h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.82 9.82 0 016.99 2.9 9.83 9.83 0 012.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0012.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 005.69 1.45c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 00-3.48-8.41z";

const ICO = {
  anio:  `<svg class="ico" viewBox="0 0 24 24" width="14" height="14"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>`,
  km:    `<svg class="ico" viewBox="0 0 24 24" width="14" height="14"><path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-5"/><path d="M4 18h16"/></svg>`,
  fuel:  `<svg class="ico" viewBox="0 0 24 24" width="14" height="14"><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M3 21h12M7 8h6"/><path d="M14 10h3a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-2.5-2.5"/></svg>`,
  trans: `<svg class="ico" viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>`,
  wa:    `<svg class="ico-wa" viewBox="0 0 24 24" width="14" height="14"><path d="${WA_PATH}"/></svg>`
};

function parseCSV(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}
/* Devuelve la URL BASE (sin tamaño). El ancho se pide con sized(). */
function toImageUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/[-\w]{25,}/);
  if (s.includes("drive.google.com") && m) return `https://lh3.googleusercontent.com/d/${m[0]}`;
  return /^https?:\/\//.test(s) ? s : null;
}
/* Drive sirve la imagen ya redimensionada: pedimos sólo lo que se ve.
   Tarjetas 600px · ficha 1200px · lightbox/TV 1600px. */
const sized = (u, w) => (u && u.includes("lh3.googleusercontent.com")) ? `${u}=w${w}` : u;
const fotosList = (raw) => String(raw || "").split(",").map(toImageUrl).filter(Boolean);
const nombreAuto = (v) => `${v.marca} ${v.modelo} ${v.version} ${v.anio}`.replace(/\s+/g, " ").trim();
const slugify = (s) => String(s).toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------- 4. Precio ---------- */
const publica = (v) => ["si", "sí", "yes", "true"].includes(String(v.publicar_precio).trim().toLowerCase());
const precioNum = (v) => Number(String(v.precio_lista).replace(/[^\d]/g, "")) || 0;
const precioTexto = (v) => (publica(v) && String(v.precio_lista).trim())
  ? `${esc(v.moneda)} ${esc(v.precio_lista)}` : null;

/* ---------- 5. Asesor ---------- */
function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ""));
  const [slug = "", qs = ""] = raw.split("?");
  return { slug, params: new URLSearchParams(qs) };
}
function detectarAsesor() {
  const q = new URLSearchParams(location.search), h = parseHash().params;
  const k = (q.get("v") || q.get("vendedor") || h.get("v") || h.get("vendedor") || "").toLowerCase().trim();
  ASESOR_KEY = ASESORES[k] ? k : "";
  ASESOR = ASESORES[k] || GENERAL;
}
function renderAsesorBadge() {
  const el = $("#asesorBadge");
  if (!el) return;
  if (!ASESOR_KEY) { el.classList.remove("show"); el.innerHTML = ""; return; }
  el.innerHTML = `<span>Asesor asignado: <b>${esc(ASESOR.nombre)}</b></span>
    <button type="button" aria-label="Quitar asesor">&times;</button>`;
  el.querySelector("button").addEventListener("click", resetAsesor);
  el.classList.add("show");
}
function resetAsesor() {
  ASESOR = GENERAL; ASESOR_KEY = "";
  const { slug } = parseHash();
  history.replaceState(null, "", location.pathname + (slug ? "#" + slug : ""));
  renderAsesorBadge(); aplicarAsesor(); render();
  if (!$("#modal").classList.contains("hidden")) abrirDesdeHash();
  toast("Volviste al contacto general de Top Cars");
}
function aplicarAsesor() {
  // El flotante y el footer son el canal CORPORATIVO: siempre el número general.
  const g = `https://wa.me/${GENERAL.tel}`;
  const f = $("#fabWa"); if (f) f.href = g;
  const b = $(".footer-btn.wa"); if (b) b.href = g;
}
/* Selector de asesor reutilizable (ficha y agenda) */
function pickerHTML(id) {
  return `<div class="picker" id="${id}">
      <p class="picker-t">¿Con quién querés hablar?</p>
      <div class="picker-row">
        ${EQUIPO.map((a) => `<button type="button" class="picker-b" data-tel="${a.tel}" data-nom="${esc(a.nombre)}">
            ${ICO.wa}<span>${esc(a.nombre.split(" ")[0])}</span></button>`).join("")}
      </div></div>`;
}

/* ---------- 6. WhatsApp + métricas ---------- */
function waUrl(v, texto) {
  return `https://wa.me/${ASESOR.tel}?text=` + encodeURIComponent(texto.replace("{auto}", nombreAuto(v)));
}
function postScript(data) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.startsWith("TU_")) return Promise.resolve(false);
  return fetch(GOOGLE_SCRIPT_URL, {
    method: "POST", mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(data)
  }).then(() => true).catch(() => false);
}
function track(evento, v) {
  const modelo = v ? nombreAuto(v) : "";
  const m = JSON.parse(localStorage.getItem(MET_KEY) || "{}");
  const k = `${evento}|${modelo}`;
  m[k] = (m[k] || 0) + 1;
  localStorage.setItem(MET_KEY, JSON.stringify(m));
  postScript({ tipo: "metric", evento, slug: v?._slug || "", modelo, asesor: ASESOR_KEY || "general", ts: Date.now() });
}

/* ---------- 7. Enlaces + título ---------- */
const fichaUrl = (v) => `${location.origin}${location.pathname}#${v._slug}${ASESOR_KEY ? "?v=" + ASESOR_KEY : ""}`;
const setTitulo = (v) => { document.title = v ? `${nombreAuto(v)} · Top Cars` : TITLE_BASE; };

/* ---------- 8. Perfil ---------- */
const clamp = (n) => Math.max(1, Math.min(10, Math.round(n * 10) / 10));
function perfil(v) {
  const hp = +String(v.potencia_hp).replace(/\D/g, "") || 0;
  const anio = +v.anio || 2018;
  const carr = (v.carroceria || "").toLowerCase(), trac = (v.traccion || "").toLowerCase(), comb = (v.combustible || "").toLowerCase();
  const es = (t) => carr.includes(t);
  const vals = [
    clamp(hp ? hp / 45 : 5),
    clamp((es("sed") ? 8 : es("coup") ? 6.5 : es("pick") ? 6 : es("cabri") ? 6.5 : 8) + (anio - 2020) * 0.2),
    clamp(5 + (anio - 2018) * 0.75),
    clamp((/éc|elec/.test(comb) ? 10 : /íb|hib/.test(comb) ? 9 : /ié|die/.test(comb) ? 7 : 5.5) - hp / 180),
    clamp((trac.includes("4x4") ? 8.5 : /integral|quattro|xdrive|awd/.test(trac) ? 6 : 2.5) + (es("pick") ? 1.5 : es("suv") ? 0.8 : -1)),
    clamp(es("pick") ? 8.5 : es("suv") ? 8.5 : es("sed") ? 6.5 : es("coup") ? 4 : es("cabri") ? 3 : 6.5)
  ];
  const labels = ["Potencia", "Confort", "Tecnología", "Eficiencia", "Off-road", "Espacio"];
  const uso = vals[4] >= 7 ? "Aventura y trabajo" : vals[0] >= 8 ? "Deportivo y performance"
            : vals[5] >= 8 ? "Familiar y viajes" : vals[3] >= 8 ? "Ciudad y eficiencia" : "Uso ejecutivo diario";
  return { vals, labels, uso };
}

/* ---------- 9. Toast ---------- */
let toastT;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------- 10. Carga ---------- */
async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = parseCSV(await res.text());
    rows.shift();
    VEHICULOS = rows.filter((r) => r.length > COL.marca && String(r[COL.marca]).trim() !== "")
      .map((r, i) => {
        const o = { _i: i };
        for (const k in COL) o[k] = String(r[COL[k]] ?? "").trim();
        return o;
      });
    const u = {};
    VEHICULOS.forEach((v) => {
      let s = slugify(`${v.marca}-${v.modelo}-${v.version}`) || "auto";
      if (u[s]) s += "-" + (++u[s]); else u[s] = 1;
      v._slug = s;
    });
  } catch (e) {
    $("#grid").innerHTML = `<p style="color:var(--muted)">No se pudo cargar el catálogo (${esc(e.message)}).</p>`;
    return;
  }
  poblarFiltros(); bindEventos(); render(); abrirDesdeHash();
}
function abrirDesdeHash() {
  const { slug } = parseHash();
  if (!slug) { cerrarModal(); return; }
  const v = VEHICULOS.find((x) => x._slug === slug);
  if (v) abrirModal(v._i);
}
window.addEventListener("hashchange", () => {
  detectarAsesor(); renderAsesorBadge(); aplicarAsesor(); abrirDesdeHash();
});
function poblarFiltros() {
  const uniq = (k) => [...new Set(VEHICULOS.map((v) => v[k]).filter(Boolean))].sort();
  uniq("marca").forEach((m) => addOption("#filterMarca", m));
  uniq("carroceria").forEach((t) => addOption("#filterCarroceria", t));
}
function addOption(sel, val) {
  const o = document.createElement("option");
  o.value = val; o.textContent = val;
  $(sel).appendChild(o);
}
function bindEventos() {
  ["#searchInput", "#filterMarca", "#filterCarroceria", "#filterEstado", "#orderBy"]
    .forEach((s) => $(s).addEventListener("input", render));
  $("#modal").addEventListener("click", (e) => {
    const nav = e.target.closest("[data-gal]");
    if (nav) { setGal(galIndex + Number(nav.dataset.gal)); return; }
    const dot = e.target.closest("[data-dot]");
    if (dot) { setGal(Number(dot.dataset.dot)); return; }
    if (e.target.classList.contains("gal-img")) { abrirLightbox(); return; }
    if (e.target.dataset.close !== undefined || e.target.classList.contains("modal-backdrop")) cerrarModal();
  });

  // Lightbox: flechas, cerrar y swipe táctil
  const lb = $("#lightbox");
  lb.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lb]");
    if (!b) { if (e.target === lb) cerrarLightbox(); return; }
    if (b.dataset.lb === "close") cerrarLightbox();
    else setGal(galIndex + Number(b.dataset.lb));
  });
  let sx = null;
  lb.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 50) setGal(galIndex + (dx < 0 ? 1 : -1));
  }, { passive: true });
  $("#stockPanelModal").addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined || e.target.classList.contains("modal-backdrop")) cerrarStock();
  });
  $("#compareModal").addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined || e.target.classList.contains("modal-backdrop")) cerrarComparador();
  });
  document.addEventListener("keydown", (e) => {
    const lbAbierto = !$("#lightbox").classList.contains("hidden");
    if (e.key === "Escape") {
      if (lbAbierto) { cerrarLightbox(); return; }   // el lightbox se cierra primero
      cerrarModal(); cerrarStock(); cerrarComparador(); if (tvTimer) tvStop();
    }
    if (!lbAbierto && $("#modal").classList.contains("hidden")) return;
    if (e.key === "ArrowLeft") setGal(galIndex - 1);
    if (e.key === "ArrowRight") setGal(galIndex + 1);
  });
}

/* ---------- 11. Lazy loading ---------- */
function alCargar(img) {
  if (img.complete && img.naturalWidth > 1) { img.classList.add("is-loaded"); return; }
  img.addEventListener("load", function () { if (this.naturalWidth > 1) this.classList.add("is-loaded"); });
}
function revelar(img) {
  if (!img || !img.dataset.src) return;
  const real = img.dataset.src;
  img.removeAttribute("data-src"); img.classList.remove("lazy");
  alCargar(img); img.src = real;
}
function cargarVisibles() {
  $$("img.lazy[data-src]").forEach((img) => {
    const r = img.getBoundingClientRect();
    if (r.top < window.innerHeight + 250 && r.bottom > -250) revelar(img);
  });
}
function initLazy() {
  $$("img.card-img:not(.lazy)").forEach(alCargar);
  if (lazyIO) lazyIO.disconnect();
  const dif = $$("img.lazy[data-src]");
  if (!dif.length) return;
  if ("IntersectionObserver" in window) {
    lazyIO = new IntersectionObserver((es, obs) => {
      es.forEach((e) => { if (e.isIntersecting) { revelar(e.target); obs.unobserve(e.target); } });
    }, { rootMargin: "250px 0px", threshold: 0.01 });
    dif.forEach((i) => lazyIO.observe(i));
  }
  if (!lazyBackstop) {
    lazyBackstop = true;
    window.addEventListener("scroll", cargarVisibles, { passive: true });
    window.addEventListener("resize", cargarVisibles, { passive: true });
  }
  cargarVisibles();
}

/* ---------- 12. Grilla ---------- */
const visibles = () => VEHICULOS.filter((v) => !PAUSADOS.has(v._slug));

function render() {
  const q = $("#searchInput").value.trim().toLowerCase();
  const fM = $("#filterMarca").value, fT = $("#filterCarroceria").value, fE = $("#filterEstado").value;
  let out = visibles().filter((v) => {
    if (fE === "activos" && v.estado === "Vendido") return false;
    if (["Disponible", "Reservado"].includes(fE) && v.estado !== fE) return false;
    if (fM && v.marca !== fM) return false;
    if (fT && v.carroceria !== fT) return false;
    if (q && !`${v.marca} ${v.modelo} ${v.version}`.toLowerCase().includes(q)) return false;
    return true;
  });
  out = ordenar(out, $("#orderBy").value);

  $("#grid").innerHTML = out.map((v, n) => cardHTML(v, n)).join("");
  out.forEach((v) => $("#card-" + v._i)?.addEventListener("click", () => abrirModal(v._i)));
  $$("#grid .btn-consultar").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    track("consultar_precio", VEHICULOS.find((x) => x._slug === b.dataset.slug));
  }));
  // El label envuelve al checkbox: hay que frenar el burbujeo en AMBOS,
  // si no el clic llega a la tarjeta y abre la ficha por error.
  $$("#grid .cmp-lbl").forEach((l) => l.addEventListener("click", (e) => e.stopPropagation()));
  $$("#grid .cmp-check").forEach((c) => {
    c.addEventListener("click", (e) => e.stopPropagation());
    c.addEventListener("change", (e) => toggleCompare(e.target.dataset.slug, e.target.checked));
  });
  initLazy(); renderCompareBar();

  $("#emptyState").classList.toggle("hidden", out.length > 0);
  const n = out.length;
  $("#headerCount").textContent = n === 1 ? "1 vehículo encontrado" : `${n} vehículos encontrados`;
}
function ordenar(arr, orden) {
  const c = [...arr], km = (v) => +String(v.km).replace(/\D/g, "") || Infinity;
  switch (orden) {
    case "precio-asc": return c.sort((a, b) => (precioNum(a) || Infinity) - (precioNum(b) || Infinity));
    case "precio-desc": return c.sort((a, b) => precioNum(b) - precioNum(a));
    case "km-asc": return c.sort((a, b) => km(a) - km(b));
    case "anio-desc": return c.sort((a, b) => (+b.anio || 0) - (+a.anio || 0));
    default: return c;
  }
}
function cardHTML(v, pos) {
  const foto = sized(fotosList(v.fotos)[0], 600), alt = `${esc(v.marca)} ${esc(v.modelo)}`;
  let media;
  if (!foto) media = `<div class="card-media no-img">SIN FOTO</div>`;
  else if (pos < EAGER) media = `<div class="card-media"><img class="card-img" src="${esc(foto)}" alt="${alt}" fetchpriority="high" loading="eager" decoding="async" referrerpolicy="no-referrer"></div>`;
  else media = `<div class="card-media"><img class="card-img lazy" src="${PIXEL}" data-src="${esc(foto)}" alt="${alt}" fetchpriority="low" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>`;

  const est = (v.estado || "").toLowerCase();
  const badge = v.estado ? `<span class="badge ${esc(est)}">${esc(v.estado)}</span>` : "";
  const chk = COMPARE.includes(v._slug);
  const cmp = `<label class="cmp-lbl" title="Comparar">
      <input type="checkbox" class="cmp-check" data-slug="${esc(v._slug)}" ${chk ? "checked" : ""}><span>Comparar</span></label>`;
  const specs = [
    v.anio && `<span>${ICO.anio}${esc(v.anio)}</span>`,
    v.km && `<span>${ICO.km}${esc(v.km)} km</span>`,
    v.combustible && `<span>${ICO.fuel}${esc(v.combustible)}</span>`,
    v.transmision && `<span>${ICO.trans}${esc(v.transmision)}</span>`
  ].filter(Boolean).join("");
  const p = precioTexto(v);
  const precio = p ? `<span class="price-value">${p}</span>`
    : `<a class="btn-consultar" data-slug="${esc(v._slug)}" href="${waUrl(v, "Hola, quisiera consultar el precio del {auto} que vi en el catálogo.")}" target="_blank" rel="noopener">${ICO.wa}Consultar</a>`;

  return `<article class="card ${v.estado === "Vendido" ? "is-sold" : ""}" id="card-${v._i}">
      <div class="card-media-wrap">${media}${badge}${cmp}</div>
      <div class="card-body">
        <h3 class="card-title">${esc(v.marca)} ${esc(v.modelo)}</h3>
        <p class="card-sub">${esc(v.version)}</p>
        <div class="card-specs">${specs}</div>
        <div class="card-price">${precio}</div>
      </div>
    </article>`;
}

/* ---------- 13. Galería ---------- */
function galeriaHTML(fotos, alt) {
  if (!fotos.length) return "";
  const imgs = fotos.map((f, i) => `<img class="gal-img${i === 0 ? " active" : ""}" src="${esc(sized(f, 1200))}" alt="${esc(alt)}" loading="${i === 0 ? "eager" : "lazy"}" decoding="async" referrerpolicy="no-referrer">`).join("");
  const nav = fotos.length > 1 ? `<button class="gal-nav prev" data-gal="-1" aria-label="Anterior">&lsaquo;</button>
      <button class="gal-nav next" data-gal="1" aria-label="Siguiente">&rsaquo;</button>
      <div class="gal-dots">${fotos.map((_, i) => `<span class="gal-dot${i === 0 ? " active" : ""}" data-dot="${i}"></span>`).join("")}</div>` : "";
  return `<div class="gallery">${imgs}${nav}</div>`;
}
/* Índice único: lo comparten el carrusel de la ficha y el lightbox */
function setGal(i) {
  const total = GAL.length || $$(".gal-img").length;
  if (!total) return;
  galIndex = (i + total) % total;
  $$(".gal-img").forEach((im, n) => im.classList.toggle("active", n === galIndex));
  $$(".gal-dot").forEach((d, n) => d.classList.toggle("active", n === galIndex));
  if (!$("#lightbox").classList.contains("hidden")) pintarLb();
}
function pintarLb() {
  if (!GAL.length) return;
  $("#lbImg").src = sized(GAL[galIndex], 1600);
  $("#lbCount").textContent = `${galIndex + 1} / ${GAL.length}`;
}
function abrirLightbox() {
  if (!GAL.length) return;
  pintarLb();
  $("#lightbox").classList.remove("hidden");
}
function cerrarLightbox() { $("#lightbox").classList.add("hidden"); }

/* ---------- 14. Radar (viewBox 220x200, tope 220px) ---------- */
function radarSVG(v, cls = "") {
  const { vals, labels } = perfil(v);
  const cx = 110, cy = 100, R = 52, n = 6;
  const pt = (i, r) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const poly = (r) => [...Array(n)].map((_, i) => pt(i, r).map((x) => x.toFixed(1)).join(",")).join(" ");
  const rings = [0.25, 0.5, 0.75, 1].map((f) => `<polygon class="grid-poly" points="${poly(R * f)}"/>`).join("");
  const axes = [...Array(n)].map((_, i) => { const [x, y] = pt(i, R); return `<line class="axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join("");
  const shape = vals.map((val, i) => pt(i, (R * val) / 10).map((x) => x.toFixed(1)).join(",")).join(" ");
  const vtx = vals.map((val, i) => { const [x, y] = pt(i, (R * val) / 10); return `<circle class="vtx" data-eje="${labels[i]}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"></circle>`; }).join("");
  const lbls = labels.map((l, i) => {
    const [x, y] = pt(i, R + 26);            // más aire: las etiquetas ya no se encinan
    const an = Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end";
    return `<g class="lbl-g" data-eje="${l}">
      <text class="lbl" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${an}" dy="2">${l}</text>
      <text class="val" x="${x.toFixed(1)}" y="${(y + 11).toFixed(1)}" text-anchor="${an}">${vals[i]}</text></g>`;
  }).join("");
  return `<svg class="radar ${cls}" viewBox="0 0 220 210" width="220" height="210" role="img" aria-label="Radar de cualidades">
      ${rings}${axes}<polygon class="shape" points="${shape}"/>${vtx}${lbls}</svg>`;
}
/* Tooltip: explica el eje al pasar el mouse o tocarlo */
function bindRadar(scope) {
  const box = scope.querySelector(".radar-tip");
  if (!box) return;
  const mostrar = (eje) => {
    if (!eje) return;
    box.innerHTML = `<b>${esc(eje)}</b> ${esc(RADAR_DESC[eje] || "")}`;
    box.classList.add("show");
  };
  scope.querySelectorAll("[data-eje]").forEach((el) => {
    el.addEventListener("mouseenter", () => mostrar(el.dataset.eje));
    el.addEventListener("click", () => mostrar(el.dataset.eje));
  });
  scope.querySelectorAll(".rl-item[data-eje]").forEach((el) => {
    el.addEventListener("mouseenter", () => mostrar(el.dataset.eje));
  });
}
function radarHTML(v) {
  const { vals, labels, uso } = perfil(v);
  const legend = labels.map((l, i) => `<div class="rl-item" data-eje="${l}"><span class="rl-name">${l}</span>
      <span class="rl-bar"><i class="rl-fill" style="width:${vals[i] * 10}%"></i></span>
      <span class="rl-num">${vals[i]}</span></div>`).join("");
  return `<section class="radar-wrap">
      <div class="radar-head"><h3>Perfil del vehículo</h3><span class="radar-note">Estimado según ficha técnica</span></div>
      <div class="radar-box">${radarSVG(v)}
        <div class="radar-legend">${legend}<span class="perfil-tag">Ideal para: ${uso}</span></div>
      </div>
      <p class="radar-tip">Pasá el mouse por un atributo para ver qué significa.</p>
    </section>`;
}

/* ---------- 15. Ficha de fábrica ---------- */
const FICHA = (v) => [
  ["Motor", v.motor], ["Potencia", v.potencia_hp], ["Transmisión", v.transmision],
  ["Tracción", v.traccion], ["Combustible", v.combustible], ["Año", v.anio],
  ["Kilometraje", v.km && v.km + " km"], ["Carrocería", v.carroceria],
  ["Color exterior", v.color_ext], ["Color interior", v.color_int], ["Estado", v.estado]
].filter(([, x]) => x && String(x).trim() !== "");

function specsExtendedHTML(v) {
  const f = FICHA(v);
  if (!f.length) return "";
  return `<section class="modal-specs-extended">
      <div class="radar-head"><h3>Ficha técnica de fábrica</h3></div>
      <dl class="specs-table">${f.map(([k, x]) => `<div class="specs-row"><dt>${esc(k)}</dt><dd>${esc(x)}</dd></div>`).join("")}</dl>
    </section>`;
}

/* ---------- 16. Compartir / QR / Print ---------- */
async function compartirFicha(v) {
  const url = fichaUrl(v);
  try { await navigator.clipboard.writeText(url); toast("🔗 Enlace copiado al portapapeles"); }
  catch {
    const t = document.createElement("textarea");
    t.value = url; document.body.appendChild(t); t.select();
    document.execCommand("copy"); t.remove(); toast("🔗 Enlace copiado");
  }
}
function toggleQR(v) {
  const p = $("#qrPanel");
  if (p.classList.contains("open")) { p.classList.remove("open"); return; }
  if (typeof qrcode !== "function") { toast("No se pudo cargar el generador de QR"); return; }
  const qr = qrcode(0, "M"); qr.addData(fichaUrl(v)); qr.make();
  $("#qrBox").innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  p.classList.add("open"); p.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function imprimir(html) { $("#printArea").innerHTML = html; window.print(); }
window.addEventListener("afterprint", () => { $("#printArea").innerHTML = ""; });

function fichaPDF(v) {
  const foto = sized(fotosList(v.fotos)[0], 1200), p = precioTexto(v);
  const specs = FICHA(v).map(([k, x]) => `<div class="p-spec"><div class="k">${esc(k)}</div><div class="v">${esc(x)}</div></div>`).join("");
  imprimir(`<div class="p-doc">
      <div class="p-head"><div class="p-brand">TOP<em>CARS</em></div>
        <div class="p-date">Ficha técnica · ${new Date().toLocaleDateString("es-PY")}</div></div>
      ${foto ? `<img class="p-photo" src="${esc(foto)}" alt="${esc(nombreAuto(v))}">` : ""}
      <div class="p-title">${esc(v.marca)} ${esc(v.modelo)}</div>
      <div class="p-sub">${esc(v.version)}</div>
      <div class="p-price">${p || "Consultar precio"}</div>
      <div class="p-specs">${specs}</div>
      ${v.destacados ? `<p class="p-desc">${esc(v.destacados)}</p>` : ""}
      <div class="p-foot"><b>Top Cars</b> · Haladas S.A. · Emeterio Miranda 189 esq. Guido Spano, Asunción<br>
        ${ASESOR !== GENERAL ? esc(ASESOR.nombre) + " · " : ""}+${ASESOR.tel} · topcars.com.py · @topcars_py</div>
    </div>`);
}
function qrPDF(v) {
  if (typeof qrcode !== "function") { toast("No se pudo cargar el generador de QR"); return; }
  const qr = qrcode(0, "M"); qr.addData(fichaUrl(v)); qr.make();
  imprimir(`<div class="p-doc p-qr"><div class="qr-frame">
      <div class="qr-brand">TOP<em>CARS</em></div>
      <div class="qr-box">${qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true })}</div>
      <div class="qr-model">${esc(v.marca)} ${esc(v.modelo)}</div>
      <div class="qr-cta">Escaneá para ver la ficha completa</div></div></div>`);
}

/* ---------- 17. Agenda ---------- */
const agendaHTML = () => `<div class="agenda-panel" id="agendaPanel">
    <form class="agenda-form" id="agendaForm">
      <input name="nombre" type="text" placeholder="Nombre completo" required autocomplete="name">
      <input name="tel" type="tel" placeholder="Teléfono" required autocomplete="tel">
      <div class="agenda-row"><label>Fecha<input name="fecha" type="date" required></label>
        <label>Hora<input name="hora" type="time" required></label></div>
      <label class="agenda-sel">Agendar con
        <select name="asesor">${EQUIPO.map((a, i) =>
          `<option value="${a.tel}" data-nom="${esc(a.nombre)}"${(ASESOR_KEY === a.key || (!ASESOR_KEY && i === 0)) ? " selected" : ""}>${esc(a.nombre)}</option>`).join("")}</select>
      </label>
      <button class="btn-wa" type="submit">🏎️ Enviar solicitud por WhatsApp</button>
    </form></div>`;

function toggleAgenda(v) {
  const p = $("#agendaPanel");
  p.classList.toggle("open");
  if (!p.classList.contains("open")) return;
  p.scrollIntoView({ behavior: "smooth", block: "nearest" });
  const form = $("#agendaForm");
  if (form.dataset.bound) return;
  form.dataset.bound = "1";
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(form), fecha = f.get("fecha");
    const sel = form.asesor.selectedOptions[0];
    const tel = f.get("asesor"), nom = sel ? sel.dataset.nom : GENERAL.nombre;
    const ft = fecha ? new Date(fecha + "T00:00").toLocaleDateString("es-PY") : "";
    const msg = `¡Hola ${nom}! Me llamo ${f.get("nombre")} (Tel: ${f.get("tel")}) y me gustaría agendar una visita para ver el ${nombreAuto(v)} el día ${ft} a las ${f.get("hora")} hs. ¿Me confirmás disponibilidad?`;
    track("agendar_visita", v);
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, "_blank");
    toast("🏎️ Abriendo WhatsApp con tu solicitud…");
  });
}

/* ---------- 18. Modal ficha ---------- */
function abrirModal(i) {
  const v = VEHICULOS.find((x) => x._i === i);
  if (!v) return;
  const p = precioTexto(v);
  const precio = p ? `<div class="modal-price">${p}</div>` : `<div class="modal-price consult">Consultar</div>`;
  const wa = waUrl(v, "Hola, estoy interesado en el {auto} que vi en el catálogo. ¿Sigue disponible?");

  GAL = fotosList(v.fotos);
  $("#modalCard").innerHTML = `<button class="modal-close" data-close>&times;</button>
    ${galeriaHTML(GAL, `${v.marca} ${v.modelo}`)}
    <div class="modal-content">
      <h2 class="modal-title">${esc(v.marca)} ${esc(v.modelo)}</h2>
      <p class="modal-sub">${esc(v.version)}${v.estado ? " · " + esc(v.estado) : ""}</p>
      ${precio}
      ${v.destacados ? `<p class="modal-desc">${esc(v.destacados)}</p>` : ""}
      ${radarHTML(v)}${specsExtendedHTML(v)}
      <div class="modal-actions">
        <button class="btn-wa" data-act="wa" type="button">Consultar por WhatsApp</button>
        ${pickerHTML("waPicker")}
        <button class="btn-agenda" data-act="agenda">🏎️ Agendar visita / Test Drive</button>
        <div class="actions-row">
          <button class="btn-ghost" data-act="share"><svg viewBox="0 0 24 24" width="15" height="15"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>Compartir</button>
          <button class="btn-ghost" data-act="qr"><svg viewBox="0 0 24 24" width="15" height="15"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 19h2v2h-2"/></svg>QR</button>
          <button class="btn-ghost" data-act="pdf"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 12v6M9 15l3 3 3-3"/></svg>PDF</button>
        </div>
      </div>
      ${agendaHTML()}
      <div class="qr-panel" id="qrPanel">
        <div class="qr-frame"><div class="qr-brand">TOP<em>CARS</em></div>
          <div class="qr-box" id="qrBox"></div>
          <div class="qr-model">${esc(v.marca)} ${esc(v.modelo)}</div>
          <div class="qr-cta">Escaneá para ver la ficha completa</div></div>
        <button class="btn-ghost qr-print" data-act="qrprint">Imprimir QR para parabrisas</button>
      </div>
    </div>`;

  const acc = {
    wa: () => $("#waPicker").classList.toggle("open"),
    share: () => compartirFicha(v), qr: () => toggleQR(v),
    pdf: () => fichaPDF(v), qrprint: () => qrPDF(v), agenda: () => toggleAgenda(v)
  };
  $$("#modalCard [data-act]").forEach((b) => b.addEventListener("click", () => acc[b.dataset.act]()));

  // Selector de asesor del botón "Consultar"
  $$("#waPicker .picker-b").forEach((b) => b.addEventListener("click", () => {
    track("consultar_wa", v);
    const msg = `Hola ${b.dataset.nom}, estoy interesado en el ${nombreAuto(v)} que vi en el catálogo. ¿Sigue disponible?`;
    window.open(`https://wa.me/${b.dataset.tel}?text=${encodeURIComponent(msg)}`, "_blank");
  }));
  bindRadar($("#modalCard"));

  galIndex = 0;
  history.replaceState(null, "", "#" + v._slug + (ASESOR_KEY ? "?v=" + ASESOR_KEY : ""));
  setTitulo(v);
  $("#modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function cerrarModal() {
  $("#modal").classList.add("hidden");
  document.body.style.overflow = "";
  history.replaceState(null, "", location.pathname + (ASESOR_KEY ? "?v=" + ASESOR_KEY : ""));
  setTitulo(null);
}

/* ---------- 19. Comparador ---------- */
function toggleCompare(slug, on) {
  if (on) {
    if (COMPARE.length >= 2) {
      toast("Podés comparar hasta 2 vehículos");
      const c = $(`.cmp-check[data-slug="${slug}"]`); if (c) c.checked = false;
      return;
    }
    COMPARE.push(slug);
  } else COMPARE = COMPARE.filter((s) => s !== slug);
  renderCompareBar();
  if (COMPARE.length === 2) abrirComparador();
}
function renderCompareBar() {
  const bar = $("#compareBar");
  if (!bar) return;
  if (!COMPARE.length) { bar.classList.remove("show"); bar.innerHTML = ""; return; }
  const nombres = COMPARE.map((s) => {
    const v = VEHICULOS.find((x) => x._slug === s);
    return v ? `${v.marca} ${v.modelo}` : s;
  });
  bar.innerHTML = `<span>${nombres.map(esc).join(" vs ")}</span>
    <button type="button" data-cmp="open" ${COMPARE.length < 2 ? "disabled" : ""}>Comparar</button>
    <button type="button" data-cmp="clear" aria-label="Limpiar">&times;</button>`;
  bar.querySelector('[data-cmp="open"]').addEventListener("click", abrirComparador);
  bar.querySelector('[data-cmp="clear"]').addEventListener("click", limpiarCompare);
  bar.classList.add("show");
}
function limpiarCompare() { COMPARE = []; render(); cerrarComparador(); }

function abrirComparador() {
  if (COMPARE.length !== 2) { toast("Elegí 2 vehículos para comparar"); return; }
  const [a, b] = COMPARE.map((s) => VEHICULOS.find((x) => x._slug === s));
  if (!a || !b) return;
  const keys = [...new Set([...FICHA(a).map(([k]) => k), ...FICHA(b).map(([k]) => k)])];
  const get = (v, k) => (FICHA(v).find(([kk]) => kk === k) || [, "—"])[1];
  const head = (v) => {
    const f = sized(fotosList(v.fotos)[0], 600), p = precioTexto(v);
    return `<div class="cmp-head">
        ${f ? `<img src="${esc(f)}" alt="${esc(nombreAuto(v))}" referrerpolicy="no-referrer">` : `<div class="card-media no-img">SIN FOTO</div>`}
        <h3>${esc(v.marca)} ${esc(v.modelo)}</h3>
        <p>${esc(v.version)}</p>
        <div class="cmp-price">${p || "Consultar"}</div></div>`;
  };
  $("#compareCard").innerHTML = `<button class="modal-close" data-close>&times;</button>
    <div class="modal-content">
      <h2 class="modal-title">Comparador</h2>
      <p class="modal-sub">${esc(nombreAuto(a))} vs ${esc(nombreAuto(b))}</p>
      <div class="cmp-grid">${head(a)}${head(b)}</div>
      <div class="radar-head"><h3>Perfil comparado</h3><span class="radar-note">Estimado según ficha técnica</span></div>
      <div class="cmp-grid cmp-radars">
        <div class="cmp-radar">${radarSVG(a)}<span class="perfil-tag">${perfil(a).uso}</span></div>
        <div class="cmp-radar">${radarSVG(b, "alt")}<span class="perfil-tag">${perfil(b).uso}</span></div>
      </div>
      <div class="radar-head"><h3>Ficha técnica</h3></div>
      <table class="cmp-table"><tbody>
        ${keys.map((k) => {
          const va = get(a, k), vb = get(b, k);
          return `<tr><td>${esc(va)}</td><th>${esc(k)}</th><td>${esc(vb)}</td></tr>`;
        }).join("")}
      </tbody></table>
    </div>`;
  $("#compareModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function cerrarComparador() {
  $("#compareModal").classList.add("hidden");
  if ($("#modal").classList.contains("hidden")) document.body.style.overflow = "";
}

/* ---------- 20. Modo TV ---------- */
function tvSlide(v) {
  const f = sized(fotosList(v.fotos)[0], 1600), p = precioTexto(v);
  const specs = FICHA(v).slice(0, 6).map(([k, x]) => `<div class="tv-spec"><span>${esc(k)}</span><b>${esc(x)}</b></div>`).join("");
  return `<div class="tv-slide">
      <div class="tv-media" style="--tv-bg:url('${esc(f || "")}')">
        ${f ? `<img class="tv-img" src="${esc(f)}" alt="${esc(nombreAuto(v))}" referrerpolicy="no-referrer">` : ""}
      </div>
      <div class="tv-info">
        <div class="tv-brand">TOP<em>CARS</em></div>
        <h2>${esc(v.marca)} ${esc(v.modelo)}</h2>
        <p class="tv-ver">${esc(v.version)} · ${esc(v.anio)}</p>
        <div class="tv-price">${p || "Consultar precio"}</div>
        <div class="tv-specs">${specs}</div>
      </div></div>`;
}
function tvRender() {
  const list = visibles().filter((v) => v.estado !== "Vendido");
  if (!list.length) return;
  tvIdx = (tvIdx + list.length) % list.length;
  const stage = $("#tvStage");
  stage.innerHTML = tvSlide(list[tvIdx]);
  stage.querySelector(".tv-slide")?.classList.add("in");
}
function tvStart() {
  document.body.classList.add("tv-mode");
  $("#tvLayer").classList.remove("hidden");
  document.documentElement.requestFullscreen?.().catch(() => {});
  tvIdx = 0; tvRender();
  clearInterval(tvTimer);
  tvTimer = setInterval(() => { tvIdx++; tvRender(); }, TV_MS);
}
function tvStop() {
  clearInterval(tvTimer); tvTimer = null;
  document.body.classList.remove("tv-mode");
  $("#tvLayer").classList.add("hidden");
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

/* ---------- 21. Panel admin ---------- */
function metricasHTML() {
  const m = JSON.parse(localStorage.getItem(MET_KEY) || "{}");
  const filas = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!filas.length) return `<p class="adm-empty">Todavía no hay clics registrados en este dispositivo.</p>`;
  const max = filas[0][1];
  return filas.map(([k, n]) => {
    const [ev, mod] = k.split("|");
    return `<div class="rl-item"><span class="rl-name">${esc(mod || "—")}<i>${esc(ev)}</i></span>
      <span class="rl-bar"><i class="rl-fill" style="width:${Math.round((n / max) * 100)}%"></i></span>
      <span class="rl-num">${n}</span></div>`;
  }).join("");
}
function abrirStock() {
  const total = VEHICULOS.length, cnt = (f) => VEHICULOS.filter(f).length;
  const disp = cnt((v) => v.estado === "Disponible"), resv = cnt((v) => v.estado === "Reservado"), vend = cnt((v) => v.estado === "Vendido");
  const fuelOf = (v) => { const c = (v.combustible || "").toLowerCase();
    if (/elec|éc|hib|íb/.test(c)) return "Híbrido / Eléctrico";
    if (/die|ié/.test(c)) return "Diésel";
    if (/nafta|gasol/.test(c)) return "Nafta";
    return "Otro"; };
  const fuel = {}; VEHICULOS.forEach((v) => { const f = fuelOf(v); fuel[f] = (fuel[f] || 0) + 1; });
  const marcas = {}; VEHICULOS.forEach((v) => { if (v.marca) marcas[v.marca] = (marcas[v.marca] || 0) + 1; });
  const top3 = Object.entries(marcas).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const pct = (n) => total ? Math.round((n / total) * 100) : 0;
  const barra = (l, n, c = "") => `<div class="rl-item"><span class="rl-name">${esc(l)}</span>
      <span class="rl-bar"><i class="rl-fill ${c}" style="width:${pct(n)}%"></i></span><span class="rl-num">${n}</span></div>`;

  const opts = VEHICULOS.map((v) => `<option value="${esc(v._slug)}">${esc(nombreAuto(v))} — ${esc(v.estado)}</option>`).join("");

  $("#stockPanelCard").innerHTML = `<button class="modal-close" data-close>&times;</button>
    <div class="modal-content">
      <h2 class="modal-title">Panel interno</h2>
      <p class="modal-sub">Uso interno · ${new Date().toLocaleDateString("es-PY")}</p>

      <div class="stock-kpis">
        <div class="kpi"><b>${total}</b><span>Unidades</span></div>
        <div class="kpi"><b>${disp}</b><span>Disponibles</span></div>
        <div class="kpi"><b>${resv}</b><span>Reservados</span></div>
        <div class="kpi"><b>${vend}</b><span>Vendidos</span></div>
      </div>

      <div class="radar-head"><h3>Editor de stock</h3></div>
      <form class="adm-form" id="admForm">
        <select name="slug" required>${opts}</select>
        <select name="estado" required>
          <option value="Disponible">Disponible</option>
          <option value="Reservado">Reservado</option>
          <option value="Vendido">Vendido</option>
        </select>
        <label class="adm-chk"><input type="checkbox" name="pausar"> Pausar visibilidad en la web</label>
        <button class="btn-wa" type="submit">Guardar cambio</button>
        <p class="adm-warn">⚠️ El cambio va a Google Sheets vía Apps Script. El catálogo público lo refleja en unos minutos (caché del CSV).</p>
      </form>

      <div class="radar-head"><h3>Clics registrados</h3><span class="radar-note">Local a este dispositivo</span></div>
      <div class="radar-legend">${metricasHTML()}</div>

      <div class="radar-head"><h3>Disponibles vs Reservados</h3></div>
      <div class="radar-legend">${barra("Disponibles", disp)}${barra("Reservados", resv, "warn")}</div>

      <div class="radar-head"><h3>Mix de combustible</h3></div>
      <div class="radar-legend">${Object.entries(fuel).sort((a, b) => b[1] - a[1]).map(([k, n]) => barra(k, n)).join("")}</div>

      <div class="radar-head"><h3>Top 3 marcas en stock</h3></div>
      <div class="radar-legend">${top3.map(([m, n]) => barra(m, n)).join("")}</div>
    </div>`;

  $("#admForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const slug = f.get("slug"), estado = f.get("estado"), pausar = f.get("pausar") === "on";
    const v = VEHICULOS.find((x) => x._slug === slug);
    if (!v) return;
    if (pausar) PAUSADOS.add(slug); else PAUSADOS.delete(slug);
    localStorage.setItem("tc_pausados", JSON.stringify([...PAUSADOS]));
    v.estado = estado;
    const ok = await postScript({ tipo: "stock", slug, modelo: nombreAuto(v), estado, pausado: pausar, ts: Date.now() });
    render();
    toast(ok ? "✅ Cambio enviado a Google Sheets" : "Guardado local. Configurá GOOGLE_SCRIPT_URL para sincronizar.");
  });

  $("#stockPanelModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function cerrarStock() {
  $("#stockPanelModal").classList.add("hidden");
  if ($("#modal").classList.contains("hidden")) document.body.style.overflow = "";
}

/* ---------- 22. UI ---------- */
/* ---------- Acceso discreto al panel interno ---------- */
function setAdmin(on) {
  document.body.classList.toggle("admin-on", on);
  sessionStorage.setItem("tc_admin", on ? "1" : "0");
  toast(on ? "🔐 Panel interno visible" : "Panel interno oculto");
}
const adminOn = () => document.body.classList.contains("admin-on");

function initAdminGate() {
  if (sessionStorage.getItem("tc_admin") === "1") document.body.classList.add("admin-on");
  // Ctrl + Shift + A
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
      e.preventDefault(); setAdmin(!adminOn());
    }
  });
  // 5 clics rápidos sobre el logo (ventana de 800 ms entre clics)
  let n = 0, t;
  $("#brandHome")?.addEventListener("click", () => {
    n++; clearTimeout(t);
    t = setTimeout(() => { n = 0; }, 800);
    if (n >= 5) { n = 0; setAdmin(!adminOn()); }
  });
}

function initUI() {
  detectarAsesor(); renderAsesorBadge(); aplicarAsesor(); initAdminGate();
  $("#brandHome")?.addEventListener("click", (e) => { e.preventDefault(); resetFiltros(); });
  $("#btnStock")?.addEventListener("click", abrirStock);
  $("#btnTv")?.addEventListener("click", tvStart);
  $("#tvExit")?.addEventListener("click", tvStop);
  $("#tvPrev")?.addEventListener("click", () => { tvIdx--; tvRender(); });
  $("#tvNext")?.addEventListener("click", () => { tvIdx++; tvRender(); });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && tvTimer) tvStop(); });

  const fabs = [$("#toTop"), $("#fabWa")].filter(Boolean);
  const onScroll = () => { const s = window.scrollY > 300; fabs.forEach((f) => f.classList.toggle("is-visible", s)); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  $("#toTop")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  const bg = $("#bgLayer");
  let idle;
  const move = (x, y) => {
    const nx = x / window.innerWidth, ny = y / window.innerHeight;
    bg.style.setProperty("--mx", nx * 100 + "%");
    bg.style.setProperty("--my", ny * 100 + "%");
    bg.style.setProperty("--px", (nx - 0.5) * 2);
    bg.style.setProperty("--py", (ny - 0.5) * 2);
    document.body.classList.add("pointer-active");
    clearTimeout(idle);
    idle = setTimeout(() => document.body.classList.remove("pointer-active"), 1200);
  };
  window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY), { passive: true });
  window.addEventListener("touchmove", (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY); }, { passive: true });
}
function resetFiltros() {
  $("#searchInput").value = "";
  $("#filterMarca").value = "";
  $("#filterCarroceria").value = "";
  $("#filterEstado").value = "activos";
  $("#orderBy").value = "recientes";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

initUI();
init();
