window.onload = function () {
  let nomeJogador = prompt("Digite seu nome:") || "Jogador";
  document.getElementById("nomeJogador").textContent = nomeJogador;

  const timerDisplay = document.getElementById('timer');
  const rodadaDisplay = document.getElementById('rodada');
  const letraSpan = document.getElementById('letra');
  const stopBtn = document.getElementById('btnStop');

  // ATUALIZAR ESTAS CATEGORIAS PARA CORRESPONDER AOS IDs NO HTML
  const categorias = [
    "Material",
    "Objeto encontrado em um armazém",
    "Profissão",
    "Empresa de entrega ou transporte",
    "Verbo usado na logística",
    "Equipamento de transporte ou movimentação",
    "Objeto de segurança no trabalho"
  ];

  let ultimaRodada = 0;
  let ultimoTempo = 0;
  let jogoEmAndamento = false;
  let letraAtual = "?";

  const inputTimeouts = {};

  console.log("Player.js carregado."); // Log de inicialização

  function configurarInputs(rodada, shouldClear = false) {
    console.log(`configurarInputs chamado. Rodada: ${rodada}, Deve Limpar: ${shouldClear}`); // Log ao chamar

    categorias.forEach(cat => {
      const input = document.getElementById(`cat-${cat}`);
      if (!input) { // Adicionado verificação para inputs não encontrados
          console.error(`Erro: Input com ID 'cat-${cat}' não encontrado!`);
          return; // Pula para a próxima categoria se o input não for encontrado
      }
      if (shouldClear) {
        console.log(`Limpando input para categoria: ${cat}`); // Log ao limpar
        input.value = "";
      }
      input.disabled = false;
      input.removeEventListener("input", handleInput);
      input.addEventListener("input", handleInput);
      console.log(`Input ${cat} configurado. Valor atual: "${input.value}"`); // Valor após configurar
    });
  }

  function handleInput(event) {
    const input = event.target;
    const cat = input.id.replace('cat-', ''); // Pega o ID sem 'cat-'
    const rodada = ultimaRodada; // Usa a última rodada conhecida

    console.log(`Evento 'input' no ${cat}. Valor digitado: "${input.value}"`); // Log ao digitar

    if (inputTimeouts[cat]) {
      clearTimeout(inputTimeouts[cat]);
      console.log(`Timeout anterior para ${cat} limpo.`); // Log debounce clear
    }

    inputTimeouts[cat] = setTimeout(() => {
      console.log(`Tentando enviar para Firebase para ${cat}: "${input.value}" na rodada ${rodada}`); // Log ao tentar enviar

      // Removida a condição if (rodada > 0) para garantir o envio
      db.ref(`rodadas/${rodada}/${nomeJogador}/${cat}`).set(input.value)
        .then(() => {
          console.log(`Sucesso ao enviar para Firebase: ${cat} - ${input.value}`);
        })
        .catch(error => {
          console.error(`Erro ao enviar para Firebase para ${cat}:`, error);
        });
    }, 300);
  }

  function bloquearInputs() {
    console.log("bloquearInputs chamado."); // Log ao bloquear
    categorias.forEach(cat => {
      const input = document.getElementById(`cat-${cat}`);
      if (!input) { // Adicionado verificação para inputs não encontrados
          console.error(`Erro: Input com ID 'cat-${cat}' não encontrado ao bloquear!`);
          return;
      }
      input.disabled = true;
    });
  }

  function escutarControleGeral() {
    db.ref("controle").on("value", snapshot => {
      const controle = snapshot.val();
      console.log("Firebase 'controle' atualizado:", controle); // Log de controle geral

      if (!controle) {
        console.log("Controle do Firebase está vazio.");
        return;
      }

      const novaRodada = controle.rodadaAtual;
      const novaLetra = controle.letra || "?";
      const novoEmAndamento = controle.emAndamento;

      rodadaDisplay.textContent = `Rodada: ${novaRodada}`;
      letraSpan.textContent = `Letra: ${novaLetra}`;

      // Lógica para habilitar/desabilitar e limpar inputs apenas quando o estado do jogo MUDAR
      // Ou se for a primeira vez que o jogo inicia (ultimaRodada === 0)
      if (novoEmAndamento && (!jogoEmAndamento || novaRodada !== ultimaRodada || novaLetra !== letraAtual)) {
          const shouldClear = (novaRodada !== ultimaRodada) || (novaLetra !== letraAtual) || (ultimaRodada === 0 && novaRodada > 0);
          configurarInputs(novaRodada, shouldClear);
          console.log(`Estado: Jogo iniciou ou mudou de rodada/letra. Rodada: ${novaRodada}, Letra: ${novaLetra}, Limpar inputs: ${shouldClear}`);
      } else if (!novoEmAndamento && jogoEmAndamento) { // Jogo acabou de parar
          bloquearInputs();
          console.log("Estado: Jogo parou.");
      } else if (novoEmAndamento && jogoEmAndamento) {
          // Jogo continua em andamento e não houve mudança de rodada/letra (apenas tempo atualizando)
          console.log("Estado: Jogo continua em andamento. Nenhuma alteração nos inputs.");
      }
      
      // Atualiza os estados para a próxima verificação
      ultimaRodada = novaRodada;
      letraAtual = novaLetra;
      jogoEmAndamento = novoEmAndamento;
    });
  }

  function escutarTempoRestante() {
    db.ref("controle/tempoRestante").on("value", snapshot => {
      const tempo = snapshot.val();
      console.log(`Firebase 'tempoRestante' atualizado: ${tempo}s`); // Log de tempo

      if (tempo !== null) {
        ultimoTempo = tempo;
        timerDisplay.textContent = `Tempo restante: ${tempo}s`;
      }
    });
  }

  stopBtn.addEventListener("click", () => {
    console.log("Botão STOP clicado."); // Log do STOP
    bloquearInputs();
    db.ref("controle").update({
      emAndamento: false,
      status: `Rodada interrompida por ${nomeJogador} na rodada ${ultimaRodada} com ${ultimoTempo}s restantes`
    });
    timerDisplay.textContent = `⏹️ Rodada ${ultimaRodada} encerrada por você com ${ultimoTempo}s no relógio! Respira fundo!`;
  });

  // Chame as funções de escuta separadamente
  escutarControleGeral();
  escutarTempoRestante();
};