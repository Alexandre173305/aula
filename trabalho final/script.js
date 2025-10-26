/* ========= Utils ========= */
const LS = {
  get: (k, def = null) => {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : def;
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k),
};

/* ========= Cadastro ========= */
function cadastrar(event) {
  event.preventDefault();

  let nome = document.getElementById("nome").value;
  let email = document.getElementById("email").value;
  let senha = document.getElementById("senha").value;

  let usuario = { nome, email, senha };
  LS.set("usuario", usuario);

  alert("Cadastro realizado com sucesso!");
  window.location.href = "login.html";
}

/* ========= Login ========= */
function login(event) {
  event.preventDefault();

  let email = document.getElementById("email").value;
  let senha = document.getElementById("senha").value;

  let usuario = LS.get("usuario");

  if (usuario && usuario.email === email && usuario.senha === senha) {
    localStorage.setItem("logado", "true");
    alert("Login realizado com sucesso!");
    window.location.href = "index.html";
  } else {
    alert("Email ou senha incorretos!");
  }
}

function atualizarMenu() {
  let menu = document.getElementById("menu-login");
  if (!menu) return;

  let logado = localStorage.getItem("logado");

  if (logado === "true") {
    let usuario = LS.get("usuario");
    menu.innerHTML = `Olá, ${usuario.nome} | <a href="#" onclick="logout()">Sair</a>`;
  } else {
    menu.innerHTML = `<a href="login.html">Login</a> | <a href="cadastro.html">Cadastro</a>`;
  }
}

function logout() {
  localStorage.setItem("logado", "false");
  window.location.href = "index.html";
}

/* ========= Busca ========= */
function pesquisar() {
  let termo = document.getElementById("campoBusca").value.toLowerCase();
  let produtos = document.querySelectorAll(".produto");

  produtos.forEach(produto => {
    let nome = produto.querySelector("h3").innerText.toLowerCase();
    produto.style.display = nome.includes(termo) ? "block" : "none";
  });
}

/* ========= Carrinho ========= */
function obterCarrinho() {
  return LS.get("carrinho", []);
}

function salvarCarrinho(c) {
  LS.set("carrinho", c);
}

function adicionarAoCarrinho({ nome, preco }) {
  const carrinho = obterCarrinho();
  const existe = carrinho.find((p) => p.nome === nome);
  if (existe) {
    existe.quantidade += 1;
  } else {
    carrinho.push({ nome, preco, quantidade: 1 });
  }
  salvarCarrinho(carrinho);
  alert(`${nome} foi adicionado ao carrinho!`);
}

function removerDoCarrinho(nome) {
  let carrinho = obterCarrinho().filter((p) => p.nome !== nome);
  salvarCarrinho(carrinho);
  renderCarrinhoLista();
}

function alterarQtd(nome, delta) {
  const carrinho = obterCarrinho();
  const item = carrinho.find((p) => p.nome === nome);
  if (!item) return;
  item.quantidade += delta;
  if (item.quantidade <= 0) {
    carrinho.splice(carrinho.indexOf(item), 1);
  }
  salvarCarrinho(carrinho);
  renderCarrinhoLista();
}

function renderCarrinhoLista() {
  const ul = document.getElementById("lista-carrinho");
  if (!ul) return;
  const totalEl = document.getElementById("total");
  const carrinho = obterCarrinho();

  if (!carrinho.length) {
    ul.innerHTML = "<li>Seu carrinho está vazio.</li>";
    totalEl.textContent = "";
    return;
  }

  let total = 0;
  ul.innerHTML = carrinho.map((p) => {
    const subtotal = p.preco * p.quantidade;
    total += subtotal;
    return `
      <li class="linha-carrinho">
        <span>${p.nome}</span>
        <span>R$ ${p.preco.toFixed(2)} x ${p.quantidade}</span>
        <div class="qtd">
          <button onclick="alterarQtd('${p.nome}', -1)">-</button>
          <button onclick="alterarQtd('${p.nome}', 1)">+</button>
          <button onclick="removerDoCarrinho('${p.nome}')">Remover</button>
        </div>
      </li>`;
  }).join("");

  totalEl.textContent = "Total: R$ " + total.toFixed(2);
}

/* ========= Checkout ========= */
function initCheckoutPage() {
  const carrinho = obterCarrinho();
  if (!carrinho.length) {
    alert("Você precisa adicionar produtos antes de finalizar a compra.");
    window.location.href = "index.html";
    return;
  }
  renderResumoPedido(carrinho);

  const ultimo = LS.get("ultimoEndereco", null);
  if (ultimo) fillAddress(ultimo);

  const cepInput = document.getElementById("cep");
  if (cepInput) cepInput.addEventListener("blur", buscaCEP);

  const form = document.getElementById("checkout-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const endereco = collectAddress();
    if (!endereco.cep || !endereco.rua || !endereco.numero || !endereco.cidade || !endereco.estado || !endereco.pais) {
      alert("Preencha todos os campos obrigatórios do endereço.");
      return;
    }
    LS.set("ultimoEndereco", endereco);
    LS.del("carrinho");
    window.location.href = "finalizar.html";
  });
}

function renderResumoPedido(carrinho) {
  const ul = document.getElementById("resumo-itens");
  const totalEl = document.getElementById("resumo-total");
  if (!ul || !totalEl) return;

  let total = 0;
  ul.innerHTML = carrinho.map((p) => {
    const subtotal = p.preco * p.quantidade;
    total += subtotal;
    return `<li>${p.nome} (x${p.quantidade}) — R$ ${subtotal.toFixed(2)}</li>`;
  }).join("");
  totalEl.textContent = "Total: R$ " + total.toFixed(2);
}

function buscaCEP() {
  let cep = this.value.replace(/\D/g, "");
  if (cep.length !== 8) return;

  fetch(`https://viacep.com.br/ws/${cep}/json/`)
    .then((r) => r.json())
    .then((d) => {
      if (d.erro) {
        alert("CEP não encontrado.");
        return;
      }
      document.getElementById("rua").value = d.logradouro || "";
      document.getElementById("bairro").value = d.bairro || "";
      document.getElementById("cidade").value = d.localidade || "";
      document.getElementById("estado").value = d.uf || "";
      document.getElementById("pais").value = "Brasil";
    })
    .catch(() => alert("Erro ao buscar CEP."));
}

function collectAddress() {
  return {
    cep: (document.getElementById("cep")?.value || "").trim(),
    rua: (document.getElementById("rua")?.value || "").trim(),
    numero: (document.getElementById("numero")?.value || "").trim(),
    complemento: (document.getElementById("complemento")?.value || "").trim(),
    bairro: (document.getElementById("bairro")?.value || "").trim(),
    cidade: (document.getElementById("cidade")?.value || "").trim(),
    estado: (document.getElementById("estado")?.value || "").trim(),
    pais: (document.getElementById("pais")?.value || "").trim(),
  };
}

function fillAddress(a) {
  if (a.cep) document.getElementById("cep").value = a.cep;
  if (a.rua) document.getElementById("rua").value = a.rua;
  if (a.numero) document.getElementById("numero").value = a.numero;
  if (a.complemento) document.getElementById("complemento").value = a.complemento;
  if (a.bairro) document.getElementById("bairro").value = a.bairro;
  if (a.cidade) document.getElementById("cidade").value = a.cidade;
  if (a.estado) document.getElementById("estado").value = a.estado;
  if (a.pais) document.getElementById("pais").value = a.pais;
}

/* ========= Carrossel ========= */
let slideIndex = 0;
const slides = document.querySelectorAll(".carrossel .slide");
const prevBtn = document.querySelector(".carrossel .prev");
const nextBtn = document.querySelector(".carrossel .next");
const bolinhasContainer = document.querySelector(".carrossel .bolinhas");

if (slides.length) {
  slides.forEach((_, i) => {
    const bolinha = document.createElement("span");
    bolinha.addEventListener("click", () => mostrarSlide(i));
    bolinhasContainer.appendChild(bolinha);
  });

  const bolinhas = document.querySelectorAll(".carrossel .bolinhas span");

  function mostrarSlide(n) {
    slides.forEach(slide => slide.classList.remove("active"));
    bolinhas.forEach(b => b.classList.remove("active"));
    slideIndex = (n + slides.length) % slides.length;
    slides[slideIndex].classList.add("active");
    bolinhas[slideIndex].classList.add("active");
  }

  function slideProximo() { mostrarSlide(slideIndex + 1); }
  function slideAnterior() { mostrarSlide(slideIndex - 1); }

  nextBtn.addEventListener("click", slideProximo);
  prevBtn.addEventListener("click", slideAnterior);

  setInterval(slideProximo, 5000);
  mostrarSlide(slideIndex);
}

/* ========= Contador de Promoção ========= */
let tempoRestante = 2 * 60 * 60; // 2 horas em segundos
let intervalo = null;

function atualizarContador() {
  const horas = String(Math.floor(tempoRestante / 3600)).padStart(2, "0");
  const minutos = String(Math.floor((tempoRestante % 3600) / 60)).padStart(2, "0");
  const segundos = String(tempoRestante % 60).padStart(2, "0");

  const contadorEl = document.getElementById("contador");
  if (contadorEl) {
    contadorEl.innerText = `Acaba em: ${horas}:${minutos}:${segundos}`;
  }

  if (tempoRestante > 0) {
    tempoRestante--;
  } else {
    if (contadorEl) contadorEl.innerText = "Promoção encerrada!";
    clearInterval(intervalo);
  }
}

/* Inicia quando a página carregar */
document.addEventListener("DOMContentLoaded", () => {
  atualizarContador(); // mostra já o valor inicial
  intervalo = setInterval(atualizarContador, 1000); // atualiza a cada 1s
});


/* ========= Inicialização ========= */
document.addEventListener("DOMContentLoaded", () => {
  renderCarrinhoLista();
  atualizarMenu();
  if (document.getElementById("checkout-form")) initCheckoutPage();
});

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("toggle-theme");
  const body = document.body;

  if (btn) {
    if (localStorage.getItem("theme") === "dark") {
      body.classList.add("dark-mode");
      btn.textContent = "☀️";
    }

    btn.addEventListener("click", () => {
      body.classList.toggle("dark-mode");
      if (body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
        btn.textContent = "☀️";
      } else {
        localStorage.setItem("theme", "light");
        btn.textContent = "🌙";
      }
    });
  }
});
