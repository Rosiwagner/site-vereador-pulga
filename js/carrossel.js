// Carrossel da página inicial: fotos passam sozinhas a cada 5 segundos.
(async function () {
  const caixa = document.getElementById("carrossel");
  if (!caixa) return;
  const { esc } = window.UTIL;
  let slides = [];
  try { slides = await DB.listarCarrossel(); } catch (e) { console.error(e); }
  if (!slides.length) return; // sem fotos cadastradas: fica o cartaz padrão

  caixa.innerHTML = `
    <div class="carrossel-trilho">
      ${slides.map((s, i) => `
        <div class="slide ${i === 0 ? "ativo" : ""}" role="group" aria-label="Foto ${i + 1} de ${slides.length}">
          <div class="slide-fundo" style="background-image:url('${esc(s.url)}')"></div>
          <img src="${esc(s.url)}" alt="${esc(s.legenda || "Foto " + (i + 1))}" ${i > 1 ? 'loading="lazy"' : ""}>
          ${s.legenda ? `<p class="slide-legenda">${esc(s.legenda)}</p>` : ""}
        </div>`).join("")}
    </div>
    ${slides.length > 1 ? `
      <button class="carrossel-seta anterior" aria-label="Foto anterior">‹</button>
      <button class="carrossel-seta proxima" aria-label="Próxima foto">›</button>
      <div class="carrossel-pontos">${slides.map((_, i) => `<button aria-label="Ir para a foto ${i + 1}" class="${i === 0 ? "ativo" : ""}"></button>`).join("")}</div>` : ""}`;

  if (slides.length < 2) return;
  const els = [...caixa.querySelectorAll(".slide")];
  const pontos = [...caixa.querySelectorAll(".carrossel-pontos button")];
  let atual = 0, timer = null;

  function ir(n) {
    atual = (n + els.length) % els.length;
    els.forEach((el, i) => el.classList.toggle("ativo", i === atual));
    pontos.forEach((p, i) => p.classList.toggle("ativo", i === atual));
  }
  const iniciar = () => { parar(); timer = setInterval(() => ir(atual + 1), 5000); };
  const parar = () => { if (timer) clearInterval(timer); timer = null; };

  caixa.querySelector(".anterior").addEventListener("click", () => { ir(atual - 1); iniciar(); });
  caixa.querySelector(".proxima").addEventListener("click", () => { ir(atual + 1); iniciar(); });
  pontos.forEach((p, i) => p.addEventListener("click", () => { ir(i); iniciar(); }));
  caixa.addEventListener("mouseenter", parar);
  caixa.addEventListener("mouseleave", iniciar);

  // Arrastar com o dedo no celular
  let x0 = null;
  caixa.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; parar(); }, { passive: true });
  caixa.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1));
    x0 = null; iniciar();
  });

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) iniciar();
})();
