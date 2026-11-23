// =====================================================================
// Camada de dados: fala com o Supabase, ou com o navegador (modo demo).
// As páginas usam só as funções de window.DB, sem saber onde está o dado.
// =====================================================================
(function () {
  const cfg = window.CONFIG || {};
  const usarSupabase = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);

  // ---------------------------------------------------------------
  // MODO SUPABASE
  // ---------------------------------------------------------------
  function criarSupabase() {
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

    async function salvarLigacoes(tabela, coluna, eventoId, ids) {
      ok(await sb.from(tabela).delete().eq("evento_id", eventoId));
      if (ids.length) {
        ok(await sb.from(tabela).insert(ids.map((id) => ({ evento_id: eventoId, [coluna]: id }))));
      }
    }

    return {
      modo: "supabase",
      async listarEventos() {
        return ok(await sb.from("eventos").select("*").order("inicio"));
      },
      async ligacoesDoEvento(eventoId) {
        const c = ok(await sb.from("evento_colaboradores").select("colaborador_id").eq("evento_id", eventoId));
        const p = ok(await sb.from("evento_participantes").select("participante_id").eq("evento_id", eventoId));
        return { colaboradores: c.map((x) => x.colaborador_id), participantes: p.map((x) => x.participante_id) };
      },
      async contagens() {
        const c = ok(await sb.from("evento_colaboradores").select("evento_id"));
        const p = ok(await sb.from("evento_participantes").select("evento_id"));
        const conta = (lista) => lista.reduce((m, x) => ((m[x.evento_id] = (m[x.evento_id] || 0) + 1), m), {});
        return { colaboradores: conta(c), participantes: conta(p) };
      },
      async salvarEvento(ev, colaboradorIds, participanteIds) {
        const { id, ...dados } = ev;
        const salvo = id
          ? ok(await sb.from("eventos").update(dados).eq("id", id).select().single())
          : ok(await sb.from("eventos").insert(dados).select().single());
        await salvarLigacoes("evento_colaboradores", "colaborador_id", salvo.id, colaboradorIds);
        await salvarLigacoes("evento_participantes", "participante_id", salvo.id, participanteIds);
        return salvo;
      },
      async excluirEvento(id) { ok(await sb.from("eventos").delete().eq("id", id)); },

      async listar(tabela) { return ok(await sb.from(tabela).select("*").order("nome")); },
      async salvar(tabela, item) {
        const { id, ...dados } = item;
        return id
          ? ok(await sb.from(tabela).update(dados).eq("id", id).select().single())
          : ok(await sb.from(tabela).insert(dados).select().single());
      },
      async excluir(tabela, id) { ok(await sb.from(tabela).delete().eq("id", id)); },

      // ---- Projetos ----
      async listarProjetos() {
        return ok(await sb.from("projetos").select("*").order("data", { ascending: false, nullsFirst: false }));
      },
      async projeto(id) { return ok(await sb.from("projetos").select("*").eq("id", id).maybeSingle()); },
      async salvarProjeto(p) { return this.salvar("projetos", p); },
      async excluirProjeto(id) { ok(await sb.from("projetos").delete().eq("id", id)); },

      // ---- Álbuns (fotos e vídeos) ----
      async listarAlbuns() {
        return ok(await sb.from("albuns").select("*").order("data", { ascending: false, nullsFirst: false }));
      },
      async album(id) { return ok(await sb.from("albuns").select("*").eq("id", id).maybeSingle()); },
      async salvarAlbum(a) { return this.salvar("albuns", a); },
      async excluirAlbum(id) {
        const midias = await this.listarMidias(id);
        const caminhos = midias.map((m) => m.caminho).filter(Boolean);
        if (caminhos.length) await sb.storage.from("midias").remove(caminhos);
        ok(await sb.from("albuns").delete().eq("id", id));
      },
      async listarMidias(albumId) {
        return ok(await sb.from("midias").select("*").eq("album_id", albumId).order("criado_em"));
      },
      async contarMidias() {
        const l = ok(await sb.from("midias").select("album_id"));
        return l.reduce((m, x) => ((m[x.album_id] = (m[x.album_id] || 0) + 1), m), {});
      },
      async adicionarMidia(m) { return ok(await sb.from("midias").insert(m).select().single()); },
      async excluirMidia(m) {
        if (m.caminho) await sb.storage.from("midias").remove([m.caminho]);
        ok(await sb.from("midias").delete().eq("id", m.id));
      },
      async removerArquivo(caminho) { if (caminho) await sb.storage.from("midias").remove([caminho]); },
      // Envia um arquivo para o Storage e devolve { url, caminho }
      async enviarArquivo(arquivo, pasta) {
        const ext = (arquivo.name || "arquivo").split(".").pop().toLowerCase();
        const caminho = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        ok(await sb.storage.from("midias").upload(caminho, arquivo, { contentType: arquivo.type, upsert: false }));
        const { data } = sb.storage.from("midias").getPublicUrl(caminho);
        return { url: data.publicUrl, caminho };
      },

      // ---- Administradores ----
      async listarAdmins() { return ok(await sb.from("admins").select("*").order("email")); },
      async adicionarAdmin(a) {
        return ok(await sb.from("admins").insert({ email: a.email.toLowerCase(), nome: a.nome || null, nivel: "admin" }).select().single());
      },
      async souAdminGeral() {
        const { data, error } = await sb.rpc("is_admin_geral");
        return !error && data === true;
      },
      async listarLog(limite = 200) {
        return ok(await sb.from("log_atividades").select("*").order("quando", { ascending: false }).limit(limite));
      },
      async removerAdmin(email) { ok(await sb.from("admins").delete().eq("email", email)); },
      // "Primeiro acesso": cria a senha de quem já foi autorizado como admin
      async criarConta(email, senha) {
        const { data, error } = await sb.auth.signUp({
          email, password: senha,
          options: { emailRedirectTo: location.origin + location.pathname },
        });
        if (error) {
          if (/database error|not authorized|não está autorizado/i.test(error.message)) {
            throw new Error("Este e-mail ainda não foi autorizado. Peça a um administrador para incluí-lo.");
          }
          if (/already registered/i.test(error.message)) throw new Error("Este e-mail já tem senha. Use \"Entrar\".");
          throw new Error(error.message);
        }
        return { precisaConfirmar: !data.session };
      },
      async listarEquipePublica() {
        return ok(await sb.from("equipe_publica").select("*").order("ordem").order("nome"));
      },
      async usuarioAtual() {
        const { data } = await sb.auth.getSession();
        return data.session ? data.session.user : null;
      },
      async souAdmin() {
        const { data, error } = await sb.rpc("is_admin");
        return !error && data === true;
      },
      async entrar(email, senha) {
        ok(await sb.auth.signInWithPassword({ email, password: senha }));
      },
      // Entrar; se ainda não existe senha para este e-mail, cria (primeiro acesso)
      async entrarOuCriar(email, senha) {
        const r = await sb.auth.signInWithPassword({ email, password: senha });
        if (!r.error) return { situacao: "entrou" };
        if (/not confirmed/i.test(r.error.message)) return { situacao: "confirmar" };
        if (!/invalid login credentials/i.test(r.error.message)) throw new Error(r.error.message);
        // Login falhou: ou a senha está errada, ou é o primeiro acesso
        const c = await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: location.href.split("#")[0] } });
        if (c.error) {
          if (/database error|autorizado/i.test(c.error.message)) return { situacao: "nao_autorizado" };
          if (/already registered/i.test(c.error.message)) return { situacao: "senha_errada" };
          if (/password/i.test(c.error.message)) return { situacao: "senha_fraca" };
          throw new Error(c.error.message);
        }
        // Quando o e-mail já tem conta, o Supabase devolve um usuário sem "identities"
        if (c.data.user && (!c.data.user.identities || c.data.user.identities.length === 0)) return { situacao: "senha_errada" };
        if (c.data.session) return { situacao: "entrou" };
        return { situacao: "criou_confirmar" };
      },
      async sair() { await sb.auth.signOut(); },
    };
  }

  // ---------------------------------------------------------------
  // MODO DEMONSTRAÇÃO (dados no navegador)
  // ---------------------------------------------------------------
  function criarDemo() {
    const CHAVE = "agenda-pulga-demo-v6";
    const novoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

    function exemplo() {
      const d = (dias, hora, min = 0) => {
        const x = new Date(); x.setDate(x.getDate() + dias); x.setHours(hora, min, 0, 0); return x.toISOString();
      };
      const agora = new Date();
      const ini = new Date(agora.getTime() - 60 * 60 * 1000).toISOString();
      const fim = new Date(agora.getTime() + 2 * 60 * 60 * 1000).toISOString();
      const c1 = { id: novoId(), nome: "Maria Souza (exemplo)", funcao: "Assessora", telefone: "", email: "", foto_url: null, mostrar_no_site: true, ordem: 1 };
      const c2 = { id: novoId(), nome: "João Lima (exemplo)", funcao: "Mobilização", telefone: "", email: "", foto_url: null, mostrar_no_site: true, ordem: 2 };
      const p1 = { id: novoId(), nome: "Associação Xangô Capoeira", telefone: "", email: "", bairro: "" };

      // Primeiro álbum (o mesmo que o schema.sql cria no Supabase)
      const capoeira = {
        id: "7b3f1c2e-0000-4000-8000-000000000001",
        titulo: "Novos Bambas 2026 – Associação Xangô Capoeira",
        descricao: "Apoio ao evento de capoeira Novos Bambas 2026, com presença confirmada do Mestre Duda (Associação Xangô Capoeira) e organização do Mestre Maior.",
        data: "2026-11-20", capa_url: "assets/capoeira-novos-bambas.jpg", publicado: true,
      };
      const nb = (dia) => new Date(2026, 10, dia, 9, 0).toISOString();
      const nbFim = (dia) => new Date(2026, 10, dia, 18, 0).toISOString();
      const e = [
        { id: novoId(), titulo: "Visita à UBS do bairro (exemplo)", descricao: "Vistoria das obras de reforma e conversa com a equipe de saúde.", local: "UBS Centro", categoria: "Visita", inicio: ini, fim, publicado: true, projeto_id: null },
        { id: novoId(), titulo: "Mutirão de limpeza (exemplo)", descricao: "Ação com a comunidade na praça.", local: "Praça da Matriz", categoria: "Ação", inicio: d(-12, 8), fim: d(-12, 12), publicado: true, projeto_id: null },
        ...[20, 21, 22].map((dia, i) => ({
          id: novoId(), titulo: `Novos Bambas 2026 – dia ${i + 1}`,
          descricao: "Evento de capoeira com apoio do Pulga. Presença confirmada do Mestre Duda (Associação Xangô Capoeira). Organização: Mestre Maior.",
          local: "", categoria: "Apoio a projeto", inicio: nb(dia), fim: nbFim(dia), publicado: true, projeto_id: capoeira.id,
        })),
        { id: novoId(), titulo: "Audiência pública: transporte (exemplo)", descricao: "Debate sobre linhas de ônibus.", local: "Plenário", categoria: "Audiência", inicio: d(14, 19), fim: d(14, 21), publicado: true, projeto_id: null },
      ];
      return {
        eventos: e,
        colaboradores: [c1, c2],
        participantes: [p1],
        evento_colaboradores: [{ evento_id: e[0].id, colaborador_id: c1.id }, { evento_id: e[2].id, colaborador_id: c2.id }],
        evento_participantes: [{ evento_id: e[2].id, participante_id: p1.id }],
        projetos: [capoeira],
        albuns: [{ ...capoeira, projeto_id: capoeira.id }],
        midias: [{ id: novoId(), album_id: capoeira.id, tipo: "foto", url: "assets/capoeira-novos-bambas.jpg", legenda: "Cartaz do evento" }],
        admins: [{ email: "wcfarias.wf@gmail.com", nome: "Wagner", nivel: "geral" }],
        log: [],
        logado: false,
      };
    }

    function ler() {
      try {
        const s = localStorage.getItem(CHAVE);
        if (s) return JSON.parse(s);
      } catch (_) {}
      const x = exemplo(); gravar(x); return x;
    }
    function gravar(x) { try { localStorage.setItem(CHAVE, JSON.stringify(x)); } catch (_) {} }
    let mem = null;
    const db = () => (mem = mem || ler());
    const salvarTudo = () => gravar(db());

    const ordenar = (l, campo) => [...l].sort((a, b) => String(a[campo]).localeCompare(String(b[campo])));

    const api = {
      modo: "demo",
      async listarEventos() { return ordenar(db().eventos, "inicio"); },
      async ligacoesDoEvento(id) {
        return {
          colaboradores: db().evento_colaboradores.filter((x) => x.evento_id === id).map((x) => x.colaborador_id),
          participantes: db().evento_participantes.filter((x) => x.evento_id === id).map((x) => x.participante_id),
        };
      },
      async contagens() {
        const conta = (l) => l.reduce((m, x) => ((m[x.evento_id] = (m[x.evento_id] || 0) + 1), m), {});
        return { colaboradores: conta(db().evento_colaboradores), participantes: conta(db().evento_participantes) };
      },
      async salvarEvento(ev, colaboradorIds, participanteIds) {
        const d = db();
        let salvo;
        if (ev.id) {
          const i = d.eventos.findIndex((x) => x.id === ev.id);
          salvo = d.eventos[i] = { ...d.eventos[i], ...ev };
        } else {
          salvo = { ...ev, id: novoId() }; d.eventos.push(salvo);
        }
        d.evento_colaboradores = d.evento_colaboradores.filter((x) => x.evento_id !== salvo.id)
          .concat(colaboradorIds.map((c) => ({ evento_id: salvo.id, colaborador_id: c })));
        d.evento_participantes = d.evento_participantes.filter((x) => x.evento_id !== salvo.id)
          .concat(participanteIds.map((p) => ({ evento_id: salvo.id, participante_id: p })));
        salvarTudo(); return salvo;
      },
      async excluirEvento(id) {
        const d = db();
        d.eventos = d.eventos.filter((x) => x.id !== id);
        d.evento_colaboradores = d.evento_colaboradores.filter((x) => x.evento_id !== id);
        d.evento_participantes = d.evento_participantes.filter((x) => x.evento_id !== id);
        salvarTudo();
      },
      async listar(tabela) { return ordenar(db()[tabela], "nome"); },
      async salvar(tabela, item) {
        const d = db();
        if (item.id) {
          const i = d[tabela].findIndex((x) => x.id === item.id);
          d[tabela][i] = { ...d[tabela][i], ...item }; salvarTudo(); return d[tabela][i];
        }
        const novo = { ...item, id: novoId() }; d[tabela].push(novo); salvarTudo(); return novo;
      },
      async excluir(tabela, id) {
        const d = db();
        d[tabela] = d[tabela].filter((x) => x.id !== id);
        const col = tabela === "colaboradores" ? "colaborador_id" : "participante_id";
        const lig = tabela === "colaboradores" ? "evento_colaboradores" : "evento_participantes";
        d[lig] = d[lig].filter((x) => x[col] !== id);
        salvarTudo();
      },
      // ---- Projetos ----
      async listarProjetos() {
        return [...db().projetos].sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
      },
      async projeto(id) { return db().projetos.find((p) => p.id === id) || null; },
      async salvarProjeto(p) { return this.salvar("projetos", p); },
      async excluirProjeto(id) {
        const d = db();
        d.projetos = d.projetos.filter((p) => p.id !== id);
        d.eventos.forEach((e) => { if (e.projeto_id === id) e.projeto_id = null; });
        d.albuns.forEach((a) => { if (a.projeto_id === id) a.projeto_id = null; });
        salvarTudo();
      },
      // ---- Álbuns ----
      async listarAlbuns() {
        return [...db().albuns].sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
      },
      async album(id) { return db().albuns.find((a) => a.id === id) || null; },
      async salvarAlbum(a) { return this.salvar("albuns", a); },
      async excluirAlbum(id) {
        const d = db();
        d.albuns = d.albuns.filter((a) => a.id !== id);
        d.midias = d.midias.filter((m) => m.album_id !== id);
        salvarTudo();
      },
      async listarMidias(albumId) { return db().midias.filter((m) => m.album_id === albumId); },
      async contarMidias() {
        return db().midias.reduce((m, x) => ((m[x.album_id] = (m[x.album_id] || 0) + 1), m), {});
      },
      async adicionarMidia(m) {
        const nova = { ...m, id: novoId(), criado_em: new Date().toISOString() };
        db().midias.push(nova);
        try { localStorage.setItem(CHAVE, JSON.stringify(db())); }
        catch (e) { db().midias.pop(); throw new Error("Sem espaço no navegador (modo de teste). Use fotos menores."); }
        return nova;
      },
      async excluirMidia(m) { db().midias = db().midias.filter((x) => x.id !== m.id); salvarTudo(); },
      async removerArquivo() {},
      async enviarArquivo(arquivo) {
        if (!arquivo.type.startsWith("image/")) {
          throw new Error("No modo demonstração só é possível enviar fotos. Para vídeos, cole um link do YouTube.");
        }
        const url = await new Promise((ok, erro) => {
          const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = erro; r.readAsDataURL(arquivo);
        });
        return { url, caminho: null };
      },
      // ---- Administradores ----
      async listarAdmins() { return [...db().admins].sort((a, b) => a.email.localeCompare(b.email)); },
      async adicionarAdmin(a) {
        const email = a.email.toLowerCase();
        if (db().admins.some((x) => x.email === email)) throw new Error("Este e-mail já é administrador.");
        if (!(await this.souAdminGeral())) throw new Error("Só o administrador geral pode autorizar administradores.");
        const novo = { email, nome: a.nome || null, nivel: "admin" }; db().admins.push(novo); salvarTudo(); return novo;
      },
      async removerAdmin(email) {
        const alvo = db().admins.find((x) => x.email === email);
        if (!(await this.souAdminGeral()) || !alvo || alvo.nivel === "geral") throw new Error("Sem permissão.");
        db().admins = db().admins.filter((x) => x.email !== email); salvarTudo();
      },
      async souAdminGeral() {
        const l = db().logado; return !!l && db().admins.some((x) => x.email === l && x.nivel === "geral");
      },
      async listarLog() { return [...db().log].reverse(); },
      async criarConta(email) {
        if (!db().admins.some((x) => x.email === email.toLowerCase())) {
          throw new Error("Este e-mail ainda não foi autorizado. Peça a um administrador para incluí-lo.");
        }
        db().logado = email.toLowerCase(); salvarTudo(); return { precisaConfirmar: false };
      },
      async listarEquipePublica() {
        return db().colaboradores.filter((c) => c.mostrar_no_site !== false)
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || a.nome.localeCompare(b.nome))
          .map(({ id, nome, funcao, foto_url }) => ({ id, nome, funcao, foto_url }));
      },
      async usuarioAtual() {
        const l = db().logado; return l ? { email: typeof l === "string" ? l : "demo@exemplo.com" } : null;
      },
      async souAdmin() { return !!db().logado; },
      async entrar(email) {
        // No modo de teste a senha não é conferida, mas o e-mail precisa estar autorizado (igual ao site real)
        const e = (email || "").toLowerCase();
        if (!db().admins.some((x) => x.email === e)) throw new Error("E-mail não autorizado");
        db().logado = e; salvarTudo();
      },
      async entrarOuCriar(email) {
        try { await this.entrar(email); return { situacao: "entrou" }; }
        catch (_) { return { situacao: "nao_autorizado" }; }
      },
      async sair() { db().logado = false; salvarTudo(); },
    };

    // Registro de atividades no modo demonstração (no Supabase quem faz isso é o próprio banco)
    function registrar(acao, tabela, item) {
      const d = db();
      d.log.push({
        id: d.log.length + 1, quando: new Date().toISOString(), email: d.logado || "sistema", acao, tabela,
        registro_id: item && (item.id || item.email), resumo: item && (item.titulo || item.nome || item.legenda || item.email || ""),
      });
      if (d.log.length > 500) d.log.shift();
      salvarTudo();
    }
    const achar = (tabela, id) => (db()[tabela] || []).find((x) => x.id === id || x.email === id);
    const embrulhar = (nome, fn) => { const orig = api[nome].bind(api); api[nome] = async (...a) => fn(orig, ...a); };
    embrulhar("salvarEvento", async (o, ev, ...r) => { const s = await o(ev, ...r); registrar(ev.id ? "editou" : "criou", "eventos", s); return s; });
    embrulhar("excluirEvento", async (o, id) => { const it = achar("eventos", id); await o(id); registrar("apagou", "eventos", it); });
    embrulhar("salvar", async (o, t, item) => { const s = await o(t, item); registrar(item.id ? "editou" : "criou", t, s); return s; });
    embrulhar("excluir", async (o, t, id) => { const it = achar(t, id); await o(t, id); registrar("apagou", t, it); });
    embrulhar("excluirProjeto", async (o, id) => { const it = achar("projetos", id); await o(id); registrar("apagou", "projetos", it); });
    embrulhar("excluirAlbum", async (o, id) => { const it = achar("albuns", id); await o(id); registrar("apagou", "albuns", it); });
    embrulhar("adicionarMidia", async (o, m) => { const s = await o(m); registrar("criou", "midias", { ...s, legenda: s.legenda || (s.tipo === "video" ? "vídeo" : "foto") }); return s; });
    embrulhar("excluirMidia", async (o, m) => { await o(m); registrar("apagou", "midias", { ...m, legenda: m.legenda || m.tipo }); });
    embrulhar("adicionarAdmin", async (o, a) => { const s = await o(a); registrar("criou", "admins", s); return s; });
    embrulhar("removerAdmin", async (o, e) => { await o(e); registrar("apagou", "admins", { email: e }); });
    return api;
  }

  window.DB = usarSupabase ? criarSupabase() : criarDemo();

  // ---------------------------------------------------------------
  // Utilidades de data compartilhadas pelas páginas
  // ---------------------------------------------------------------
  window.UTIL = {
    situacao(ev, agora = new Date()) {
      const ini = new Date(ev.inicio);
      const fim = ev.fim ? new Date(ev.fim) : new Date(ini.getTime() + 60 * 60 * 1000);
      if (agora < ini) return "futuro";
      if (agora <= fim) return "agora";
      return "passado";
    },
    formatarData(iso) {
      if (!iso) return "";
      return new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    },
    formatarHora(iso) {
      return iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
    },
    // Converte ISO para o formato do <input type="datetime-local">
    paraInput(iso) {
      if (!iso) return "";
      const d = new Date(iso);
      const p = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    },
    deInput(v) { return v ? new Date(v).toISOString() : null; },
    // Transforma um link de vídeo em algo que dá para mostrar na página
    video(url) {
      const yt = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
      if (yt) return { tipo: "youtube", embed: `https://www.youtube.com/embed/${yt[1]}`, thumb: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` };
      if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || /\/storage\/v1\/object\/public\//.test(url)) return { tipo: "arquivo", embed: url };
      return { tipo: "link", embed: url };
    },
    formatarDia(data) {
      if (!data) return "";
      const [a, m, d] = String(data).slice(0, 10).split("-").map(Number);
      return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    },
    // Diminui fotos grandes antes de enviar (economiza espaço e deixa o site rápido)
    async reduzirFoto(arquivo, max = 1600) {
      if (!arquivo.type.startsWith("image/") || arquivo.type === "image/gif") return arquivo;
      const img = await new Promise((ok, erro) => {
        const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = URL.createObjectURL(arquivo);
      });
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.85));
      return new File([blob], (arquivo.name || "foto").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    },
    esc(s) {
      return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    },
  };
})();
