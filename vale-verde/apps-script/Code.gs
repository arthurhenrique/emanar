/**
 * Morador Contribuinte Vale Verde — pré-cadastro.
 *
 * Cole este arquivo no editor do Apps Script da planilha
 * (Extensões → Apps Script) e publique como Web App.
 *
 * doPost: grava uma linha por cadastro.
 *         Com {"action":"relatorio","chave":"..."} devolve o relatório privado
 *         (nomes, contatos e sugestões), só para quem tem a chave.
 * doGet:  devolve apenas o total de casas únicas, ex.: {"total": 42}.
 *         Com ?view=parciais, devolve só contagens para a página de parciais
 *         (nunca nome, endereço, contato ou texto de sugestão).
 *
 * A chave do relatório fica na aba "Chave do relatório" da planilha, criada
 * sozinha com uma chave aleatória. Para trocar a chave, edite a célula A2.
 */

var SHEET_NAME = 'Cadastros';

var HEADERS = [
  'Data e hora',
  'Nome',
  'Endereço',
  'E-mail',
  'WhatsApp',
  'Já contribui',
  'Benefícios de interesse',
  'Sugestão',
  'Consentimento LGPD',
  'Endereço normalizado'
];

var ADDRESS_COLUMN = HEADERS.length; // última coluna: endereço normalizado

var MIN_HOUSES_FOR_DETAILS = 5;

var KEY_SHEET_NAME = 'Chave do relatório';
var MAX_WRONG_KEYS = 10;          // tentativas erradas...
var WRONG_KEY_WINDOW_S = 15 * 60; // ...a cada 15 minutos

// Benefícios na ordem da página. Nomes antigos contam para o nome atual.
var BENEFITS = [
  'Registro automático na cancela',
  'Recebimento de encomendas',
  'Casa vigiada em viagens',
  'Rondas e alertas no bairro',
  'Placa Morador Contribuinte',
  'Descontos no comércio local'
];
var BENEFIT_ALIASES = {
  'Tag ou leitura de placa': 'Registro automático na cancela',
  'Alerta de movimentação suspeita': 'Rondas e alertas no bairro',
  'Alerta de movimentação suspeita e rondas': 'Rondas e alertas no bairro',
  'Placa Morador Colaborador': 'Placa Morador Contribuinte'
};

function doGet(e) {
  reportKey_(); // garante que a aba da chave exista
  if (e && e.parameter && e.parameter.view === 'parciais') {
    return json_(parciais_());
  }
  return json_({ total: countHouses_() });
}

/**
 * Resumo agregado por casa (endereço normalizado). Quando a mesma casa
 * envia mais de uma vez, vale o envio mais recente.
 */
function parciais_(data, minimo) {
  data = data || collect_();
  minimo = minimo == null ? MIN_HOUSES_FOR_DETAILS : minimo;
  var houses = data.houses;
  var firstSeen = data.firstSeen;
  var rows = data.rows;

  var keys = Object.keys(houses);
  var result = {
    total: keys.length,
    envios: rows.length,
    atualizado_em: new Date().toISOString(),
    minimo: MIN_HOUSES_FOR_DETAILS
  };
  if (keys.length < minimo) return result;

  var contribui = { sim: 0, as_vezes: 0, nao: 0, sem_resposta: 0 };
  var votes = {};
  var bySegment = {};
  BENEFITS.forEach(function (b) {
    votes[b] = 0;
    bySegment[b] = { sim: 0, as_vezes: 0, nao: 0, sem_resposta: 0 };
  });
  var pairs = {};
  var others = {};
  var suggestions = 0;
  var perDay = {};
  var tz = Session.getScriptTimeZone() || 'America/Sao_Paulo';

  keys.forEach(function (key) {
    var h = houses[key];
    var segment = segment_(h.contribui);
    contribui[segment]++;

    var seen = {};
    benefitList_(h.beneficios).forEach(function (name) {
      seen[name] = true;
      if (votes.hasOwnProperty(name)) {
        votes[name]++;
        bySegment[name][segment]++;
      } else {
        others[name] = (others[name] || 0) + 1;
      }
    });

    // Pares de benefícios atuais escolhidos pela mesma casa
    var chosen = BENEFITS.filter(function (b) { return seen[b]; });
    for (var a = 0; a < chosen.length; a++) {
      for (var b = a + 1; b < chosen.length; b++) {
        var pk = chosen[a] + '|' + chosen[b];
        pairs[pk] = (pairs[pk] || 0) + 1;
      }
    }

    if (h.sugestao.trim()) suggestions++;

    var day = Utilities.formatDate(firstSeen[key], tz, 'yyyy-MM-dd');
    perDay[day] = (perDay[day] || 0) + 1;
  });

  result.contribui = contribui;
  result.beneficios = BENEFITS.map(function (b) {
    return { nome: b, votos: votes[b], por_contribuicao: bySegment[b] };
  });
  result.pares = Object.keys(pairs)
    .map(function (k) { var ab = k.split('|'); return { a: ab[0], b: ab[1], casas: pairs[k] }; })
    .sort(function (x, y) { return y.casas - x.casas; })
    .slice(0, 5);
  result.fora_da_votacao = Object.keys(others).map(function (b) { return { nome: b, votos: others[b] }; });
  result.sugestoes = suggestions;
  result.por_dia = Object.keys(perDay).sort().map(function (d) { return { dia: d, casas: perDay[d] }; });
  return result;
}

/** Lê a planilha e junta os envios por casa (vale o envio mais recente). */
function collect_() {
  var sheet = sheet_();
  var last = sheet.getLastRow();
  var rows = last < 2 ? [] : sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var houses = {};
  var firstSeen = {};
  for (var i = 0; i < rows.length; i++) {
    var key = String(rows[i][ADDRESS_COLUMN - 1] || '');
    if (!key) continue;
    var when = rows[i][0] instanceof Date ? rows[i][0] : new Date(rows[i][0]);
    if (!firstSeen[key] || when < firstSeen[key]) firstSeen[key] = when;
    if (!houses[key]) houses[key] = { envios: 0 };
    houses[key].envios++;
    if (!houses[key].when || when >= houses[key].when) {
      var h = houses[key];
      h.when = when;
      h.nome = String(rows[i][1] || '');
      h.endereco = String(rows[i][2] || '');
      h.email = String(rows[i][3] || '');
      h.whatsapp = String(rows[i][4] || '');
      h.contribui = String(rows[i][5] || '');
      h.beneficios = String(rows[i][6] || '');
      h.sugestao = String(rows[i][7] || '');
    }
  }
  return { rows: rows, houses: houses, firstSeen: firstSeen };
}

function segment_(answer) {
  var c = String(answer || '').toLowerCase();
  return c === 'sim' ? 'sim'
    : (c === 'às vezes' || c === 'as vezes') ? 'as_vezes'
    : (c === 'não' || c === 'nao') ? 'nao'
    : 'sem_resposta';
}

/** "a; b; Tag ou leitura de placa" -> nomes atuais, sem repetir. */
function benefitList_(text) {
  var out = [];
  var seen = {};
  String(text || '').split(';').forEach(function (raw) {
    var name = raw.trim();
    if (!name) return;
    name = BENEFIT_ALIASES[name] || name;
    if (seen[name]) return;
    seen[name] = true;
    out.push(name);
  });
  return out;
}

/** Chave do relatório: aba própria da planilha, criada com chave aleatória. */
function reportKey_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(KEY_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(KEY_SHEET_NAME);
    sheet.getRange('A1').setValue('Chave para abrir o relatório privado (pode trocar; não compartilhe):');
    sheet.getRange('A2').setValue(Utilities.getUuid().replace(/-/g, '').slice(0, 12));
    sheet.setColumnWidth(1, 520);
  }
  return String(sheet.getRange('A2').getValue() || '').trim();
}

function relatorio_(chave) {
  var cache = CacheService.getScriptCache();
  var wrong = Number(cache.get('relatorio_erros') || 0);
  if (wrong >= MAX_WRONG_KEYS) return { ok: false, error: 'bloqueado' };

  var key = reportKey_();
  if (!key || String(chave || '').trim() !== key) {
    cache.put('relatorio_erros', String(wrong + 1), WRONG_KEY_WINDOW_S);
    return { ok: false, error: 'chave_invalida' };
  }

  var data = collect_();
  var tz = Session.getScriptTimeZone() || 'America/Sao_Paulo';
  var iso = function (d) { return Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm:ss"); };

  var casas = Object.keys(data.houses).map(function (k) {
    var h = data.houses[k];
    return {
      nome: h.nome,
      endereco: h.endereco,
      email: h.email,
      whatsapp: h.whatsapp,
      contribui: segment_(h.contribui),
      beneficios: benefitList_(h.beneficios),
      sugestao: h.sugestao,
      primeiro_envio: iso(data.firstSeen[k]),
      ultimo_envio: iso(h.when),
      envios: h.envios
    };
  });

  // Todas as sugestões, inclusive de envios antigos da mesma casa
  var sugestoes = [];
  var seen = {};
  data.rows.forEach(function (r) {
    var texto = String(r[7] || '').trim();
    if (!texto) return;
    var k = String(r[ADDRESS_COLUMN - 1] || '') + '|' + texto.toLowerCase();
    if (seen[k]) return;
    seen[k] = true;
    var when = r[0] instanceof Date ? r[0] : new Date(r[0]);
    sugestoes.push({ data: iso(when), nome: String(r[1] || ''), endereco: String(r[2] || ''), contribui: segment_(r[5]), texto: texto });
  });
  sugestoes.sort(function (a, b) { return a.data < b.data ? 1 : -1; });

  return { ok: true, resumo: parciais_(data, 0), casas: casas, sugestoes: sugestoes };
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'invalid_json' });
  }

  if (data.action === 'relatorio') {
    return json_(relatorio_(data.chave));
  }

  // Honeypot preenchido: robô. Responde como sucesso e não grava nada.
  if (clean_(data.website, 200)) {
    return json_({ ok: true, total: countHouses_() });
  }

  var nome = clean_(data.nome, 120);
  var endereco = clean_(data.endereco, 200);
  var email = clean_(data.email, 160);
  var whatsapp = clean_(data.whatsapp, 30).replace(/[^\d+()\-\s]/g, '');
  var contribui = clean_(data.contribui, 20);
  var beneficios = Array.isArray(data.beneficios)
    ? data.beneficios.slice(0, 20).map(function (b) { return clean_(b, 80); }).filter(String).join('; ')
    : '';
  var sugestao = clean_(data.sugestao, 500);
  var consentimento = data.consentimento === true;

  if (!nome || !endereco) return json_({ ok: false, error: 'missing_name_or_address' });
  if (!email && !whatsapp) return json_({ ok: false, error: 'missing_contact' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json_({ ok: false, error: 'invalid_email' });
  if (whatsapp && whatsapp.replace(/\D/g, '').length < 10) return json_({ ok: false, error: 'invalid_whatsapp' });
  if (!consentimento) return json_({ ok: false, error: 'missing_consent' });
  if (['sim', 'nao', 'as_vezes', ''].indexOf(contribui) === -1) contribui = '';

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = sheet_();
    sheet.appendRow([
      new Date(),
      safe_(nome),
      safe_(endereco),
      safe_(email),
      safe_(whatsapp),
      { sim: 'Sim', nao: 'Não', as_vezes: 'Às vezes' }[contribui] || '',
      safe_(beneficios),
      safe_(sugestao),
      'Sim',
      normalizeAddress_(endereco)
    ]);
    SpreadsheetApp.flush();
    return json_({ ok: true, total: countHouses_() });
  } finally {
    lock.releaseLock();
  }
}

/** Conta casas únicas pelo endereço normalizado, não por envio. */
function countHouses_() {
  var sheet = sheet_();
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var values = sheet.getRange(2, ADDRESS_COLUMN, last - 1, 1).getValues();
  var seen = {};
  var total = 0;
  for (var i = 0; i < values.length; i++) {
    var key = String(values[i][0] || '');
    if (key && !seen[key]) {
      seen[key] = true;
      total++;
    }
  }
  return total;
}

/** "Rua das Flores, nº 12" e "rua das flores 12" viram a mesma casa. */
function normalizeAddress_(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\b(rua|r|avenida|av|alameda|al|travessa|tv|numero|num|no|n)\b\.?/g, ' ')
    .replace(/[º°ª]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function clean_(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

/** Evita que um texto começando com = + - @ vire fórmula na planilha. */
function safe_(text) {
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
