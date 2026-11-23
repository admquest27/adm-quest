import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { app, tela, esc, carregando } from './ui.js';
import { normalizar, paraSalvar, sortear, PADRAO } from './avatar.js';
import { htmlCriador, animarPrevia } from './criarAvatar.js';
import { htmlCartao } from './cartao.js';
import { criarMapaAluno } from './mapaAluno.js';
import { calcularCarteira, CONQUISTAS, podeComprar } from './economia.js';
import { htmlCarteira, visual, avatarComMoldura, conquistasNovas } from './carteira.js';
import { htmlVotacaoAluno, votar } from './votacoes.js';
import { htmlCasteloAluno, abrirBau } from './castelo.js';
import { htmlTutorial, htmlNovidade, jaViu, marcarVisto, TUTORIAL } from './tutorial.js';
import { ATV_GUILDA, configDaFase, configGuilda, atividadeDaFase, grupoDe, convitesPara, svgEscudo, nomeGuilda } from './grupos.js';
import {
  htmlFormacao, htmlGuilda, criarGrupo, aceitarConvite, recusarConvite, convidarMais, sairDoGrupo, desfazerGrupo, proporNome, confirmarProposta,
} from './gruposAluno.js';
import {
  MUNDO, SITUACAO_ROTULO, progId, contarTarefas, situacao, podeEditar, textoPlaca, etapasDe, etapaLiberada,
} from './fases.js';

// opcoes.uid + opcoes.aoSair: o professor vê o jogo como um aluno (somente leitura).
export function iniciarAluno(user, opcoes = {}) {
  const alvo = opcoes.uid ?? user.uid;
  const ver = Boolean(opcoes.uid);
  const ref = doc(db, 'alunos', alvo);
  const st = {
    dados: null, editandoAvatar: false, acesso: false, escolha: { ...PADRAO }, abaAv: 'corpo', prevAv: { escolha: { ...PADRAO }, giro: 0, pulo: 0 }, pedidoAv: 0,
    turma: null, fases: [], mundo: null, progresso: {}, aval: {}, recados: [], faseAberta: null, aviso: '',
    eco: null, carteira: null, compras: null, naCarteira: false,
    grupos: [], perfis: {}, naGuilda: false, montando: null, rascunho: null, perfilEnviado: '', tutorial: null,
    votacoes: [], meusVotos: {}, acertos: [], noMapa: false, voltarMapa: false,
  };
  let paradasAtivo = [];
  let mapa = null;

  const faixa = () => (ver ? `<div class="ver-faixa">Vendo como <strong>${esc(st.dados?.apelido ?? 'aluno')}</strong> (somente leitura) <button id="sair-ver" class="mini">Voltar ao painel</button></div>` : '');
  const mostrar = (html, classe) => tela(faixa() + html, classe);

  carregando('Procurando o cadastro...');

  const parar = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) { st.dados = null; pararDados(); telaPrimeiroAcesso(); return; }
      st.dados = snap.data();
      desenhar();
    },
    () => telaErro('Não consegui ler o cadastro. Tente de novo em instantes.')
  );

  // ---------- dados do jogo (só para aluno ativo) ----------
  function ligarDados() {
    if (paradasAtivo.length) return;
    // não redesenha enquanto o aluno digita o nome da guilda (perderia o foco)
    const redesenha = () => { if (st.dados?.status === 'ativo' && document.activeElement?.id !== 'gd-nome' && !document.activeElement?.dataset?.codigo) desenhar(); };
    const turma = st.dados.turma;
    paradasAtivo = [
      onSnapshot(doc(db, 'turmas', turma), (s) => { st.turma = s.exists() ? s.data() : null; redesenha(); }, () => {}),
      onSnapshot(doc(db, 'mundos', MUNDO), (s) => { st.mundo = s.exists() ? s.data() : null; redesenha(); }, () => {}),
      onSnapshot(query(collection(db, 'fases'), where('mundo', '==', MUNDO)), (s) => {
        st.fases = s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((f) => !f.arquivada).sort((a, b) => a.ordem - b.ordem);
        redesenha();
      }, () => {}),
      onSnapshot(query(collection(db, 'progresso'), where('uid', '==', alvo)), (s) => {
        st.progresso = {};
        s.docs.forEach((d) => { st.progresso[d.data().fase] = d.data(); });
        redesenha();
      }, () => {}),
      onSnapshot(query(collection(db, 'avaliacoes'), where('uid', '==', alvo)), (s) => {
        st.aval = {};
        s.docs.forEach((d) => { st.aval[d.data().fase] = d.data(); });
        redesenha();
      }, () => {}),
      onSnapshot(query(collection(db, 'comentarios'), where('uid', '==', alvo), where('visivel', '==', true)), (s) => {
        st.recados = s.docs.map((d) => d.data()).sort((a, b) => (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0));
        redesenha();
      }, () => {}),
      onSnapshot(doc(db, 'economia', 'geral'), (s) => { st.eco = s.exists() ? s.data() : null; redesenha(); }, () => {}),
      onSnapshot(doc(db, 'carteiras', alvo), (s) => { st.carteira = s.exists() ? s.data() : null; redesenha(); }, () => {}),
      onSnapshot(doc(db, 'compras', alvo), (s) => { st.compras = s.exists() ? s.data() : null; redesenha(); }, () => {}),
      onSnapshot(query(collection(db, 'grupos'), where('turma', '==', turma)), (s) => {
        st.grupos = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        redesenha();
      }, () => {}),
      onSnapshot(query(collection(db, 'votacoes'), where('turma', '==', turma)), (s) => { st.votacoes = s.docs.map((d) => ({ id: d.id, ...d.data() })); redesenha(); }, () => {}),
      onSnapshot(query(collection(db, 'votos'), where('uid', '==', alvo)), (s) => { st.meusVotos = Object.fromEntries(s.docs.map((d) => [d.data().votacao, d.data()])); redesenha(); }, () => {}),
      onSnapshot(query(collection(db, 'acertos'), where('turma', '==', turma)), (s) => { st.acertos = s.docs.map((d) => ({ id: d.id, ...d.data() })); redesenha(); }, () => {}),
      onSnapshot(query(collection(db, 'perfis'), where('turma', '==', turma)), (s) => {
        st.perfis = Object.fromEntries(s.docs.map((d) => [d.id, d.data()]));
        redesenha();
      }, () => {}),
    ];
  }

  function pararDados() {
    paradasAtivo.forEach((p) => p());
    paradasAtivo = [];
  }

  // ---------- telas ----------
  function telaErro(texto) {
    mostrar(`<section class="cartao"><h1>Ops</h1><p>${esc(texto)}</p><button id="sair" class="botao secundario">Sair</button></section>`, 'centro');
  }

  function telaPrimeiroAcesso(mensagem = '') {
    if (ver) { mostrar('<section class="cartao"><h1>Sem cadastro</h1><p>Este aluno ainda não tem cadastro.</p></section>', 'centro'); return; }
    mostrar(
      `<section class="cartao">
        <h1>Bem-vindo!</h1>
        <p class="sub">Digite o código da turma e escolha o seu apelido no jogo.</p>
        <form id="form-entrada" autocomplete="off">
          <label for="codigo">Código da turma</label>
          <input id="codigo" name="codigo" maxlength="10" autocapitalize="characters" required>
          <label for="apelido">Apelido (2 a 16 letras)</label>
          <input id="apelido" name="apelido" minlength="2" maxlength="16" required>
          <button class="botao" type="submit">Entrar na turma</button>
        </form>
        <p class="erro" id="msg">${esc(mensagem)}</p>
        <p class="nota">O jogo guarda só o seu apelido, o seu progresso e o e-mail da conta. Só o professor vê esses dados.</p>
        <button id="sair" class="botao secundario">Sair</button>
      </section>`,
      'centro'
    );
  }

  function desenhar() {
    const d = st.dados;
    if (!d) return;
    if (d.status !== 'ativo') pararDados();
    switch (d.status) {
      case 'ativo': return telaAtivo();
      case 'saiu':
        return mostrar('<section class="cartao"><h1>Até a próxima!</h1><p>Obrigado pela jornada. Foi bom ter você por aqui.</p><button id="sair" class="botao secundario">Sair</button></section>', 'centro');
      case 'bloqueado':
        return mostrar('<section class="cartao"><h1>Acesso pausado</h1><p>Converse com o professor para voltar ao jogo.</p><button id="sair" class="botao secundario">Sair</button></section>', 'centro');
      default:
        return mostrar(
          `<section class="cartao">
            <h1>Quase lá</h1>
            <p>Cadastro recebido, <strong>${esc(d.apelido)}</strong>! O professor precisa aprovar a sua entrada. Esta tela muda sozinha quando isso acontecer.</p>
            <button id="sair" class="botao secundario">Sair</button>
          </section>`,
          'centro'
        );
    }
  }

  function telaAtivo() {
    if (!st.acesso && !ver) {
      st.acesso = true;
      updateDoc(ref, { ultimoAcesso: serverTimestamp() }).catch(() => {});
    }
    ligarDados();
    if ((!st.dados.avatar || st.editandoAvatar) && !ver) return telaAvatar();
    sincronizarPerfil();
    if (!ver && st.tutorial === null && !jaViu(`admq-tut-${alvo}`)) st.tutorial = 0;
    if (st.tutorial !== null) return mostrar(`<section class="cartao largo">${htmlTutorial(st.tutorial)}</section>`, 'centro alto');
    const rec = st.turma?.recursos ?? {};
    if (st.naCarteira && rec.admbux) return telaCarteira();
    if (st.naGuilda && rec.guildas) return telaGuilda();
    if (st.faseAberta) return telaCartao();
    if (st.noMapa && rec.mapa) return telaMapa();
    mapa?.esconder();
    return telaLista();
  }

  // Mapa por cima da lista; a lista continua sendo o caminho simples (e o de quem tem celular mais fraco).
  function telaMapa() {
    if (!mapa) {
      mapa = criarMapaAluno({
        alvo, ver, turma: st.dados.turma,
        aoAbrirFase: (id) => { st.faseAberta = id; st.voltarMapa = true; st.noMapa = false; mapa.esconder(); st.aviso = ''; desenhar(); window.scrollTo(0, 0); },
        aoVoltar: () => { st.noMapa = false; mapa.esconder(); desenhar(); },
      });
    }
    mapa.mostrar(st);
  }

  const dataCurta = (ts) => (ts?.toMillis ? new Date(ts.toMillis()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '');

  function telaLista() {
    const estados = st.turma?.estadoFases ?? {};
    const textos = st.mundo?.textos ?? {};
    const linha = (f) => {
      const est = estados[f.id] ?? 'trancada';
      const cod = `<span class="cod">${esc(f.codigo)}</span><span class="nm">${esc(f.nome)}</span>`;
      if (est === 'aberta' || est === 'encerrada') {
        const p = st.progresso[f.id];
        const sit = situacao(f, p, st.aval[f.id], est);
        const { total, feitas } = contarTarefas(f, p);
        const cont = ['andamento', 'afazer', 'naoconcluida'].includes(sit) && total ? ` ${feitas}/${total}` : '';
        return `<li><button class="fase ${sit === 'afazer' ? 'afazer' : ''}" data-fase="${esc(f.id)}">${cod}<span class="chip sit-${sit}">${SITUACAO_ROTULO[sit]}${cont}</span></button></li>`;
      }
      const placa = est === 'adiada' ? textos.adiada : est === 'cancelada' ? textos.cancelada : textoPlaca(textos, f);
      return `<li><div class="fase obra e-${est}">${cod}<span class="placa">${esc(placa ?? 'Em obra.')}</span></div></li>`;
    };
    const itens = st.fases.filter((f) => f.tipo !== 'excel').map(linha).join('');
    const excelAbertos = st.fases.filter((f) => f.tipo === 'excel' && ['aberta', 'encerrada'].includes(estados[f.id] ?? 'trancada')).map(linha).join('');
    const gerais = st.recados.filter((r) => !r.fase);
    const c = carteira();
    const vis = visual(st.eco, st.compras);
    const conq = { ...CONQUISTAS, ...(st.eco?.conquistas ?? {}) };
    const rec = st.turma?.recursos ?? {};
    const novas = ver || !rec.admbux ? [] : conquistasNovas(alvo, c.conquistas).novas;
    const minhaGuilda = grupoDe(st.grupos, ATV_GUILDA, alvo);
    const pendentes = st.grupos.filter((g) => g.convites?.includes(alvo) && !grupoDe(st.grupos, g.atividade, alvo));
    const novidades = ver ? '' : ['admbux', 'guildas'].filter((id) => rec[id] && !jaViu(`admq-nov-${alvo}-${id}`)).map((id) => htmlNovidade(id, { saldo: c.saldo })).join('');
    // votações abertas e resultados de fases que ainda vão abrir
    const votos = st.votacoes.filter((v) => v.estado === 'aberta' || (v.vencedora && (estados[v.fase] ?? 'trancada') === 'trancada')).map((v) => htmlVotacaoAluno(v, st.meusVotos[v.id], ver)).join('');
    const avisoConvite = pendentes.length ? `<p class="banner">Você tem ${pendentes.length === 1 ? 'um convite' : `${pendentes.length} convites`} para entrar num grupo. ${pendentes.map((g) => (g.atividade === ATV_GUILDA ? (rec.guildas ? 'Veja em Guilda.' : '') : `Veja na fase ${esc(st.fases.find((f) => f.id === g.atividade)?.codigo ?? '')}.`)).join(' ')}</p>` : '';
    const avisoConq = novas.length ? `<div class="conquista-nova" role="status"><span class="trofeu" aria-hidden="true">🏆</span><div><strong>Conquista desbloqueada!</strong>${novas.map((id) => `<p>${esc(conq[id]?.nome ?? id)}: ${esc(conq[id]?.texto ?? '')} (+${c.V.conquista} AdmBux)</p>`).join('')}</div><button id="ok-conquista" class="mini">Legal!</button></div>` : '';
    const recados = gerais.length ? `<h2>Recados do professor</h2><ul class="lista">${gerais.map((r) => `<li class="reg ${r.tipoAtitude === 'atencao' ? 'atencao' : ''}"><span class="nota">${dataCurta(r.criadoEm)} · ${esc(r.marca)}</span><p>${esc(r.texto)}</p></li>`).join('')}</ul>` : '';
    mostrar(
      `<section class="cartao largo">
        ${avisoConq}
        <div class="cab-aluno ${vis.fundo ? `tem-fundo fundo-${esc(vis.fundo)}` : ''}">
          ${avatarComMoldura(st.dados.avatar, vis.moldura)}
          <div><strong>${esc(st.dados.apelido)}</strong>${vis.titulo ? `<br><span class="titulo-aluno">${esc(vis.titulo)}</span>` : ''}<br><span class="nota">${esc(st.turma?.nome ?? '')}</span></div>
          <div class="cab-botoes">${rec.admbux ? `<button id="abrir-carteira" class="mini moeda-btn" aria-label="Minhas AdmBux: ${c.saldo}">🪙 ${c.saldo}</button>` : ''}
          ${rec.guildas ? `<button id="abrir-guilda" class="mini guilda-btn" aria-label="Minha guilda">${minhaGuilda?.escudo ? svgEscudo(minhaGuilda.escudo, 18) : '🛡️'} Guilda</button>` : ''}
          ${ver ? '' : '<button id="trocar" class="mini">Avatar</button>'}</div>
        </div>
        ${novidades}${avisoConvite}${votos}
        <h2>${esc(st.mundo?.nome ?? 'Vila dos Planos')}</h2>
        ${rec.mapa ? '<button id="abrir-mapa" class="botao botao-mapa">Abrir o mapa da Vila</button>' : ''}
        <ul class="lista">${itens || '<li class="vazio">As fases ainda estão sendo preparadas.</li>'}</ul>
        ${excelAbertos ? `<h2>Trilha de Excel</h2><ul class="lista">${excelAbertos}</ul>` : ''}
        ${recados}
        ${ver ? '' : '<button id="ver-tutorial" class="link-btn">Como funciona o jogo</button><button id="sair" class="botao secundario">Sair</button>'}
      </section>`,
      'centro alto'
    );
  }

  function telaCartao() {
    const f = st.fases.find((x) => x.id === st.faseAberta);
    const est = st.turma?.estadoFases?.[st.faseAberta];
    if (!f || !(est === 'aberta' || est === 'encerrada')) { st.faseAberta = null; return telaLista(); }
    const a = st.aval[f.id];
    mostrar(htmlCartao({
      f, p: st.progresso[f.id], a, est, turma: st.turma, mundo: st.mundo, recados: st.recados, ver,
      editavel: !ver && podeEditar(est, a), aviso: st.aviso, grupoHtml: blocoExtra(f, est) + blocoGrupo(f),
    }), 'centro alto');
  }

  // Resultado da votação do cenário e, no chefão, o castelo com os baús.
  function blocoExtra(f, est) {
    let html = '';
    const v = st.votacoes.find((x) => x.fase === f.id);
    if (v) html += htmlVotacaoAluno(v, st.meusVotos[v.id], ver);
    if (f.tipo === 'chefao') html += htmlCasteloAluno({ f, fases: st.fases, estados: st.turma?.estadoFases, grupos: st.grupos, acertos: st.acertos, eu: alvo, ver, est });
    return html;
  }

  // Bloco "Seu grupo" no cartão da fase.
  function blocoGrupo(f) {
    const cfg = configDaFase(st.turma, f);
    if (!cfg) return '';
    const atv = atividadeDaFase(cfg, f);
    if (cfg.tipo === 'guilda') {
      const g = grupoDe(st.grupos, atv, alvo);
      const rec = st.turma?.recursos ?? {};
      const corpo = g
        ? `<div class="guilda-cab">${g.escudo ? svgEscudo(g.escudo, 40) : ''}<div><strong>${esc(nomeGuilda(g))}</strong><p class="nota">${g.membros.map((u) => esc(st.perfis[u]?.apelido ?? 'Colega')).join(', ')}</p></div></div>`
        : `<p class="nota">Você ainda não está numa guilda. ${rec.guildas ? 'Toque em Guilda, no topo da tela de fases.' : 'O professor vai organizar as guildas.'}</p>`;
      return `<div class="bloco-grupo"><h2>Sua guilda nesta fase</h2>${corpo}</div>`;
    }
    const ctx = { atv, cfg: configDaFase(st.turma, f), grupos: st.grupos, perfis: st.perfis, eu: alvo, ver, montando: st.montando?.atv === atv ? st.montando : null };
    return `<div class="bloco-grupo"><h2>${cfg.tamanho === 2 ? 'Sua dupla' : cfg.tamanho === 3 ? 'Seu trio' : 'Seu grupo'} nesta fase</h2>${htmlFormacao(ctx)}</div>`;
  }

  function ctxGuilda() {
    return { atv: ATV_GUILDA, cfg: configGuilda(st.turma), grupos: st.grupos, perfis: st.perfis, eu: alvo, ver, montando: st.montando?.atv === ATV_GUILDA ? st.montando : null, rascunho: st.rascunho, aviso: st.aviso };
  }

  function telaGuilda() {
    mostrar(htmlGuilda(ctxGuilda()), 'centro alto');
  }

  // Perfil que os colegas da turma veem (apelido, avatar e enfeites em uso), sempre igual ao cadastro.
  function sincronizarPerfil() {
    if (ver || !st.dados?.avatar) return;
    const u = st.compras?.usando ?? {};
    const perfil = { turma: st.dados.turma, apelido: st.dados.apelido, avatar: st.dados.avatar, visual: { titulo: u.titulo ?? '', moldura: u.moldura ?? '', fundo: u.fundo ?? '' } };
    const chave = JSON.stringify(perfil);
    if (chave === st.perfilEnviado) return;
    st.perfilEnviado = chave;
    setDoc(doc(db, 'perfis', alvo), { ...perfil, atualizadoEm: serverTimestamp() }).catch(() => { st.perfilEnviado = ''; });
  }

  async function acaoGrupo(b) {
    const g = st.grupos.find((x) => x.id === b.dataset.g);
    const acao = b.dataset.grupo;
    // atividade em que o aluno está agindo: a da fase aberta ou a guilda
    const f = st.faseAberta ? st.fases.find((x) => x.id === st.faseAberta) : null;
    const atv = st.naGuilda ? ATV_GUILDA : f ? atividadeDaFase(configDaFase(st.turma, f), f) : null;
    if (acao === 'montar') { st.montando = { atv, g: 'novo', sel: [] }; desenhar(); return; }
    if (acao === 'convidar') { st.montando = { atv, g: g.id, sel: [] }; desenhar(); return; }
    if (acao === 'cancelar') { st.montando = null; desenhar(); return; }
    if (acao === 'enviar') {
      const m = st.montando;
      if (m.g === 'novo') await criarGrupo({ atv: m.atv, turma: st.dados.turma, eu: alvo, convites: m.sel });
      else await convidarMais(st.grupos.find((x) => x.id === m.g), m.sel);
      st.montando = null; aviso(''); return;
    }
    if (acao === 'aceitar') { await aceitarConvite(g, alvo, convitesPara(st.grupos, g.atividade, alvo).filter((x) => x.id !== g.id)); return; }
    if (acao === 'recusar') { await recusarConvite(g, alvo); return; }
    if (acao === 'sair') { if (confirm('Sair deste grupo?')) await sairDoGrupo(g, alvo); return; }
    if (acao === 'desfazer') { if (confirm('Desfazer este grupo?')) await desfazerGrupo(g, alvo); return; }
    if (acao === 'propor') {
      const r = { nome: '', forma: 'classico', cor1: '#3b5bdb', cor2: '#e0a800', simbolo: '⭐', ...(st.rascunho ?? {}) };
      r.nome = (document.getElementById('gd-nome')?.value ?? r.nome).trim();
      if (r.nome.length < 2) { aviso('Escreva um nome com pelo menos 2 letras.'); return; }
      await proporNome(g, alvo, r); st.rascunho = null; aviso(''); return;
    }
    if (acao === 'confirmar') { await confirmarProposta(g, alvo); }
  }

  function carteira() {
    return calcularCarteira({ fases: st.fases, progresso: st.progresso, aval: st.aval, recados: st.recados, carteira: st.carteira, compras: st.compras, eco: st.eco });
  }

  function telaCarteira() {
    mostrar(htmlCarteira({ c: carteira(), eco: st.eco, compras: st.compras, avatar: st.dados.avatar, mundoAtual: MUNDO, ver, aviso: st.aviso }), 'centro alto');
  }

  async function comprar(id) {
    const item = { id, ...(st.eco?.loja?.[id] ?? {}) };
    const c = carteira();
    const pode = podeComprar(item, c.saldo, st.compras);
    if (!item.nome || !pode.ok) { aviso(pode.motivo ?? 'Item indisponível.'); return; }
    if (!confirm(`Comprar ${item.nome} por ${item.preco} AdmBux? O seu saldo fica em ${c.saldo - item.preco}.`)) return;
    const novo = { id, preco: item.preco, em: Date.now() };
    const ref2 = doc(db, 'compras', alvo);
    if (!st.compras) await setDoc(ref2, { uid: alvo, turma: st.dados.turma, itens: [novo], usando: { [item.tipo]: id }, atualizadoEm: serverTimestamp() });
    else await updateDoc(ref2, { itens: arrayUnion(novo), [`usando.${item.tipo}`]: id, atualizadoEm: serverTimestamp() });
    aviso('');
  }

  async function usar(id, tipo) {
    const emUso = st.compras?.usando?.[tipo] === id;
    await updateDoc(doc(db, 'compras', alvo), { [`usando.${tipo}`]: emUso ? '' : id, atualizadoEm: serverTimestamp() });
  }

  function telaAvatar() {
    st.prevAv.escolha = st.escolha;
    const pedido = ++st.pedidoAv;
    const rolagem = window.scrollY; const painel = document.querySelector('.av-painel')?.scrollTop ?? 0; const mesmaTela = Boolean(document.querySelector('.criador'));
    htmlCriador({ escolha: st.escolha, aba: st.abaAv, primeiraVez: !st.dados.avatar, erro: st.aviso })
      .then((html) => {
        if (pedido !== st.pedidoAv) return;
        mostrar(html, 'centro alto');
        if (mesmaTela) { window.scrollTo(0, rolagem); const p = document.querySelector('.av-painel'); if (p) p.scrollTop = painel; }
        animarPrevia(st.prevAv);
      })
      .catch(() => mostrar('<section class="cartao"><h1>Não consegui abrir a criação do avatar</h1><p>Confira a conexão e tente de novo.</p><button id="av-tentar" class="botao">Tentar de novo</button></section>', 'centro'));
  }

  // ---------- ações (um único ouvinte para a tela inteira) ----------
  function aviso(texto) {
    st.aviso = texto;
    const el = document.getElementById('msg');
    if (el) el.textContent = texto;
  }

  const refProg = (faseId) => doc(db, 'progresso', progId(alvo, faseId));
  const baseNova = (faseId) => ({ uid: alvo, turma: st.dados.turma, fase: faseId });

  async function marcarTarefa(faseId, etapaId, valor) {
    const p = st.progresso[faseId];
    const dados = { tarefas: { [etapaId]: valor }, atualizadoEm: serverTimestamp() };
    if (!p) Object.assign(dados, baseNova(faseId), { concluida: false });
    await setDoc(refProg(faseId), dados, { merge: true });
  }

  async function marcarResposta(faseId, etapaId, campoId, valor) {
    const p = st.progresso[faseId];
    const dados = { respostas: { [etapaId]: { [campoId]: valor } }, atualizadoEm: serverTimestamp() };
    if (!p) Object.assign(dados, baseNova(faseId), { tarefas: {}, concluida: false });
    await setDoc(refProg(faseId), dados, { merge: true });
  }

  async function alternarConcluida(faseId) {
    const f = st.fases.find((x) => x.id === faseId);
    const p = st.progresso[faseId];
    const nova = !p?.concluida;
    if (nova && f) {
      const todas = etapasDe(f);
      const pend = todas.filter((e) => e.semMarcar !== true && p?.tarefas?.[e.id] !== true);
      if (pend.length) {
        const visiveis = todas.map((e, i) => ({ e, n: i + 1 })).filter((x) => pend.includes(x.e) && etapaLiberada(st.turma, f.id, x.e));
        const travadas = pend.length - visiveis.length;
        aviso(`Ainda falta concluir ${pend.length} etapa(s)${visiveis.length ? ` (etapa ${visiveis.map((x) => x.n).join(', ')})` : ''}${travadas ? `. Há ${travadas} etapa(s) que o professor ainda vai liberar` : ''}.`);
        const lis = document.querySelectorAll('.etapa:not(.feita):not(.trava)');
        lis.forEach((li) => li.classList.add('destaque'));
        (lis[0] ?? document.getElementById('msg'))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => lis.forEach((li) => li.classList.remove('destaque')), 3500);
        return;
      }
    }
    const dados = { concluida: nova, concluidaEm: nova ? serverTimestamp() : null, atualizadoEm: serverTimestamp() };
    if (!p) Object.assign(dados, baseNova(faseId), { tarefas: {} });
    await setDoc(refProg(faseId), dados, { merge: true });
  }

  app.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    try {
      if (b.id === 'sair') { mapa?.destruir(); mapa = null; signOut(auth); return; }
      if (b.id === 'sair-ver') { mapa?.destruir(); mapa = null; opcoes.aoSair?.(); return; }
      if (b.id === 'abrir-mapa') { st.noMapa = true; st.aviso = ''; desenhar(); return; }
      if (b.dataset.fase) { st.faseAberta = b.dataset.fase; st.aviso = ''; desenhar(); return; }
      if (b.id === 'voltar') { st.faseAberta = null; st.aviso = ''; if (st.voltarMapa) { st.voltarMapa = false; st.noMapa = true; } desenhar(); return; }
      if (b.id === 'abrir-carteira') { st.naCarteira = true; st.aviso = ''; desenhar(); window.scrollTo(0, 0); return; }
      if (b.id === 'voltar-carteira') { st.naCarteira = false; st.aviso = ''; desenhar(); return; }
      if (b.id === 'tut-prox') { if (st.tutorial >= TUTORIAL.length - 1) { st.tutorial = null; marcarVisto(`admq-tut-${alvo}`); } else st.tutorial += 1; desenhar(); return; }
      if (b.id === 'tut-pular') { st.tutorial = null; marcarVisto(`admq-tut-${alvo}`); desenhar(); return; }
      if (b.id === 'ver-tutorial') { st.tutorial = 0; desenhar(); window.scrollTo(0, 0); return; }
      if (b.dataset.novidade) { marcarVisto(`admq-nov-${alvo}-${b.dataset.novidade}`); desenhar(); return; }
      if (b.id === 'abrir-guilda') { st.naGuilda = true; st.montando = null; st.aviso = ''; desenhar(); window.scrollTo(0, 0); return; }
      if (b.id === 'voltar-guilda') { st.naGuilda = false; st.montando = null; st.aviso = ''; desenhar(); return; }
      if (ver) return;
      if (b.dataset.grupo) { await acaoGrupo(b); return; }
      if (b.dataset.votar) { const v = st.votacoes.find((x) => x.id === b.dataset.votar); if (v) await votar(v, b.dataset.op, alvo, st.dados.turma); return; }
      if (b.dataset.abrirBau) {
        const f = st.fases.find((x) => x.id === st.faseAberta);
        const codigo = document.querySelector(`[data-codigo="${b.dataset.abrirBau}"]`)?.value;
        b.disabled = true;
        const erro = await abrirBau({ f, bau: b.dataset.abrirBau, codigo, grupo: b.dataset.g, uid: alvo, turma: st.dados.turma });
        b.disabled = false;
        const m = document.getElementById('msg-bau'); if (m) m.textContent = erro;
        return;
      }
      if (b.dataset.escudo) {
        st.rascunho = { nome: '', forma: 'classico', cor1: '#3b5bdb', cor2: '#e0a800', simbolo: '⭐', ...(st.rascunho ?? {}) };
        st.rascunho.nome = document.getElementById('gd-nome')?.value ?? st.rascunho.nome;
        st.rascunho[b.dataset.escudo] = b.dataset.v;
        desenhar(); return;
      }
      if (ver) return;
      if (b.id === 'concluir') { await alternarConcluida(st.faseAberta); return; }
      if (b.id === 'ok-conquista') { conquistasNovas(alvo, carteira().conquistas).marcar(); desenhar(); return; }
      if (b.dataset.comprar) { await comprar(b.dataset.comprar); return; }
      if (b.dataset.usar) { await usar(b.dataset.usar, b.dataset.tipo); return; }
      if (b.id === 'trocar') { st.escolha = normalizar(st.dados.avatar); st.abaAv = 'corpo'; st.editandoAvatar = true; desenhar(); return; }
      if (b.dataset.avC) { st.escolha = { ...st.escolha, [b.dataset.avC]: b.dataset.avV }; telaAvatar(); return; }
      if (b.dataset.avAba) { st.abaAv = b.dataset.avAba; telaAvatar(); return; }
      if (b.dataset.avGiro) { st.prevAv.giro += Number(b.dataset.avGiro); return; }
      if (b.dataset.avPulo) { st.prevAv.pulo = 24; return; }
      if (b.id === 'av-surpresa') { st.escolha = await sortear(); telaAvatar(); return; }
      if (b.id === 'av-tentar') { telaAvatar(); return; }
      if (b.id === 'cancelar') { st.editandoAvatar = false; desenhar(); return; }
      if (b.id === 'salvar') {
        const eraEdicao = st.editandoAvatar;
        st.editandoAvatar = false;
        try {
          await updateDoc(ref, { avatar: paraSalvar(st.escolha) });
        } catch {
          st.editandoAvatar = eraEdicao;
          aviso('Não consegui salvar agora. Tente de novo.');
        }
      }
    } catch {
      aviso('Não consegui salvar agora. Confira a conexão e tente de novo.');
    }
  };

  app.onchange = async (e) => {
    if (ver) return;
    const esc2 = e.target.closest('input[data-escolha]');
    if (esc2 && st.montando) {
      const u = esc2.dataset.escolha;
      st.montando.sel = esc2.checked ? [...st.montando.sel, u] : st.montando.sel.filter((x) => x !== u);
      desenhar();
      return;
    }
    const r = e.target.closest('textarea[data-resp]');
    if (r) {
      try { await marcarResposta(st.faseAberta, r.dataset.resp, r.dataset.campo, r.value.trim()); aviso(''); }
      catch { aviso('Não consegui salvar a resposta. Tente de novo.'); }
      return;
    }
    const c = e.target.closest('input[data-tarefa]');
    if (!c) return;
    try { await marcarTarefa(st.faseAberta, c.dataset.tarefa, c.checked); }
    catch { c.checked = !c.checked; aviso('Não consegui salvar. Tente de novo.'); }
  };

  app.oninput = (e) => {
    if (e.target.id === 'gd-nome') { st.rascunho = { forma: 'classico', cor1: '#3b5bdb', cor2: '#e0a800', simbolo: '⭐', ...(st.rascunho ?? {}), nome: e.target.value }; return; }
    if (e.target.id === 'codigo') e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  };

  app.onsubmit = async (e) => {
    if (e.target.id !== 'form-entrada') return;
    e.preventDefault();
    const msg = document.getElementById('msg');
    const cod = document.getElementById('codigo').value.trim().toUpperCase();
    const apelido = document.getElementById('apelido').value.trim();
    if (!/^[A-Z0-9]{4,10}$/.test(cod)) { msg.textContent = 'O código tem de 4 a 10 letras ou números.'; return; }
    if (apelido.length < 2 || apelido.length > 16) { msg.textContent = 'O apelido precisa ter de 2 a 16 letras.'; return; }
    msg.textContent = 'Conferindo o código...';
    try {
      const c = await getDoc(doc(db, 'codigos', cod));
      if (!c.exists()) { msg.textContent = 'Não encontrei esse código. Confira com o professor.'; return; }
      if (c.data().aberta !== true) { msg.textContent = 'Esta turma não está recebendo cadastros agora.'; return; }
      await setDoc(ref, { turma: c.data().turma, codigo: cod, apelido, status: 'pendente', criadoEm: serverTimestamp() });
    } catch {
      msg.textContent = 'Não deu certo. Confira o código e tente de novo.';
    }
  };

  return () => {
    parar();
    pararDados();
    mapa?.destruir(); mapa = null;
    app.onclick = null; app.onchange = null; app.oninput = null; app.onsubmit = null;
  };
}