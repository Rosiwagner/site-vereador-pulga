// Página de um álbum: capa, descrição e galeria de fotos/vídeos.
(async function () {
  const { esc, formatarDia, formatarData, formatarHora, video } = window.UTIL;
  const id = new URLSearchParams(location.search).get("id");
  const $ = (x) => document.getElementById(x);

  const projeto = id ? await DB.album(id).catch(() => null) : null; // "projeto" aqui é o álbum
  if (!projeto) {
    $("album").innerHTML = `<h1>Álbum não encontrado</h1><p><a href="albuns.html">Ver todos os álbuns</a></p>`;
    $("galeria").innerHTML = "";
    return;
  }
  document.title = projeto.titulo + " – Pulga";

  $("album").innerHTML = `
    <div class="album-topo">
      ${projeto.capa_url ? `<img src="${esc(projeto.capa_url)}" alt="Capa do álbum ${esc(projeto.titulo)}">` : ""}
      <div>
        <span class="etiqueta">Álbum</span>
        <h1>${esc(projeto.titulo)}</h1>
        <p><strong>${esc(formatarDia(projeto.data))}</strong></p>
        <p style="white-space:pre-line">${esc(projeto.descricao || "")}</p>
        <p id="link-projeto"></p>
      </div>
    </div>`;
  if (projeto.projeto_id) {
    DB.projeto(projeto.projeto_id).then((p) => {
      if (p) $("link-projeto").innerHTML = `<a class="botao azul pequeno" href="projeto.html?id=${encodeURIComponent(p.id)}">Ver o projeto: ${esc(p.titulo)}</a>`;
    }).catch(() => {});
  }

  // Galeria
  const midias = await DB.listarMidias(projeto.id);
  $("galeria").innerHTML = midias.length ? midias.map((m, i) => {
    if (m.tipo === "video") {
      const v = video(m.url);
      const fundo = v.thumb ? `<img src="${esc(v.thumb)}" alt="" loading="lazy">`
        : v.tipo === "arquivo" ? `<video src="${esc(m.url)}#t=0.5" preload="metadata" muted></video>` : "";
      return `<button class="midia" data-i="${i}" aria-label="Ver vídeo ${esc(m.legenda || "")}">${fundo}<span class="play ${fundo ? "" : "sem-thumb"}">▶</span></button>`;
    }
    return `<button class="midia" data-i="${i}" aria-label="Ver foto ${esc(m.legenda || "")}"><img src="${esc(m.url)}" alt="${esc(m.legenda || "")}" loading="lazy"></button>`;
  }).join("") : `<p class="vazio">As fotos e vídeos deste projeto serão publicados em breve.</p>`;

  const corpo = $("visualizador-corpo");
  const dlg = $("visualizador");
  dlg.addEventListener("close", () => (corpo.innerHTML = "")); // para o vídeo ao fechar
  document.querySelectorAll(".midia").forEach((b) => b.addEventListener("click", () => {
    const m = midias[b.dataset.i];
    let html;
    if (m.tipo === "video") {
      const v = video(m.url);
      html = v.tipo === "youtube" ? `<iframe src="${esc(v.embed)}?autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen title="Vídeo"></iframe>`
        : v.tipo === "arquivo" ? `<video src="${esc(m.url)}" controls autoplay playsinline></video>`
        : `<p class="legenda"><a class="botao" href="${esc(m.url)}" target="_blank" rel="noopener">Abrir vídeo em outra aba</a></p>`;
    } else {
      html = `<img src="${esc(m.url)}" alt="${esc(m.legenda || "")}">`;
    }
    corpo.innerHTML = html + (m.legenda ? `<p class="legenda">${esc(m.legenda)}</p>` : "");
    dlg.showModal();
  }));

})();
