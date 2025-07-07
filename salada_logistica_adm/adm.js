// Inicializa o Firebase com as configurações fornecidas.
firebase.initializeApp(firebaseConfig);

// Variáveis de controle do jogo.
let rodadaAtual = 0;
const totalRodadas = 8;
const tempoPorRodada = 50;
let tempoRestante = tempoPorRodada;
let intervalo = null; // Para o timer do ADM
let jogoFinalizado = false;

// Referências aos elementos HTML do ADM.
const btnIniciar = document.getElementById('btnIniciar');
const btnLimparRespostas = document.getElementById('btnLimparRespostas');
const timerDisplay = document.getElementById('timer');
const rodadaDisplay = document.getElementById('rodada');
const letraDisplay = document.getElementById('letra');
const tabelaRespostas = document.getElementById('tabelaRespostas');

function atualizarRodada() {
  rodadaDisplay.textContent = `Rodada: ${rodadaAtual} / ${totalRodadas}`;
}

function sortearLetra() {
  const letras = "ABCDEFGIJLMNOPRSTUV";
  const letra = letras[Math.floor(Math.random() * letras.length)];
  letraDisplay.textContent = "Letra: " + letra;
  db.ref("controle/letra").set(letra);
}

function encerrarJogo() {
  jogoFinalizado = true;
  clearInterval(intervalo);
  intervalo = null;
  btnIniciar.disabled = false;
  btnLimparRespostas.disabled = false;

  const mensagemFimJogo = '🏁 Fim do jogo! Clique em "Iniciar Jogo" para jogar novamente.';
  rodadaDisplay.textContent = `Rodada: ${totalRodadas} / ${totalRodadas}`;
  db.ref("controle").set({ emAndamento: false, rodadaAtual, letra: null, tempoRestante: 0, statusMessage: mensagemFimJogo });
}

function aguardarProximaRodada() {
  if (rodadaAtual < totalRodadas) {
    rodadaAtual++;
    atualizarRodada();
    db.ref("controle").update({ 
      emAndamento: false,
      statusMessage: "Aguardando ADM iniciar a próxima rodada..." 
    });
    btnIniciar.disabled = false;
    btnLimparRespostas.disabled = false;
  } else {
    encerrarJogo();
  }
}

function iniciarRodadaProcessamento() {
  if (jogoFinalizado) return;

  tempoRestante = tempoPorRodada;
  atualizarRodada();
  sortearLetra();

  btnLimparRespostas.disabled = true;
  db.ref(`rodadas/${rodadaAtual}`).remove();

  db.ref("controle").set({
    emAndamento: true,
    rodadaAtual,
    letra: letraDisplay.textContent.replace("Letra: ", ""),
    tempoRestante: tempoRestante,
    statusMessage: `Tempo restante: ${tempoRestante}s`
  });

  if (intervalo) clearInterval(intervalo);

  intervalo = setInterval(() => {
    db.ref("controle/emAndamento").once('value').then(snapshot => {
      if (snapshot.val() === false) {
        clearInterval(intervalo);
        intervalo = null;
        return;
      }
    });

    tempoRestante--;
    db.ref("controle").update({ 
      tempoRestante: tempoRestante,
      statusMessage: `Tempo restante: ${tempoRestante}s` 
    });

    if (tempoRestante <= 0) {
      clearInterval(intervalo);
      intervalo = null;
      db.ref("controle").update({ statusMessage: "Tempo esgotado!" });

      setTimeout(() => {
        aguardarProximaRodada();
      }, 1000);
    }
  }, 1000);
}

function iniciarRodadas() {
  if (jogoFinalizado) return;

  if (rodadaAtual > totalRodadas) {
    encerrarJogo();
    return;
  }

  // ⚠️ Se não está no início do jogo E não está rodando uma rodada atual
  // Isso cobre o caso de ter sido parado manualmente (STOP ou ADM)
  if (!intervalo && !jogoFinalizado && btnIniciar.disabled === false) {
    rodadaAtual++; // Avança para a próxima rodada
    atualizarRodada();
  }

  btnIniciar.disabled = true;
  btnLimparRespostas.disabled = true;

  iniciarRodadaProcessamento();
}

db.ref("controle/emAndamento").on("value", snapshot => {
  const emAndamento = snapshot.val();
  if (emAndamento === false && !jogoFinalizado && intervalo) {
    clearInterval(intervalo);
    intervalo = null;

    db.ref("controle/statusMessage").set(
      `⏸️ Rodada ${rodadaAtual} interrompida por um jogador. Clique em "Iniciar Jogo" para continuar.`
    );

    btnIniciar.disabled = false;
    btnLimparRespostas.disabled = false;
  }
});

function limparRespostas() {
  if (confirm("Tem certeza que deseja limpar todas as respostas do histórico? Esta ação é irreversível.")) {
    db.ref("rodadas").remove()
      .then(() => {
        alert("Histórico de respostas limpo com sucesso!");
        tabelaRespostas.innerHTML = "";
        db.ref("controle").set({ 
          emAndamento: false, 
          rodadaAtual: 0, 
          letra: null, 
          tempoRestante: 0, 
          statusMessage: "Histórico limpo! Aguardando ADM iniciar o jogo." 
        });
        rodadaAtual = 0;
        atualizarRodada();
        btnIniciar.disabled = false;
        btnLimparRespostas.disabled = false;
        jogoFinalizado = false;
        clearInterval(intervalo);
        intervalo = null;
      })
      .catch(error => {
        alert("Erro ao limpar respostas: " + error.message);
      });
  }
}

function atualizarTabela(snapshot) {
  const dados = snapshot.val();
  tabelaRespostas.innerHTML = "";
  if (!dados) return;

  const jogadores = Object.keys(dados);

  jogadores.forEach(jogador => {
    const jogadorHeader = document.createElement('tr');
    jogadorHeader.innerHTML = `<td colspan="3" style="background-color: var(--cinza-fundo-tabela); font-weight: bold; padding: 10px; text-align: center; border-bottom: 2px solid var(--rosa-medio);">${jogador}</td>`;
    tabelaRespostas.appendChild(jogadorHeader);

    const respostasDoJogador = dados[jogador];
    for (const categoria in respostasDoJogador) {
      const resposta = respostasDoJogador[categoria];
      if (categoria === 'parou' && typeof resposta === 'boolean') continue; 
      const row = `<tr><td></td><td>${categoria}</td><td>${resposta}</td></tr>`;
      tabelaRespostas.innerHTML += row;
    }
  });
}

db.ref("controle/rodadaAtual").on("value", snapshot => {
  const rodada = snapshot.val();
  db.ref(`rodadas/${rodada}`).on("value", atualizarTabela);
});

db.ref("controle").on("value", snapshot => {
  const controle = snapshot.val();
  if (controle && controle.statusMessage) {
    timerDisplay.textContent = controle.statusMessage;
    if (!controle.emAndamento && intervalo) {
      clearInterval(intervalo);
      intervalo = null;
      if (controle.statusMessage.includes("Aguardando ADM iniciar a próxima rodada...")) {
        btnIniciar.disabled = false;
        btnLimparRespostas.disabled = false;
      }
    }
  } else if (!controle) {
    timerDisplay.textContent = "Aguardando ADM iniciar o jogo...";
  }
});

btnIniciar.addEventListener('click', iniciarRodadas);
btnLimparRespostas.addEventListener('click', limparRespostas);

atualizarRodada();
db.ref("controle/statusMessage").once("value").then(snapshot => {
  if (!snapshot.val()) {
    timerDisplay.textContent = "Aguardando ADM iniciar o jogo...";
  }
});
