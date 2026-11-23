// Pedaços usados pelas páginas que mostram projetos e álbuns.
window.ALBUNS = {
  cartao(a, total, link = "album.html") {
    const { esc, formatarDia } = window.UTIL;
    const capa = a.capa_url
      ? `<img src="${esc(a.capa_url)}" alt="" loading="lazy">`
      : `<div class="sem-capa">📷</div>`;
    const qtd = total ? ` · ${total} ${total === 1 ? "foto/vídeo" : "fotos e vídeos"}` : "";
    return `
      <a class="album" href="${link}?id=${encodeURIComponent(a.id)}">
        ${capa}
        <div class="info"><h3>${esc(a.titulo)}</h3><small>${esc(formatarDia(a.data))}${qtd}</small></div>
      </a>`;
  },

  // Lista de álbuns (filtro opcional: só os de um projeto)
  async desenharLista(elemento, { limite, projetoId, vazio } = {}) {
    try {
      let albuns = (await DB.listarAlbuns()).filter((a) => a.publicado !== false);
      if (projetoId) albuns = albuns.filter((a) => a.projeto_id === projetoId);
      const contagem = await DB.contarMidias();
      if (limite) albuns = albuns.slice(0, limite);
      elemento.innerHTML = albuns.length
        ? albuns.map((a) => this.cartao(a, contagem[a.id] || 0)).join("")
        : `<p class="vazio">${vazio || "Em breve, fotos e vídeos das nossas ações."}</p>`;
      return albuns.length;
    } catch (e) {
      console.error(e);
      elemento.innerHTML = `<p class="vazio">Não foi possível carregar os álbuns agora.</p>`;
      return 0;
    }
  },

  // Lista de projetos
  async desenharProjetos(elemento, { limite } = {}) {
    try {
      let projetos = (await DB.listarProjetos()).filter((p) => p.publicado !== false);
      if (limite) projetos = projetos.slice(0, limite);
      elemento.innerHTML = projetos.length
        ? projetos.map((p) => this.cartao(p, 0, "projeto.html")).join("")
        : `<p class="vazio">Em breve, os projetos apoiados pelo Pulga.</p>`;
    } catch (e) {
      console.error(e);
      elemento.innerHTML = `<p class="vazio">Não foi possível carregar os projetos agora.</p>`;
    }
  },
};
