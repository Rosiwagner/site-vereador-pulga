// Página pública da equipe: foto, nome e função de cada membro.
(async function () {
  const { esc } = window.UTIL;
  const lista = document.getElementById("lista-equipe");
  try {
    const equipe = await DB.listarEquipePublica();
    const iniciais = (nome) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
    lista.innerHTML = equipe.length ? equipe.map((m) => `
      <div class="membro">
        ${m.foto_url ? `<img class="foto" src="${esc(m.foto_url)}" alt="Foto de ${esc(m.nome)}" loading="lazy">`
                     : `<div class="foto" aria-hidden="true">${esc(iniciais(m.nome))}</div>`}
        <h3>${esc(m.nome)}</h3>
        ${m.funcao ? `<p>${esc(m.funcao)}</p>` : ""}
      </div>`).join("") : `<p class="vazio">Em breve, a apresentação da nossa equipe.</p>`;
  } catch (e) {
    console.error(e);
    lista.innerHTML = `<p class="vazio">Não foi possível carregar a equipe agora.</p>`;
  }
})();
