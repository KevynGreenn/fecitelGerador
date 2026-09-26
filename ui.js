// =========================================================
// MELHORIAS DE INTERFACE
// Este arquivo so le o que o gerador (script.js) produz;
// nao altera nenhuma logica de geracao.
// =========================================================
(() => {
  // ---------- elementos da pagina ----------
  const codigo = document.getElementById("generated-code");       // CSS escrito pelo gerador
  const moldura = document.getElementById("preview-frame");        // caixa da figura
  const canvasEl = document.getElementById("canva");               // figura desenhada pelo gerador
  const coordenadas = document.getElementById("coordenadas");
  const paleta = document.getElementById("paleta");
  const contagemCores = document.getElementById("contagem-cores");
  const aviso = document.getElementById("aviso");
  const textoStatus = document.getElementById("texto-status");
  const tempoGeracao = document.getElementById("tempo-geracao");
  const estatisticas = document.getElementById("estatisticas-codigo");
  const botaoGrade = document.querySelector('[data-ferramenta="grade"]');
  const botaoAutomatico = document.querySelector('[data-ferramenta="automatico"]');
  const intervaloAutomatico = document.getElementById("intervalo-automatico");
  const barraProgresso = document.getElementById("barra-progresso-preenchimento");
  const animarCodigoCheck = document.getElementById("animar-codigo");
  const listaHistorico = document.getElementById("lista-historico");
  const janela = document.getElementById("janela-historico");
  const botaoGerar = document.querySelector('[data-action="generate"]'); // botao do gerador

  // ---------- estado ----------
  const MAX_HISTORICO = 12;
  let cssAtual = "";
  let avisoTimer = 0;
  let inicioGeracao = 0;
  let digitacao = 0;
  let automaticoAtivo = false;
  let inicioCiclo = performance.now();
  const historico = [];

  // ---------- utilidades ----------

  // Mostra a mensagem flutuante por 1,6 segundo
  function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.classList.add("visivel");
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => aviso.classList.remove("visivel"), 1600);
  }

  // Copia texto; usa um metodo alternativo se o navegador bloquear o clipboard
  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const area = document.createElement("textarea");
      area.value = texto;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
  }

  function rgbParaHex(r, g, b) {
    return "#" + [r, g, b].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  }

  function escapar(texto) {
    return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function atualizarStatus() {
    if (digitacao) textoStatus.textContent = "ESCREVENDO";
    else textoStatus.textContent = automaticoAtivo ? "AUTOMÁTICO" : "PRONTO";
  }

  // ---------- cores do codigo (realce de sintaxe) ----------
  function realcarLinha(linha) {
    const texto = escapar(linha);

    // "  propriedade: valor;"
    let m = texto.match(/^(\s*)([\w-]+)(:\s*)(.*?)(;?)$/);
    if (m) {
      let valor = `<span class="cod-valor">${m[4]}</span>`;
      if (/^rgb\(/.test(m[4])) {
        valor = `<span class="cod-amostra" style="--c:${m[4]}"></span>${valor}`;
      }
      return `${m[1]}<span class="cod-propriedade">${m[2]}</span>${m[3]}${valor}${m[5]}`;
    }

    // ".seletor {"
    m = texto.match(/^(\.[\w-]+)(\s*\{)$/);
    if (m) return `<span class="cod-seletor">${m[1]}</span><span class="cod-pontuacao">${m[2]}</span>`;

    // "}"
    if (texto.trim() === "}") return `<span class="cod-pontuacao">}</span>`;
    return texto;
  }

  // Escreve no <pre> sem disparar o observador (descarta as proprias mudancas)
  function escreverCodigo(html) {
    codigo.innerHTML = html;
    observador.takeRecords();
  }

  // ---------- animacao do codigo sendo escrito ----------
  function animarCodigo(linhas) {
    cancelAnimationFrame(digitacao);
    const duracao = automaticoAtivo ? Math.min(1800, Number(intervaloAutomatico.value) * 0.45) : 1800;
    const inicio = performance.now();
    let mostradas = -1;

    const passo = (agora) => {
      const progresso = Math.min((agora - inicio) / duracao, 1);
      const total = Math.ceil(progresso * linhas.length);
      if (total !== mostradas) {
        mostradas = total;
        const cursor = progresso < 1 ? '<span class="cursor-digitacao"></span>' : "";
        escreverCodigo(linhas.slice(0, total).join("\n") + cursor);
        codigo.scrollTop = codigo.scrollHeight;
      }
      if (progresso < 1) {
        digitacao = requestAnimationFrame(passo);
      } else {
        digitacao = 0;
        codigo.scrollTo({ top: 0, behavior: "smooth" });
        atualizarStatus();
      }
    };
    digitacao = requestAnimationFrame(passo);
    atualizarStatus();
  }

  // ---------- paleta de cores ----------
  function montarPaleta(css) {
    const cores = new Map();
    for (const [, r, g, b] of css.matchAll(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g)) {
      const hex = rgbParaHex(r, g, b);
      cores.set(hex, (cores.get(hex) || 0) + 1);
    }
    paleta.innerHTML = "";
    cores.forEach((usos, hex) => {
      const item = document.createElement("li");
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "amostra-cor";
      botao.style.setProperty("--c", hex);
      botao.title = `${hex.toUpperCase()} (${usos}x)`;
      botao.setAttribute("aria-label", `Copiar cor ${hex.toUpperCase()}`);
      botao.addEventListener("click", async () => {
        await copiarTexto(hex);
        mostrarAviso(`Cor ${hex.toUpperCase()} copiada`);
      });
      item.appendChild(botao);
      paleta.appendChild(item);
    });
    contagemCores.textContent = `${String(cores.size).padStart(2, "0")} CORES`;
  }

  // ---------- historico ----------
  function registrarHistorico(css) {
    const titulo = document.getElementById("challenge-number").textContent;
    historico.unshift({ titulo, imagem: canvasEl.toDataURL("image/png"), css });
    historico.length = Math.min(historico.length, MAX_HISTORICO);

    listaHistorico.innerHTML = "";
    historico.forEach((item, indice) => {
      const li = document.createElement("li");
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "item-historico" + (indice === 0 ? " atual" : "");
      botao.setAttribute("aria-label", `Rever ${item.titulo}`);
      botao.innerHTML = `<img src="${item.imagem}" alt=""><span>${item.titulo.replace("DESAFIO ", "")}</span>`;
      botao.addEventListener("click", () => abrirHistorico(item));
      li.appendChild(botao);
      listaHistorico.appendChild(li);
    });
  }

  function abrirHistorico(item) {
    document.getElementById("janela-titulo").textContent = item.titulo;
    document.getElementById("janela-imagem").src = item.imagem;
    document.getElementById("janela-codigo").innerHTML = item.css.split("\n").map(realcarLinha).join("\n");
    janela.showModal();
  }

  document.querySelector('[data-ferramenta="fechar-janela"]').addEventListener("click", () => janela.close());
  // Fecha ao clicar fora da janela
  janela.addEventListener("click", (evento) => {
    if (evento.target === janela) janela.close();
  });

  // ---------- reacao a cada novo desafio ----------

  // Marca o momento do clique/tecla que dispara o gerador, para medir o tempo
  window.addEventListener("click", (evento) => {
    if (evento.target.closest('[data-action="generate"]')) inicioGeracao = performance.now();
  }, true);
  // (so conta quando o gerador realmente vai gerar: ESPACO com foco na pagina)
  window.addEventListener("keydown", (evento) => {
    if (evento.code === "Space" && evento.target === document.body) inicioGeracao = performance.now();
  }, true);

  // Chamado sempre que o gerador escreve um novo CSS no <pre>
  function aoGerar() {
    const texto = codigo.textContent;
    if (!texto.includes("{")) return;
    cssAtual = texto;

    if (inicioGeracao) {
      tempoGeracao.textContent = `${(performance.now() - inicioGeracao).toFixed(1)} MS`;
      inicioGeracao = 0;
    }

    const linhas = cssAtual.split("\n");
    estatisticas.textContent = `${linhas.length} LINHAS · ${(cssAtual.length / 1024).toFixed(1)} KB`;

    const realcado = linhas.map(realcarLinha);
    if (animarCodigoCheck.checked && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animarCodigo(realcado);
    } else {
      cancelAnimationFrame(digitacao);
      digitacao = 0;
      escreverCodigo(realcado.join("\n"));
      codigo.scrollTop = 0;
      atualizarStatus();
    }

    montarPaleta(cssAtual);
    registrarHistorico(cssAtual);
    inicioCiclo = performance.now();
  }

  const observador = new MutationObserver(aoGerar);
  observador.observe(codigo, { childList: true, characterData: true, subtree: true });
  aoGerar();

  // ---------- modo automatico ----------
  function cicloAutomatico(agora) {
    if (!automaticoAtivo) return;
    const intervalo = Number(intervaloAutomatico.value);
    if (janela.open) inicioCiclo = agora; // pausa enquanto o historico esta aberto
    const progresso = Math.min((agora - inicioCiclo) / intervalo, 1);
    barraProgresso.style.transform = `scaleX(${progresso})`;
    if (progresso >= 1) {
      // Reinicia o ciclo antes de gerar: se algo falhar, nao tenta de novo a cada quadro
      inicioCiclo = agora;
      botaoGerar.click();
    }
    requestAnimationFrame(cicloAutomatico);
  }

  function alternarAutomatico() {
    automaticoAtivo = !automaticoAtivo;
    botaoAutomatico.setAttribute("aria-pressed", String(automaticoAtivo));
    botaoAutomatico.textContent = automaticoAtivo ? "❚❚ PAUSAR" : "▶ AUTOMÁTICO";
    barraProgresso.style.transform = "scaleX(0)";
    inicioCiclo = performance.now();
    if (automaticoAtivo) requestAnimationFrame(cicloAutomatico);
    atualizarStatus();
    mostrarAviso(automaticoAtivo
      ? `Modo automático: novo desafio a cada ${intervaloAutomatico.value / 1000}s`
      : "Modo automático pausado");
  }

  botaoAutomatico.addEventListener("click", alternarAutomatico);
  intervaloAutomatico.addEventListener("change", () => { inicioCiclo = performance.now(); });

  // ---------- tela cheia ----------
  async function alternarTelaCheia() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      document.body.classList.toggle("modo-apresentacao");
    }
  }

  // O canvas muda de tamanho; o proprio gerador redesenha no evento resize
  document.addEventListener("fullscreenchange", () => {
    document.body.classList.toggle("modo-apresentacao", Boolean(document.fullscreenElement));
  });
  document.querySelector('[data-ferramenta="tela-cheia"]').addEventListener("click", alternarTelaCheia);

  // ---------- nitidez do canvas ----------
  // O gerador so redesenha no evento "resize" da janela. Quando o canvas muda de
  // tamanho sem a janela mudar (barra de rolagem aparecendo, modo apresentacao...)
  // a figura ficaria esticada/borrada; entao avisamos o gerador.
  let larguraCanvas = canvasEl.clientWidth;
  let redimensionarTimer = 0;
  new ResizeObserver(() => {
    if (canvasEl.clientWidth === larguraCanvas) return;
    larguraCanvas = canvasEl.clientWidth;
    clearTimeout(redimensionarTimer);
    redimensionarTimer = setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
  }).observe(canvasEl);

  // ---------- grade, copiar e baixar ----------
  function alternarGrade() {
    const ativa = moldura.classList.toggle("com-grade");
    botaoGrade.setAttribute("aria-pressed", String(ativa));
  }

  async function copiarCss() {
    if (!cssAtual) return;
    await copiarTexto(cssAtual);
    mostrarAviso("CSS copiado para a área de transferência");
  }

  function baixarPng() {
    const numero = document.getElementById("challenge-number").textContent.replace(/\D/g, "") || "000";
    const link = document.createElement("a");
    link.href = canvasEl.toDataURL("image/png");
    link.download = `desafio-css-${numero}.png`;
    link.click();
    mostrarAviso("Imagem do desafio baixada");
  }

  botaoGrade.addEventListener("click", alternarGrade);
  document.querySelector('[data-ferramenta="copiar"]').addEventListener("click", copiarCss);
  document.querySelector('[data-ferramenta="baixar"]').addEventListener("click", baixarPng);

  // ---------- coordenadas do mouse na escala 800x800 ----------
  canvasEl.addEventListener("mousemove", (evento) => {
    const caixa = canvasEl.getBoundingClientRect();
    const px = Math.round(((evento.clientX - caixa.left) / caixa.width) * 800);
    const py = Math.round(((evento.clientY - caixa.top) / caixa.height) * 800);
    coordenadas.textContent = `X ${String(px).padStart(3, "0")} · Y ${String(py).padStart(3, "0")}`;
    coordenadas.classList.add("ativo");
  });
  canvasEl.addEventListener("mouseleave", () => {
    coordenadas.textContent = "800 × 800 px";
    coordenadas.classList.remove("ativo");
  });

  // ---------- atalhos de teclado (o ESPACO e tratado pelo gerador) ----------
  window.addEventListener("keydown", (evento) => {
    if (evento.ctrlKey || evento.metaKey || evento.altKey || evento.repeat || janela.open) return;
    const alvo = evento.target;
    if (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
    const tecla = evento.key.toLowerCase();
    if (tecla === "g") alternarGrade();
    else if (tecla === "c") copiarCss();
    else if (tecla === "a") alternarAutomatico();
    else if (tecla === "f") alternarTelaCheia();
  });
})();
