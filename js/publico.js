// Página inicial: eventos acontecendo agora, próximos, projetos, ações realizadas e calendário.
(async function () {
  const { situacao, formatarData, formatarHora, esc } = window.UTIL;
  if (DB.modo === "demo") document.getElementById("aviso-demo").hidden = false;

  let eventos = [];
  try {
    eventos = (await DB.listarEventos()).filter((e) => e.publicado !== false);
  } catch (e) {
    document.getElementById("lista-proximas").innerHTML =
      `<p class="vazio">Não foi possível carregar a agenda agora. Tente novamente mais tarde.</p>`;
    console.error(e);
  }

  ALBUNS.desenharProjetos(document.getElementById("lista-projetos"), { limite: 6 });
  ALBUNS.desenharLista(document.getElementById("lista-albuns"), { limite: 6 });

  function quando(ev) {
    const fim = ev.fim ? ` até ${formatarHora(ev.fim)}` : "";
    return formatarData(ev.inicio) + fim;
  }

  function cartao(ev) {
    const sit = situacao(ev);
    const rotulo = sit === "agora" ? "Agora" : (ev.categoria || "Ação");
    return `
      <button class="cartao evento ${sit}" data-id="${esc(ev.id)}">
        <span class="etiqueta ${sit === "agora" ? "agora" : ""}">${esc(rotulo)}</span>
        <h3>${esc(ev.titulo)}</h3>
        <div class="quando">${esc(quando(ev))}</div>
        ${ev.local ? `<div class="onde">📍 ${esc(ev.local)}</div>` : ""}
        ${ev.projeto_id ? `<div class="album-link">📌 Faz parte de um projeto</div>` : ""}
      </button>`;
  }

  const agora = eventos.filter((e) => situacao(e) === "agora");
  const proximas = eventos.filter((e) => situacao(e) === "futuro").slice(0, 9);
  const passadas = eventos.filter((e) => situacao(e) === "passado").reverse().slice(0, 6);

  document.getElementById("secao-agora").hidden = agora.length === 0;
  document.getElementById("lista-agora").innerHTML = agora.map(cartao).join("");
  document.getElementById("lista-proximas").innerHTML = proximas.length
    ? proximas.map(cartao).join("")
    : `<p class="vazio">Nenhuma ação agendada no momento.</p>`;
  document.getElementById("lista-passadas").innerHTML = passadas.length
    ? passadas.map(cartao).join("")
    : `<p class="vazio">As ações realizadas aparecerão aqui.</p>`;

  function abrir(id) {
    const ev = eventos.find((e) => String(e.id) === String(id));
    if (!ev) return;
    const sit = situacao(ev);
    const et = document.getElementById("d-etiqueta");
    et.textContent = sit === "agora" ? "Acontecendo agora" : sit === "passado" ? "Realizada" : (ev.categoria || "Ação");
    et.className = "etiqueta" + (sit === "agora" ? " agora" : "");
    document.getElementById("d-titulo").textContent = ev.titulo;
    document.getElementById("d-quando").textContent = quando(ev);
    document.getElementById("d-local").textContent = ev.local || "";
    document.getElementById("d-local-linha").hidden = !ev.local;
    document.getElementById("d-descricao").textContent = ev.descricao || "";
    const album = document.getElementById("d-album");
    album.hidden = !ev.projeto_id;
    if (ev.projeto_id) album.href = "projeto.html?id=" + encodeURIComponent(ev.projeto_id);
    document.getElementById("detalhes").showModal();
  }

  document.querySelectorAll(".evento").forEach((b) => b.addEventListener("click", () => abrir(b.dataset.id)));

  const pequeno = window.matchMedia("(max-width: 640px)").matches;
  const cal = new FullCalendar.Calendar(document.getElementById("calendario"), {
    locale: "pt-br",
    initialView: pequeno ? "listMonth" : "dayGridMonth",
    headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listMonth" },
    buttonText: { listMonth: "Lista" },
    height: "auto",
    noEventsText: "Nenhuma ação neste período",
    events: eventos.map((e) => ({
      id: e.id, title: e.titulo, start: e.inicio, end: e.fim || undefined,
      color: situacao(e) === "agora" ? "#f37321" : situacao(e) === "passado" ? "#29a8f2" : undefined,
    })),
    eventClick: (info) => { info.jsEvent.preventDefault(); abrir(info.event.id); },
  });
  cal.render();
})();
