// Página de um projeto: capa, descrição, agenda do projeto e álbuns ligados a ele.
(async function () {
  const { esc, formatarDia, formatarData, formatarHora } = window.UTIL;
  const id = new URLSearchParams(location.search).get("id");
  const $ = (x) => document.getElementById(x);

  const projeto = id ? await DB.projeto(id).catch(() => null) : null;
  if (!projeto) {
    $("album").innerHTML = `<h1>Projeto não encontrado</h1><p><a href="projetos.html">Ver todos os projetos</a></p>`;
    $("albuns").innerHTML = "";
    return;
  }
  document.title = projeto.titulo + " – Pulga";

  $("album").innerHTML = `
    <div class="album-topo">
      ${projeto.capa_url ? `<img src="${esc(projeto.capa_url)}" alt="Capa do projeto ${esc(projeto.titulo)}">` : ""}
      <div>
        <span class="etiqueta">Projeto apoiado</span>
        <h1>${esc(projeto.titulo)}</h1>
        <p><strong>${esc(formatarDia(projeto.data))}</strong></p>
        <p style="white-space:pre-line">${esc(projeto.descricao || "")}</p>
      </div>
    </div>`;

  const eventos = (await DB.listarEventos()).filter((e) => e.projeto_id === projeto.id && e.publicado !== false);
  if (eventos.length) {
    $("secao-eventos").hidden = false;
    $("eventos").innerHTML = eventos.map((ev) => `
      <div class="cartao evento ${UTIL.situacao(ev)}" style="cursor:default">
        <span class="etiqueta">${esc(ev.categoria || "Ação")}</span>
        <h3>${esc(ev.titulo)}</h3>
        <div class="quando">${esc(formatarData(ev.inicio))}${ev.fim ? " até " + esc(formatarHora(ev.fim)) : ""}</div>
        ${ev.local ? `<div class="onde">📍 ${esc(ev.local)}</div>` : ""}
      </div>`).join("");
  }

  ALBUNS.desenharLista($("albuns"), { projetoId: projeto.id, vazio: "As fotos e vídeos deste projeto serão publicados em breve." });
})();
