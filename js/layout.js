// Topo e rodapé iguais em todas as páginas. Edite aqui para mudar o menu.
(function () {
  const cfg = window.CONFIG || {};
  const pagina = location.pathname.split("/").pop() || "index.html";
  const link = (href, texto, extra = "") =>
    `<a href="${href}" class="${extra}" ${pagina === href ? 'aria-current="page"' : ""}>${texto}</a>`;

  const topo = document.getElementById("topo");
  if (topo) {
    topo.className = "topo";
    topo.innerHTML = `
      <div class="container">
        <a class="marca" href="index.html">
          <img src="assets/logo-pulga.png" alt="Pulga – Sempre ao lado da comunidade" width="104" height="64">
          <span>Sempre ao lado<br>da comunidade</span>
        </a>
        <nav class="menu">
          ${link("index.html#agenda", "Agenda")}
          ${link("projetos.html", "Projetos")}
          ${link("albuns.html", "Álbum")}
          ${link("equipe.html", "Equipe")}
          ${link("admin.html", "🔒 Administrador", "destaque")}
        </nav>
      </div>`;
  }

  const rodape = document.getElementById("rodape");
  if (rodape) {
    rodape.className = "rodape";
    rodape.innerHTML = `<strong>Juntos, fazemos mais!</strong><span>${cfg.NOME_SITE || ""}</span>`;
  }
})();
