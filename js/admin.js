// Área da equipe: login e cadastros.
(function () {
  const { formatarData, formatarHora, paraInput, deInput, esc } = window.UTIL;
  const $ = (id) => document.getElementById(id);

  let colaboradores = [];
  let participantes = [];
  let projetos = [];

  if (DB.modo === "demo") $("aviso-demo").hidden = false;

  function aviso(texto) {
    const m = $("mensagem");
    m.textContent = texto;
    m.classList.add("visivel");
    setTimeout(() => m.classList.remove("visivel"), 2200);
  }

  // ------------------------- LOGIN -------------------------
  async function iniciar() {
    const usuario = await DB.usuarioAtual();
    if (!usuario) return mostrarLogin();
    if (!(await DB.souAdmin())) {
      await DB.sair();
      return mostrarLogin("Este e-mail não é mais administrador. Fale com um administrador.");
    }
    meuEmail = usuario.email || "";
    souGeral = await DB.souAdminGeral();
    document.querySelector('[data-aba="admins"]').hidden = !souGeral;
    document.querySelector('[data-aba="log"]').hidden = !souGeral;
    document.querySelector('[data-aba="eventos"]').click();
    $("usuario-logado").textContent = "Conectado como " + usuario.email;
    $("tela-login").hidden = true;
    $("tela-painel").hidden = false;
    $("btn-sair").hidden = false;
    await recarregarTudo();
  }

  function mostrarLogin(erro = "") {
    $("usuario-logado").textContent = "Acesso restrito aos administradores do site";
    $("tela-login").hidden = false;
    $("tela-painel").hidden = true;
    $("btn-sair").hidden = true;
    $("erro-login").textContent = erro;
  }

  const MSG_LOGIN = {
    senha_errada: "Senha incorreta. Confira e tente de novo.",
    nao_autorizado: "Este e-mail não está autorizado como administrador. Só o administrador geral pode autorizar novos administradores.",
    senha_fraca: "Escolha uma senha mais forte (mínimo 6 caracteres).",
    confirmar: "Falta confirmar o seu e-mail: abra a mensagem que o site enviou e clique no link. Depois entre aqui de novo.",
    criou_confirmar: "Senha criada! ✅ Agora abra o seu e-mail, clique no link de confirmação e depois volte aqui para entrar.",
  };
  $("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("erro-login").textContent = "";
    const botao = e.submitter; if (botao) botao.disabled = true;
    try {
      const r = await DB.entrarOuCriar($("l-email").value.trim(), $("l-senha").value);
      if (r.situacao === "entrou") await iniciar();
      else $("erro-login").textContent = MSG_LOGIN[r.situacao] || "Não foi possível entrar.";
    } catch (err) {
      $("erro-login").textContent = "Não foi possível entrar: " + err.message;
      console.error(err);
    } finally { if (botao) botao.disabled = false; }
  });

  $("btn-sair").addEventListener("click", async () => { await DB.sair(); mostrarLogin(); });

  // ------------------------- ABAS -------------------------
  document.querySelectorAll(".aba").forEach((aba) => {
    aba.addEventListener("click", () => {
      document.querySelectorAll(".aba").forEach((a) => a.classList.toggle("ativa", a === aba));
      document.querySelectorAll(".painel").forEach((p) => p.classList.toggle("ativo", p.id === "painel-" + aba.dataset.aba));
    });
  });

  async function recarregarTudo() {
    colaboradores = await DB.listar("colaboradores");
    participantes = await DB.listar("participantes");
    desenharPessoas("colaboradores", colaboradores, (p) => p.funcao);
    desenharPessoas("participantes", participantes, (p) => p.bairro);
    desenharMarcacoes([], []);
    await desenharProjetos();
    await desenharAlbuns();
    await desenharEventos();
    if (souGeral) { await desenharAdmins(); await desenharLog(); }
  }

  // ------------------------- EVENTOS -------------------------
  function desenharMarcacoes(colabMarcados, partMarcados) {
    const lista = (itens, marcados, nome, vazio) => itens.length
      ? itens.map((p) => `<label class="checkbox"><input type="checkbox" name="${nome}" value="${esc(p.id)}" ${marcados.includes(p.id) ? "checked" : ""}> ${esc(p.nome)}</label>`).join("")
      : `<span class="vazio">${vazio}</span>`;
    $("e-colaboradores").innerHTML = lista(colaboradores, colabMarcados, "colab", "Cadastre colaboradores na aba ao lado.");
    $("e-participantes").innerHTML = lista(participantes, partMarcados, "part", "Cadastre participantes na aba ao lado.");
  }

  async function desenharEventos() {
    const eventos = (await DB.listarEventos()).slice().reverse(); // mais recentes primeiro
    const cont = await DB.contagens();
    $("tabela-eventos").innerHTML = eventos.length ? eventos.map((ev) => `
      <tr>
        <td>${esc(formatarData(ev.inicio))}${ev.fim ? " – " + esc(formatarHora(ev.fim)) : ""}</td>
        <td><strong>${esc(ev.titulo)}</strong><br><small>${esc(ev.local || "")}</small>${ev.publicado === false ? '<br><span class="etiqueta">Oculto</span>' : ""}</td>
        <td>${cont.colaboradores[ev.id] || 0} / ${cont.participantes[ev.id] || 0}</td>
        <td><div class="acoes">
          <button class="botao secundario pequeno" data-editar="${esc(ev.id)}">Editar</button>
          <button class="botao perigo pequeno" data-excluir="${esc(ev.id)}">Excluir</button>
        </div></td>
      </tr>`).join("") : `<tr><td colspan="4" class="vazio">Nenhum evento cadastrado ainda.</td></tr>`;

    $("tabela-eventos").querySelectorAll("[data-editar]").forEach((b) =>
      b.addEventListener("click", () => editarEvento(eventos.find((x) => String(x.id) === b.dataset.editar))));
    $("tabela-eventos").querySelectorAll("[data-excluir]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Excluir este evento?")) return;
        await DB.excluirEvento(b.dataset.excluir);
        aviso("Evento excluído");
        await desenharEventos();
      }));
  }

  async function editarEvento(ev) {
    $("titulo-form-evento").textContent = "Editar evento";
    $("e-id").value = ev.id;
    $("e-titulo").value = ev.titulo || "";
    $("e-inicio").value = paraInput(ev.inicio);
    $("e-fim").value = paraInput(ev.fim);
    $("e-local").value = ev.local || "";
    $("e-categoria").value = ev.categoria || "Ação";
    $("e-descricao").value = ev.descricao || "";
    $("e-publicado").checked = ev.publicado !== false;
    $("e-projeto").value = ev.projeto_id || "";
    const lig = await DB.ligacoesDoEvento(ev.id);
    desenharMarcacoes(lig.colaboradores, lig.participantes);
    $("form-evento").scrollIntoView({ behavior: "smooth" });
  }

  function limparEvento() {
    $("form-evento").reset();
    $("e-id").value = "";
    $("titulo-form-evento").textContent = "Novo evento";
    $("erro-evento").textContent = "";
    desenharMarcacoes([], []);
  }
  $("btn-limpar-evento").addEventListener("click", limparEvento);

  $("form-evento").addEventListener("submit", async (e) => {
    e.preventDefault();
    const inicio = deInput($("e-inicio").value);
    const fim = deInput($("e-fim").value);
    if (fim && new Date(fim) < new Date(inicio)) {
      $("erro-evento").textContent = "O fim precisa ser depois do início.";
      return;
    }
    const ev = {
      titulo: $("e-titulo").value.trim(),
      inicio, fim,
      local: $("e-local").value.trim(),
      categoria: $("e-categoria").value,
      descricao: $("e-descricao").value.trim(),
      publicado: $("e-publicado").checked,
      projeto_id: $("e-projeto").value || null,
    };
    if ($("e-id").value) ev.id = $("e-id").value;
    const marcados = (nome) => [...document.querySelectorAll(`input[name="${nome}"]:checked`)].map((i) => i.value);
    try {
      await DB.salvarEvento(ev, marcados("colab"), marcados("part"));
      aviso("Evento salvo");
      limparEvento();
      await desenharEventos();
    } catch (err) {
      $("erro-evento").textContent = "Erro ao salvar: " + err.message;
    }
  });

  // ------------------- PROJETOS -------------------
  // Formulário genérico com capa (usado por Projetos e Álbuns)
  function formComCapa(prefixo) {
    const f = (x) => $(prefixo + "-" + x);
    return {
      mostrarCapa(url) { f("capa-previa").hidden = !url; if (url) f("capa-previa").src = url; },
      preencher(item) {
        f("id").value = item.id; f("titulo").value = item.titulo || "";
        f("data").value = item.data ? String(item.data).slice(0, 10) : "";
        f("descricao").value = item.descricao || ""; f("capa-url").value = item.capa_url || "";
        f("publicado").checked = item.publicado !== false;
        this.mostrarCapa(item.capa_url);
      },
      limpar() {
        f("id").closest("form").reset();
        f("id").value = ""; f("capa-url").value = "";
        this.mostrarCapa(null);
      },
      async ler(pasta) {
        let capa = f("capa-url").value || null;
        const arquivo = f("capa").files[0];
        if (arquivo) capa = (await DB.enviarArquivo(await UTIL.reduzirFoto(arquivo, 1200), pasta)).url;
        const item = {
          titulo: f("titulo").value.trim(), data: f("data").value || null,
          descricao: f("descricao").value.trim(), capa_url: capa, publicado: f("publicado").checked,
        };
        if (f("id").value) item.id = f("id").value;
        return item;
      },
    };
  }
  const fProjeto = formComCapa("p");
  const fAlbum = formComCapa("al");

  async function desenharProjetos() {
    projetos = await DB.listarProjetos();
    for (const sel of [$("e-projeto"), $("al-projeto")]) {
      const atual = sel.value;
      const primeira = sel.options[0].outerHTML;
      sel.innerHTML = primeira + projetos.map((p) => `<option value="${esc(p.id)}">${esc(p.titulo)}</option>`).join("");
      sel.value = atual;
    }
    $("tabela-projetos").innerHTML = projetos.length ? projetos.map((p) => `
      <tr>
        <td>${p.capa_url ? `<img class="miniatura" src="${esc(p.capa_url)}" alt="">` : `<div class="miniatura"></div>`}</td>
        <td><strong>${esc(p.titulo)}</strong><br><small>${esc(UTIL.formatarDia(p.data))}</small>${p.publicado === false ? '<br><span class="etiqueta">Oculto</span>' : ""}</td>
        <td><div class="acoes">
          <button class="botao secundario pequeno" data-editar="${esc(p.id)}">Editar</button>
          <button class="botao perigo pequeno" data-excluir="${esc(p.id)}">Excluir</button>
        </div></td>
      </tr>`).join("") : `<tr><td colspan="3" class="vazio">Nenhum projeto ainda.</td></tr>`;
    const acha = (id) => projetos.find((x) => String(x.id) === id);
    $("tabela-projetos").querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () => {
      fProjeto.preencher(acha(b.dataset.editar));
      $("titulo-form-projeto").textContent = "Editar projeto";
      $("form-projeto").scrollIntoView({ behavior: "smooth" });
    }));
    $("tabela-projetos").querySelectorAll("[data-excluir]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Excluir este projeto? Os eventos e álbuns dele continuam existindo, só deixam de estar ligados ao projeto.")) return;
      await DB.excluirProjeto(b.dataset.excluir);
      aviso("Projeto excluído");
      await desenharProjetos(); await desenharAlbuns();
    }));
  }

  $("btn-limpar-projeto").addEventListener("click", () => { fProjeto.limpar(); $("titulo-form-projeto").textContent = "Novo projeto"; });
  $("form-projeto").addEventListener("submit", async (e) => {
    e.preventDefault();
    const botao = e.submitter; if (botao) botao.disabled = true;
    $("erro-projeto").textContent = "";
    try {
      await DB.salvarProjeto(await fProjeto.ler("capas"));
      aviso("Projeto salvo");
      fProjeto.limpar(); $("titulo-form-projeto").textContent = "Novo projeto";
      await desenharProjetos();
    } catch (err) {
      $("erro-projeto").textContent = "Erro ao salvar: " + err.message;
    } finally { if (botao) botao.disabled = false; }
  });

  // ------------------- ÁLBUNS, FOTOS E VÍDEOS -------------------
  let albuns = [];
  let albumAberto = null;

  async function desenharAlbuns() {
    albuns = await DB.listarAlbuns();
    const cont = await DB.contarMidias();
    const nomeProjeto = (id) => (projetos.find((p) => p.id === id) || {}).titulo;
    $("tabela-albuns").innerHTML = albuns.length ? albuns.map((a) => `
      <tr>
        <td>${a.capa_url ? `<img class="miniatura" src="${esc(a.capa_url)}" alt="">` : `<div class="miniatura"></div>`}</td>
        <td><strong>${esc(a.titulo)}</strong><br><small>${esc(UTIL.formatarDia(a.data))}</small>
          ${a.projeto_id && nomeProjeto(a.projeto_id) ? `<br><small>📌 ${esc(nomeProjeto(a.projeto_id))}</small>` : ""}
          ${a.publicado === false ? '<br><span class="etiqueta">Oculto</span>' : ""}</td>
        <td>${cont[a.id] || 0}</td>
        <td><div class="acoes">
          <button class="botao azul pequeno" data-midias="${esc(a.id)}">Fotos e vídeos</button>
          <button class="botao secundario pequeno" data-editar="${esc(a.id)}">Editar</button>
          <button class="botao perigo pequeno" data-excluir="${esc(a.id)}">Excluir</button>
        </div></td>
      </tr>`).join("") : `<tr><td colspan="4" class="vazio">Nenhum álbum ainda.</td></tr>`;

    const acha = (id) => albuns.find((x) => String(x.id) === id);
    $("tabela-albuns").querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () => {
      const a = acha(b.dataset.editar);
      fAlbum.preencher(a); $("al-projeto").value = a.projeto_id || "";
      $("titulo-form-album").textContent = "Editar álbum";
      $("form-album").scrollIntoView({ behavior: "smooth" });
    }));
    $("tabela-albuns").querySelectorAll("[data-midias]").forEach((b) => b.addEventListener("click", () => abrirMidias(acha(b.dataset.midias))));
    $("tabela-albuns").querySelectorAll("[data-excluir]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Excluir este álbum e TODAS as fotos e vídeos dele?")) return;
      await DB.excluirAlbum(b.dataset.excluir);
      if (albumAberto && String(albumAberto.id) === b.dataset.excluir) { albumAberto = null; $("gerenciar-midias").hidden = true; }
      aviso("Álbum excluído");
      await desenharAlbuns();
    }));
  }

  function limparAlbum() { fAlbum.limpar(); $("titulo-form-album").textContent = "Novo álbum"; $("erro-album").textContent = ""; }
  $("btn-limpar-album").addEventListener("click", limparAlbum);

  $("form-album").addEventListener("submit", async (e) => {
    e.preventDefault();
    const botao = e.submitter; if (botao) botao.disabled = true;
    try {
      const a = await fAlbum.ler("capas");
      a.projeto_id = $("al-projeto").value || null;
      const salvo = await DB.salvarAlbum(a);
      aviso("Álbum salvo. Agora adicione as fotos e vídeos.");
      limparAlbum();
      await desenharAlbuns();
      abrirMidias(albuns.find((x) => String(x.id) === String(salvo.id)) || salvo);
    } catch (err) {
      $("erro-album").textContent = "Erro ao salvar: " + err.message;
    } finally { if (botao) botao.disabled = false; }
  });

  async function abrirMidias(a) {
    albumAberto = a;
    $("gerenciar-midias").hidden = false;
    $("m-album-nome").textContent = a.titulo;
    $("erro-midia").textContent = "";
    await desenharMidias();
    $("gerenciar-midias").scrollIntoView({ behavior: "smooth" });
  }

  async function desenharMidias() {
    const midias = await DB.listarMidias(albumAberto.id);
    $("galeria-admin").innerHTML = midias.length ? midias.map((m, i) => {
      let vis;
      if (m.tipo === "video") {
        const v = UTIL.video(m.url);
        vis = v.thumb ? `<img src="${esc(v.thumb)}" alt="">` : v.tipo === "arquivo" ? `<video src="${esc(m.url)}" muted preload="metadata"></video>` : "▶";
      } else vis = `<img src="${esc(m.url)}" alt="">`;
      return `<figure><div>${vis}</div><figcaption><span>${m.tipo === "video" ? "🎬 " : ""}${esc(m.legenda || "")}</span>
        <span style="display:flex;gap:4px">
          ${m.tipo === "foto" ? `<button class="botao secundario pequeno" data-capa="${i}" title="Usar como capa">★</button>` : ""}
          <button class="botao perigo pequeno" data-i="${i}" title="Excluir">✕</button>
        </span></figcaption></figure>`;
    }).join("") : `<p class="vazio">Nenhuma foto ou vídeo ainda.</p>`;
    $("galeria-admin").querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Excluir esta foto/vídeo?")) return;
      await DB.excluirMidia(midias[b.dataset.i]);
      aviso("Excluído");
      await desenharMidias(); await desenharAlbuns();
    }));
    $("galeria-admin").querySelectorAll("[data-capa]").forEach((b) => b.addEventListener("click", async () => {
      albumAberto = await DB.salvarAlbum({ id: albumAberto.id, capa_url: midias[b.dataset.capa].url });
      aviso("Capa do álbum atualizada");
      await desenharAlbuns();
    }));
  }

  $("m-arquivos").addEventListener("change", async (e) => {
    const arquivos = [...e.target.files];
    $("erro-midia").textContent = "";
    let enviados = 0;
    for (const original of arquivos) {
      try {
        const ehVideo = original.type.startsWith("video/");
        if (ehVideo && original.size > 50 * 1024 * 1024) throw new Error(`"${original.name}" passa de 50 MB. Prefira publicar no YouTube e colar o link.`);
        $("erro-midia").textContent = `Enviando ${enviados + 1} de ${arquivos.length}…`;
        const arquivo = ehVideo ? original : await UTIL.reduzirFoto(original);
        const { url, caminho } = await DB.enviarArquivo(arquivo, "albuns/" + albumAberto.id);
        await DB.adicionarMidia({ album_id: albumAberto.id, tipo: ehVideo ? "video" : "foto", url, caminho, legenda: $("m-legenda").value.trim() || null });
        if (!ehVideo && !albumAberto.capa_url) albumAberto = await DB.salvarAlbum({ id: albumAberto.id, capa_url: url });
        enviados++;
      } catch (err) {
        $("erro-midia").textContent = "Erro: " + err.message;
        break;
      }
    }
    if (enviados === arquivos.length) $("erro-midia").textContent = "";
    if (enviados) aviso(`${enviados} ${enviados === 1 ? "arquivo enviado" : "arquivos enviados"}`);
    e.target.value = "";
    await desenharMidias(); await desenharAlbuns();
  });

  $("form-video").addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = $("m-link").value.trim();
    if (!url) return;
    try {
      await DB.adicionarMidia({ album_id: albumAberto.id, tipo: "video", url, legenda: $("m-legenda").value.trim() || null });
      $("m-link").value = "";
      aviso("Vídeo adicionado");
      await desenharMidias(); await desenharAlbuns();
    } catch (err) { $("erro-midia").textContent = "Erro: " + err.message; }
  });

  // ------------------- EQUIPE (COLABORADORES) E PARTICIPANTES -------------------
  function desenharPessoas(tabela, itens, detalhe) {
    const tbody = $("tabela-" + tabela);
    const foto = (p) => tabela === "colaboradores"
      ? (p.foto_url ? `<img class="miniatura redonda grande" src="${esc(p.foto_url)}" alt="">` : `<div class="miniatura redonda grande sem-foto">👤</div>`)
      : "";
    tbody.innerHTML = itens.length ? itens.map((p) => `
      <tr>
        <td><div style="display:flex;gap:10px;align-items:center">${foto(p)}<strong>${esc(p.nome)}</strong></div>
          ${tabela === "colaboradores" && p.mostrar_no_site === false ? '<span class="etiqueta">Fora da página Equipe</span>' : ""}</td>
        <td>${esc(detalhe(p) || "")}</td>
        <td>${esc(p.telefone || "")}${p.telefone && p.email ? "<br>" : ""}${esc(p.email || "")}</td>
        <td><div class="acoes">
          ${tabela === "colaboradores" ? `<button class="botao azul pequeno" data-foto="${esc(p.id)}">📷 ${p.foto_url ? "Trocar foto" : "Pôr foto"}</button>` : ""}
          <button class="botao secundario pequeno" data-editar="${esc(p.id)}">Editar</button>
          <button class="botao perigo pequeno" data-excluir="${esc(p.id)}">Excluir</button>
        </div></td>
      </tr>`).join("") : `<tr><td colspan="4" class="vazio">Ninguém cadastrado ainda.</td></tr>`;

    const form = $("form-" + tabela);
    // Trocar a foto direto pela lista, sem abrir o formulário
    tbody.querySelectorAll("[data-foto]").forEach((b) => b.addEventListener("click", () => {
      pessoaTrocandoFoto = itens.find((x) => String(x.id) === b.dataset.foto);
      $("troca-foto").value = "";
      $("troca-foto").click();
    }));
    tbody.querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () => {
      const p = itens.find((x) => String(x.id) === b.dataset.editar);
      [...form.elements].forEach((el) => {
        if (!el.name) return;
        if (el.type === "checkbox") el.checked = p[el.name] !== false;
        else el.value = p[el.name] ?? "";
      });
      if (tabela === "colaboradores") { mostrarFotoEquipe(p.foto_url); $("titulo-form-equipe").textContent = "Editar membro da equipe"; }
      form.scrollIntoView({ behavior: "smooth" });
    }));
    tbody.querySelectorAll("[data-excluir]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Excluir este cadastro? Ele também sai dos eventos em que estava.")) return;
      const p = itens.find((x) => String(x.id) === b.dataset.excluir);
      await DB.excluir(tabela, b.dataset.excluir);
      if (p && p.foto_caminho) DB.removerArquivo(p.foto_caminho).catch(() => {});
      aviso("Cadastro excluído");
      await recarregarTudo();
    }));
  }

  let pessoaTrocandoFoto = null;

  function mostrarFotoEquipe(url) {
    $("col-foto-previa").hidden = !url;
    $("btn-remover-foto").hidden = !url;
    if (url) $("col-foto-previa").src = url;
  }

  // Envia a nova foto e apaga a antiga do armazenamento
  async function trocarFoto(pessoa, arquivo) {
    const { url, caminho } = await DB.enviarArquivo(await UTIL.reduzirFoto(arquivo, 600), "equipe");
    await DB.salvar("colaboradores", { id: pessoa.id, foto_url: url, foto_caminho: caminho });
    if (pessoa.foto_caminho) DB.removerArquivo(pessoa.foto_caminho).catch(() => {});
  }

  $("troca-foto").addEventListener("change", async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo || !pessoaTrocandoFoto) return;
    try {
      aviso("Enviando foto…");
      await trocarFoto(pessoaTrocandoFoto, arquivo);
      aviso("Foto atualizada ✅");
      await recarregarTudo();
    } catch (err) { alert("Não foi possível trocar a foto: " + err.message); }
    pessoaTrocandoFoto = null;
  });

  // Mostra a foto escolhida antes de salvar
  $("col-foto").addEventListener("change", (e) => {
    const arquivo = e.target.files[0];
    if (arquivo) { $("col-foto-previa").src = URL.createObjectURL(arquivo); $("col-foto-previa").hidden = false; }
  });

  $("btn-remover-foto").addEventListener("click", () => {
    const form = $("form-colaboradores");
    form.dataset.removerFoto = "1";
    $("col-foto").value = "";
    mostrarFotoEquipe(null);
  });

  ["colaboradores", "participantes"].forEach((tabela) => {
    const form = $("form-" + tabela);
    form.addEventListener("reset", () => setTimeout(() => {
      form.elements.id.value = "";
      if (tabela === "colaboradores") {
        form.elements.foto_url.value = ""; form.elements.foto_caminho.value = ""; mostrarFotoEquipe(null);
        delete form.dataset.removerFoto; $("titulo-form-equipe").textContent = "Novo membro da equipe";
      }
    }, 0));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const botao = e.submitter; if (botao) botao.disabled = true;
      const item = {};
      [...form.elements].forEach((el) => {
        if (!el.name) return;
        if (el.type === "checkbox") item[el.name] = el.checked;
        else if (el.type === "number") item[el.name] = Number(el.value) || 0;
        else item[el.name] = el.value.trim() || null;
      });
      if (!item.id) delete item.id;
      try {
        let caminhoAntigo = null;
        if (tabela === "colaboradores") {
          const arquivo = $("col-foto").files[0];
          const antigo = item.foto_caminho;
          if (arquivo) {
            const { url, caminho } = await DB.enviarArquivo(await UTIL.reduzirFoto(arquivo, 600), "equipe");
            item.foto_url = url; item.foto_caminho = caminho; caminhoAntigo = antigo;
          } else if (form.dataset.removerFoto) {
            item.foto_url = null; item.foto_caminho = null; caminhoAntigo = antigo;
          }
        }
        await DB.salvar(tabela, item);
        if (caminhoAntigo) DB.removerArquivo(caminhoAntigo).catch(() => {});
        aviso("Cadastro salvo");
        form.reset();
        form.querySelector(".erro").textContent = "";
        await recarregarTudo();
      } catch (err) {
        form.querySelector(".erro").textContent = "Erro ao salvar: " + err.message;
      } finally { if (botao) botao.disabled = false; }
    });
  });

  // ------------------- ADMINISTRADORES -------------------
  let meuEmail = "";
  let souGeral = false;

  async function desenharAdmins() {
    const admins = await DB.listarAdmins();
    $("tabela-admins").innerHTML = admins.map((a) => {
      const souEu = a.email.toLowerCase() === meuEmail.toLowerCase();
      return `
      <tr>
        <td>${esc(a.nome || "")}${souEu ? ' <span class="etiqueta">Você</span>' : ""}</td>
        <td>${esc(a.email)}</td>
        <td>${a.nivel === "geral" ? '<span class="etiqueta agora">Geral</span>' : '<span class="etiqueta">Administrador</span>'}</td>
        <td>${souEu || a.nivel === "geral" ? "" : `<button class="botao perigo pequeno" data-remover="${esc(a.email)}">Remover acesso</button>`}</td>
      </tr>`;
    }).join("");
    $("tabela-admins").querySelectorAll("[data-remover]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm(`Remover o acesso de ${b.dataset.remover}?`)) return;
      try {
        await DB.removerAdmin(b.dataset.remover);
        aviso("Acesso removido");
        await desenharAdmins();
      } catch (err) { $("erro-admin").textContent = "Erro: " + err.message; }
    }));
  }

  $("form-admin").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("erro-admin").textContent = "";
    try {
      await DB.adicionarAdmin({ email: $("a-email").value.trim(), nome: $("a-nome").value.trim() });
      aviso("Administrador autorizado");
      $("form-admin").reset();
      await desenharAdmins();
    } catch (err) {
      $("erro-admin").textContent = /duplicate|já é/i.test(err.message) ? "Este e-mail já é administrador." : "Erro: " + err.message;
    }
  });

  // ------------------- REGISTRO DE ATIVIDADES -------------------
  const NOMES_TABELA = {
    eventos: "evento", projetos: "projeto", albuns: "álbum", midias: "foto/vídeo", colaboradores: "membro da equipe",
    participantes: "participante", admins: "administrador",
  };
  let log = [];
  async function desenharLog() {
    log = await DB.listarLog(300);
    const filtro = $("log-filtro");
    const atual = filtro.value;
    const pessoas = [...new Set(log.map((l) => l.email))].sort();
    filtro.innerHTML = `<option value="">Todas as pessoas</option>` + pessoas.map((p) => `<option>${esc(p)}</option>`).join("");
    filtro.value = pessoas.includes(atual) ? atual : "";
    const linhas = log.filter((l) => !filtro.value || l.email === filtro.value);
    $("tabela-log").innerHTML = linhas.length ? linhas.map((l) => `
      <tr>
        <td style="white-space:nowrap">${esc(new Date(l.quando).toLocaleString("pt-BR"))}</td>
        <td>${esc(l.email)}</td>
        <td><span class="etiqueta ${l.acao === "apagou" ? "agora" : ""}">${esc(l.acao)}</span> ${esc(NOMES_TABELA[l.tabela] || l.tabela)}</td>
        <td>${esc(l.resumo || "")}</td>
      </tr>`).join("") : `<tr><td colspan="4" class="vazio">Nenhuma atividade registrada ainda.</td></tr>`;
  }
  $("log-filtro").addEventListener("change", desenharLog);
  $("btn-atualizar-log").addEventListener("click", desenharLog);
  document.querySelector('[data-aba="log"]').addEventListener("click", () => souGeral && desenharLog());

  iniciar();
})();
