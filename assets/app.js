/* TOP CARS — Catálogo · consumo del CSV público (Vitrina segura) */

const DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS_L6f8slq3-5t7KRkYjy5qSwIbrm8kVklFR9os7-FFLFbvnjCg0jNOzsh8t0gWvFiMCISB5dy6s8NG/pub?gid=0&single=true&output=csv";
const WHATSAPP = "595974867100";

const COL = {
  marca: 1, modelo: 2, version: 3, anio: 4, km: 5, combustible: 6,
  transmision: 7, motor: 8, potencia_hp: 9, traccion: 10, carroceria: 11,
  color_ext: 12, color_int: 13, estado: 18, destacados: 20, fotos: 21,
  precio_lista: 22, moneda: 23, publicar_precio: 24
};

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let VEHICULOS = [];

/* ---- CSV parser (comillas, comas y saltos internos) ---- */
function parseCSV(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* ---- Google Drive → URL de imagen directa ---- */
function toImageUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/[-\w]{25,}/);
  if (s.includes("drive.google.com") && m) return `https://lh3.googleusercontent.com/d/${m[0]}`;
  return /^https?:\/\//.test(s) ? s : null;
}
const fotosList = (raw) => String(raw || "").split(",").map(toImageUrl).filter(Boolean);

/* ---- precio ---- */
const publica = (v) => ["si", "sí", "yes", "true"].includes(String(v.publicar_precio).trim().toLowerCase());
const precioNum = (v) => Number(String(v.precio_lista).replace(/[^\d]/g, "")) || 0;
const precioTexto = (v) =>
  (publica(v) && String(v.precio_lista).trim()) ? `${esc(v.moneda)} ${esc(v.precio_lista)}` : null;

/* ---- carga ---- */
async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = parseCSV(await res.text());
    rows.shift();
    VEHICULOS = rows
      .filter((r) => r.length > COL.marca && String(r[COL.marca]).trim() !== "")
      .map((r, i) => {
        const o = { _i: i };
        for (const k in COL) o[k] = String(r[COL[k]] ?? "").trim();
        return o;
      });
  } catch (e) {
    $("#grid").innerHTML =
      `<p style="color:var(--muted)">No se pudo cargar el catálogo (${esc(e.message)}).</p>`;
    return;
  }
  poblarFiltros();
  bindEventos();
  render();
}

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
    if (e.target.dataset.close !== undefined || e.target.classList.contains("modal-backdrop")) cerrarModal();
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && cerrarModal());
}

/* ---- render ---- */
function render() {
  const q = $("#searchInput").value.trim().toLowerCase();
  const fMarca = $("#filterMarca").value;
  const fTipo = $("#filterCarroceria").value;
  const fEstado = $("#filterEstado").value;

  let out = VEHICULOS.filter((v) => {
    if (fEstado === "activos" && v.estado === "Vendido") return false;
    if (["Disponible", "Reservado"].includes(fEstado) && v.estado !== fEstado) return false;
    if (fMarca && v.marca !== fMarca) return false;
    if (fTipo && v.carroceria !== fTipo) return false;
    if (q && !`${v.marca} ${v.modelo} ${v.version}`.toLowerCase().includes(q)) return false;
    return true;
  });
  out = ordenar(out, $("#orderBy").value);

  $("#grid").innerHTML = out.map(cardHTML).join("");
  out.forEach((v) => $("#card-" + v._i)?.addEventListener("click", () => abrirModal(v._i)));

  $("#emptyState").classList.toggle("hidden", out.length > 0);
  const n = out.length;
  $("#headerCount").textContent = n === 1 ? "1 vehículo encontrado" : `${n} vehículos encontrados`;
}

function ordenar(arr, orden) {
  const c = [...arr];
  const km = (v) => +String(v.km).replace(/\D/g, "") || Infinity;
  switch (orden) {
    case "precio-asc":  return c.sort((a, b) => (precioNum(a) || Infinity) - (precioNum(b) || Infinity));
    case "precio-desc": return c.sort((a, b) => precioNum(b) - precioNum(a));
    case "km-asc":      return c.sort((a, b) => km(a) - km(b));
    case "anio-desc":   return c.sort((a, b) => (+b.anio || 0) - (+a.anio || 0));
    default:            return c;
  }
}

function cardHTML(v) {
  const foto = fotosList(v.fotos)[0];
  const media = foto
    ? `<div class="card-media"><img src="${esc(foto)}" alt="${esc(v.marca)} ${esc(v.modelo)}" loading="lazy" referrerpolicy="no-referrer"></div>`
    : `<div class="card-media no-img">SIN FOTO</div>`;
  const est = (v.estado || "").toLowerCase();
  const badge = v.estado ? `<span class="badge ${esc(est)}">${esc(v.estado)}</span>` : "";
  const specs = [
    v.anio && `<span>📅 ${esc(v.anio)}</span>`,
    v.km && `<span>🛣️ ${esc(v.km)} km</span>`,
    v.combustible && `<span>⛽ ${esc(v.combustible)}</span>`,
    v.transmision && `<span>⚙️ ${esc(v.transmision)}</span>`
  ].filter(Boolean).join("");
  const p = precioTexto(v);
  const precio = p ? `<span class="price-value">${p}</span>` : `<span class="price-consult">Consultar</span>`;

  return `
    <article class="card ${v.estado === "Vendido" ? "is-sold" : ""}" id="card-${v._i}">
      <div class="card-media-wrap">${media}${badge}</div>
      <div class="card-body">
        <h3 class="card-title">${esc(v.marca)} ${esc(v.modelo)}</h3>
        <p class="card-sub">${esc(v.version)}</p>
        <div class="card-specs">${specs}</div>
        <div class="card-price">${precio}</div>
      </div>
    </article>`;
}

/* ---- modal ---- */
function abrirModal(i) {
  const v = VEHICULOS.find((x) => x._i === i);
  if (!v) return;

  const fotos = fotosList(v.fotos);
  const galeria = fotos.length
    ? `<div class="modal-media">${fotos.map((f) =>
        `<img src="${esc(f)}" alt="${esc(v.marca)} ${esc(v.modelo)}" referrerpolicy="no-referrer">`).join("")}</div>`
    : "";

  const specs = [
    ["Año", v.anio], ["Kilometraje", v.km && v.km + " km"],
    ["Combustible", v.combustible], ["Transmisión", v.transmision],
    ["Motor", v.motor], ["Potencia", v.potencia_hp && v.potencia_hp + (/hp/i.test(v.potencia_hp) ? "" : " HP")],
    ["Tracción", v.traccion], ["Carrocería", v.carroceria],
    ["Color exterior", v.color_ext], ["Color interior", v.color_int]
  ].filter(([, val]) => val)
   .map(([k, val]) => `<div class="spec-item"><div class="k">${esc(k)}</div><div class="v">${esc(val)}</div></div>`)
   .join("");

  const p = precioTexto(v);
  const precio = p ? `<div class="modal-price">${p}</div>` : `<div class="modal-price consult">Consultar</div>`;

  const nombre = `${v.marca} ${v.modelo} ${v.version} ${v.anio}`.replace(/\s+/g, " ").trim();
  const wa = `https://wa.me/${WHATSAPP}?text=` +
    encodeURIComponent(`Hola, estoy interesado en el ${nombre} que vi en el catálogo. ¿Sigue disponible?`);

  $("#modalCard").innerHTML = `
    <button class="modal-close" data-close>×</button>
    ${galeria}
    <div class="modal-content">
      <h2 class="modal-title">${esc(v.marca)} ${esc(v.modelo)}</h2>
      <p class="modal-sub">${esc(v.version)}${v.estado ? " · " + esc(v.estado) : ""}</p>
      ${precio}
      ${v.destacados ? `<p class="modal-desc">${esc(v.destacados)}</p>` : ""}
      <div class="spec-grid">${specs}</div>
      <a class="btn-wa" href="${wa}" target="_blank" rel="noopener">Consultar por WhatsApp</a>
    </div>`;

  $("#modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function cerrarModal() {
  $("#modal").classList.add("hidden");
  document.body.style.overflow = "";
}

init();
