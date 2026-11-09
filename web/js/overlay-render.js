// DBD Companion – Overlay-Widgets als neutrale Beschreibung.
// Die gleiche Beschreibung zeichnet das Ingame-Overlay (VB.NET), die Vorschau in der App und die OBS-Browserquelle.
// von FGSeRaser – https://github.com/FGSeRaser

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function hexAlpha(hex, a) {
  const n = parseInt(String(hex || "#000000").slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// Ein Widget als HTML (Vorschau + OBS)
export function widgetHtml(w) {
  const zeilen = (w.zeilen || []).map((z) => `
    <div class="ow-zeile">
      ${z.icon ? `<img src="${esc(z.icon)}" alt="">` : ""}
      <div style="flex:1;min-width:0">
        <div class="ow-text ${z.gross ? "ow-gross" : ""}" style="color:${esc(z.farbe || w.text || "#fff")}">${esc(z.text)}</div>
        ${z.sub ? `<div class="ow-sub">${esc(z.sub)}</div>` : ""}
        ${z.fortschritt != null ? `<div class="ow-bar"><i style="width:${Math.max(0, Math.min(100, z.fortschritt * 100))}%;background:${esc(z.farbe || w.akzent)}"></i></div>` : ""}
      </div>
      ${z.wert ? `<div class="ow-wert" style="color:${esc(z.farbe || "#fff")}">${esc(z.wert)}</div>` : ""}
    </div>`).join("");
  const icons = (w.icons || []).length ? `<div class="ow-icons">${w.icons.map((i) => i ? `<img src="${esc(i)}" alt="">` : `<div style="width:44px;height:44px;border:1px dashed #fff4;border-radius:6px"></div>`).join("")}</div>` : "";
  return `<div class="ow" data-id="${esc(w.id)}" style="background:${hexAlpha(w.hg, w.deckkraft)};border-left:4px solid ${esc(w.akzent)};transform:scale(${w.skala})">
    ${w.titel ? `<div class="ow-titel" style="color:${esc(w.akzent)}">${esc(w.titel)}</div>` : ""}${zeilen}${icons}</div>`;
}
