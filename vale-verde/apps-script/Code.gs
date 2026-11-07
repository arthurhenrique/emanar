/**
 * Morador Contribuinte Vale Verde — pré-cadastro.
 *
 * Cole este arquivo no editor do Apps Script da planilha
 * (Extensões → Apps Script) e publique como Web App.
 *
 * doPost: grava uma linha por cadastro.
 * doGet:  devolve apenas o total de casas únicas, ex.: {"total": 42}.
 *         Com ?view=parciais, devolve só contagens para a página de parciais
 *         (nunca nome, endereço, contato ou texto de sugestão).
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
  if (e && e.parameter && e.parameter.view === 'parciais') {
    return json_(parciais_());
  }
  return json_({ total: countHouses_() });
}

/**
 * Resumo agregado por casa (endereço normalizado). Quando a mesma casa
 * envia mais de uma vez, vale o envio mais recente.
 */
function parciais_() {
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
    if (!houses[key] || when >= houses[key].when) {
      houses[key] = { when: when, contribui: String(rows[i][5] || ''), beneficios: String(rows[i][6] || ''), sugestao: String(rows[i][7] || '') };
    }
  }

  var keys = Object.keys(houses);
  var result = {
    total: keys.length,
    envios: rows.length,
    atualizado_em: new Date().toISOString(),
    minimo: MIN_HOUSES_FOR_DETAILS
  };
  if (keys.length < MIN_HOUSES_FOR_DETAILS) return result;

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
    var c = h.contribui.toLowerCase();
    var segment = c === 'sim' ? 'sim'
      : (c === 'às vezes' || c === 'as vezes') ? 'as_vezes'
      : (c === 'não' || c === 'nao') ? 'nao'
      : 'sem_resposta';
    contribui[segment]++;

    var seen = {};
    h.beneficios.split(';').forEach(function (raw) {
      var name = raw.trim();
      if (!name) return;
      name = BENEFIT_ALIASES[name] || name;
      if (seen[name]) return;
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

function doPost(e) {
  var data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'invalid_json' });
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
