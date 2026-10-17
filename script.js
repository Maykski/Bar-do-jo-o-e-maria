// ---------- Dados ----------
const produtos = [
  { id: 1,  categoria: "Cervejas", nome: "Cerveja Pilsen 600ml", preco: 12.00 },
  { id: 2,  categoria: "Cervejas", nome: "Cerveja Long Neck",    preco: 9.00 },
  { id: 3,  categoria: "Cervejas", nome: "Chope 300ml",          preco: 8.50 },
  { id: 4,  categoria: "Porções",  nome: "Porção de Fritas",     preco: 25.00 },
  { id: 5,  categoria: "Porções",  nome: "Calabresa Acebolada",  preco: 32.00 },
  { id: 6,  categoria: "Porções",  nome: "Isca de Frango",       preco: 38.00 },
  { id: 7,  categoria: "Drinks",   nome: "Caipirinha de Limão",  preco: 16.00 },
  { id: 8,  categoria: "Drinks",   nome: "Gin Tônica",           preco: 22.00 },
  { id: 9,  categoria: "Sem álcool", nome: "Refrigerante Lata",  preco: 6.00 },
  { id: 10, categoria: "Sem álcool", nome: "Água Mineral",       preco: 4.00 }
];
const CHAVES = { fiado: "bar_fiado", comanda: "bar_comanda", vendas: "bar_vendas", produtos: "bar_produtos" };

// localStorage com proteção contra falhas
function ler(chave, padrao) {
  try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; }
}
function salvar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ }
}

// Cardápio salvo (se existir) ou o padrão
const cardapio = (() => { const s = ler(CHAVES.produtos, null); if (Array.isArray(s) && s.length) return s; salvar(CHAVES.produtos, produtos); return produtos; })();
let clientesFiado = ler(CHAVES.fiado, []);   // [{ nome, saldoDevedor }]
let comanda = ler(CHAVES.comanda, []);       // [{ id, qtd }]
let vendas = ler(CHAVES.vendas, []);         // [{ data, total, forma, cliente? }]
let categoriaAtual = "Todos";

const $ = (id) => document.getElementById(id);
const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const arred = (n) => Math.round(n * 100) / 100;
function el(tag, props = {}, ...filhos) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  filhos.forEach(f => e.append(f));
  return e;
}
let tToast;
function aviso(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove("show"), 2800);
}
const totalComanda = () => arred(comanda.reduce((s, i) => s + cardapio.find(p => p.id === i.id).preco * i.qtd, 0));

function renderTabs() {
  const cats = ["Todos", ...new Set(cardapio.map(p => p.categoria))];
  $("tabs").replaceChildren(...cats.map(c => {
    const b = el("button", { className: "tab", textContent: c });
    b.setAttribute("aria-pressed", c === categoriaAtual);
    b.onclick = () => { categoriaAtual = c; renderTabs(); renderCardapio(); };
    return b;
  }));
}
function renderCardapio() {
  const lista = cardapio.filter(p => categoriaAtual === "Todos" || p.categoria === categoriaAtual);
  $("cardapio").replaceChildren(...lista.map(p => {
    const b = el("button", { className: "btn btn-amber", textContent: "Adicionar" });
    b.setAttribute("aria-label", "Adicionar " + p.nome);
    b.onclick = () => adicionar(p.id);
    return el("article", { className: "item" },
      el("h3", { textContent: p.nome }),
      el("div", { className: "row" }, el("span", { className: "preco", textContent: brl(p.preco) }), b));
  }));
}

function adicionar(id) {
  const existente = comanda.find(i => i.id === id);
  existente ? existente.qtd++ : comanda.push({ id, qtd: 1 });
  atualizarComanda();
}
function alterarQtd(id, delta) {
  const i = comanda.find(x => x.id === id);
  i.qtd += delta;
  if (i.qtd <= 0) comanda = comanda.filter(x => x.id !== id);
  atualizarComanda();
}
function remover(id) { comanda = comanda.filter(x => x.id !== id); atualizarComanda(); }

function atualizarComanda() { salvar(CHAVES.comanda, comanda); renderComanda(); }
function renderComanda() {
  const box = $("comanda");
  if (!comanda.length) {
    box.replaceChildren(el("p", { className: "vazio", textContent: "Nenhum item ainda. Toque em Adicionar no cardápio." }));
  } else {
    box.replaceChildren(...comanda.map(i => {
      const p = cardapio.find(x => x.id === i.id);
      const menos = el("button", { textContent: "−" }); menos.setAttribute("aria-label", "Diminuir " + p.nome); menos.onclick = () => alterarQtd(i.id, -1);
      const mais = el("button", { textContent: "+" });  mais.setAttribute("aria-label", "Aumentar " + p.nome);  mais.onclick = () => alterarQtd(i.id, 1);
      const rem = el("button", { className: "btn btn-ghost", textContent: "Remover" }); rem.style.minHeight = "34px"; rem.style.padding = "4px 10px";
      rem.setAttribute("aria-label", "Remover " + p.nome); rem.onclick = () => remover(i.id);
      return el("div", { className: "linha" },
        el("div", {}, el("b", { textContent: p.nome }), el("div", { className: "sub", textContent: brl(p.preco) + " cada" })),
        el("b", { textContent: brl(p.preco * i.qtd) }),
        el("div", { className: "qtd" }, menos, el("span", { textContent: i.qtd }), mais),
        rem);
    }));
  }
  $("total").textContent = brl(totalComanda());
}

function mostrarPasso(passo) {
  const fiado = passo === "fiado";
  $("passoEscolha").hidden = fiado; $("rodapeEscolha").hidden = fiado; $("passoFiado").hidden = !fiado;
  if (fiado) { $("erroNome").hidden = true; $("nomeCliente").value = ""; $("nomeCliente").focus(); }
}
$("fechar").onclick = () => {
  if (!comanda.length) return aviso("Adicione itens antes de fechar a conta.");
  $("fecharTotal").textContent = brl(totalComanda());
  $("sugestoes").replaceChildren(...clientesFiado.map(c => el("option", { value: c.nome })));
  mostrarPasso("escolha");
  $("dlgFechar").showModal();
};
$("limpar").onclick = () => { if (comanda.length && confirm("Limpar toda a comanda?")) { comanda = []; atualizarComanda(); } };

function registrarVenda(forma, cliente) {
  vendas.push({ data: new Date().toISOString(), total: totalComanda(), forma, ...(cliente ? { cliente } : {}) });
  salvar(CHAVES.vendas, vendas);
  comanda = []; atualizarComanda();
  $("dlgFechar").close();
}
$("pagarAgora").onclick = () => { const v = totalComanda(); registrarVenda("imediato"); aviso("Venda de " + brl(v) + " registrada com sucesso!"); };
$("irFiado").onclick = () => mostrarPasso("fiado");
$("voltar").onclick = () => mostrarPasso("escolha");
$("confirmarFiado").onclick = () => {
  const nome = $("nomeCliente").value.trim().replace(/\s+/g, " ");
  if (!nome) { $("erroNome").hidden = false; return $("nomeCliente").focus(); }
  const valor = totalComanda();
  let c = clientesFiado.find(x => x.nome.toLowerCase() === nome.toLowerCase());
  if (c) c.saldoDevedor = arred(c.saldoDevedor + valor);
  else clientesFiado.push({ nome, saldoDevedor: valor });
  salvar(CHAVES.fiado, clientesFiado);
  registrarVenda("fiado", nome);
  renderFiado();
  aviso(brl(valor) + " anotado na caderneta de " + nome + ".");
};
$("nomeCliente").addEventListener("keydown", e => { if (e.key === "Enter") $("confirmarFiado").click(); });

function renderFiado() {
  const devedores = clientesFiado.filter(c => c.saldoDevedor > 0).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  $("qtdDevedores").textContent = devedores.length;
  $("totalFiado").textContent = brl(arred(devedores.reduce((s, c) => s + c.saldoDevedor, 0)));
  $("listaFiado").replaceChildren(...(devedores.length ? devedores.map(c => {
    const b = el("button", { className: "btn btn-green", textContent: "Quitar dívida" });
    b.setAttribute("aria-label", "Quitar dívida de " + c.nome);
    b.onclick = () => {
      if (!confirm("Quitar " + brl(c.saldoDevedor) + " de " + c.nome + "?")) return;
      const v = c.saldoDevedor;
      clientesFiado = clientesFiado.filter(x => x !== c);
      salvar(CHAVES.fiado, clientesFiado); renderFiado();
      aviso("Dívida de " + c.nome + " quitada (" + brl(v) + ").");
    };
    return el("div", { className: "devedor" },
      el("div", {}, el("b", { textContent: c.nome }), el("span", { className: "valor", textContent: brl(c.saldoDevedor) })), b);
  }) : [el("p", { className: "vazio", textContent: "Ninguém devendo. A caderneta está limpa." })]));
}
$("abrirCaderneta").onclick = () => { renderFiado(); $("dlgCaderneta").showModal(); };


document.querySelectorAll("[data-fechar]").forEach(b => b.onclick = () => b.closest("dialog").close());
document.querySelectorAll("dialog").forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));


comanda = comanda.filter(i => cardapio.some(p => p.id === i.id));
renderTabs(); renderCardapio(); renderComanda(); renderFiado();