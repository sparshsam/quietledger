// ─── International Bank Format Registry ─────────────────────────────────────
//
// Format families (not individual banks) for broad global compatibility.
// Each family defines date/decimal rules and aliases in multiple languages.
// Headers are scored against known patterns to auto-detect the format.

export type DecimalStyle = "period" | "comma" | "space";
export type DateStyle =
  | "YYYY-MM-DD"
  | "DD/MM/YYYY"
  | "MM/DD/YYYY"
  | "DD-MM-YYYY"
  | "DD.MM.YYYY"
  | "YYYY/MM/DD"
  | "YYYYMMDD"
  | "DD Month YYYY"
  | "Month DD, YYYY";

export type DirectionRule =
  | "signed" // positive=credit, negative=debit
  | "debit_credit_split" // separate Debit and Credit columns
  | "debit_positive" // debits are positive, credits are negative
  | "type_column" // a Type/Transaction Type column indicates direction
  | "parentheses"; // (100.00) = debit, 100.00 = credit

export type BankFormat = {
  id: string;
  name: string; // Human-readable name
  country: string; // ISO 3166-1 alpha-2
  region: string; // e.g. "North America", "Europe", "Asia-Pacific"

  // Detection hints
  commonHeaders: string[]; // headers that strongly suggest this format
  locale: string; // BCP 47 locale for number formatting

  // Parsing rules
  dateStyle: DateStyle;
  datePriority: DateStyle[]; // fallback date styles to try
  decimalSeparator: string;
  thousandsSeparator: string;
  directionRule: DirectionRule;

  // Column aliases in the local language(s)
  aliases: {
    date: string[];
    description: string[];
    merchant: string[];
    debit: string[];
    credit: string[];
    amount: string[];
    balance: string[];
    currency: string[];
    account: string[];
    type: string[];
    reference: string[];
    category: string[];
    memo: string[];
    fees: string[];
    tax: string[];
  };
};

// ─── Format Families ────────────────────────────────────────────────────────

export const BANK_FORMATS: BankFormat[] = [
  // ── North America ───────────────────────────────────────────────────────
  {
    id: "na-generic",
    name: "North American CSV (US/Canada)",
    country: "US",
    region: "North America",
    commonHeaders: ["date", "description", "amount", "type"],
    locale: "en-US",
    dateStyle: "MM/DD/YYYY",
    datePriority: ["MM/DD/YYYY", "YYYY-MM-DD", "DD/MM/YYYY"],
    decimalSeparator: ".",
    thousandsSeparator: ",",
    directionRule: "type_column",
    aliases: {
      date: ["date", "posted date", "posting date", "transaction date", "trans date", "effective date", "trade date", "fecha"],
      description: ["description", "details", "transaction", "transaction description", "name", "payee", "narrative", "descripción", "descrição"],
      merchant: ["merchant", "merchant name", "vendor", "payee", "comerciante"],
      debit: ["debit", "debit amount", "debit amt", "withdrawal", "withdrawals", "withdrawal amount", "débito", "débit", "retiro"],
      credit: ["credit", "credit amount", "credit amt", "deposit", "deposits", "deposit amount", "crédito", "crédit", "depósito"],
      amount: ["amount", "transaction amount", "value", "cad", "usd", "monto", "importe", "valor", "summa", "betrag"],
      balance: ["balance", "running balance", "available balance", "ledger balance", "saldo", "solde"],
      currency: ["currency", "ccy", "cur", "divisa", "moneda", "devise", "währung", "valuta"],
      account: ["account", "account name", "account number", "card", "card number", "cuenta", "compte", "konto"],
      type: ["type", "transaction type", "txn type", "debit/credit", "dr/cr", "tipo", "tipo de operación"],
      reference: ["reference", "ref", "check number", "cheque number", "ref number", "referencia", "référence"],
      category: ["category", "personal category", "classification", "categoría", "catégorie", "kategorie"],
      memo: ["memo", "memo/description", "notes", "notas", "bemerkung"],
      fees: ["fees", "charges", "commission", "cargos", "comisión", "gebühren"],
      tax: ["tax", "gst", "hst", "vat", "iva", "impuesto"],
    },
  },

  // ── Canada-Specific ─────────────────────────────────────────────────────
  {
    id: "ca-generic",
    name: "Canadian CSV",
    country: "CA",
    region: "North America",
    commonHeaders: ["date", "description", "debit", "credit"],
    locale: "en-CA",
    dateStyle: "YYYY-MM-DD",
    datePriority: ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"],
    decimalSeparator: ".",
    thousandsSeparator: ",",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["date", "posted date", "transaction date", "trans date", "effective date"],
      description: ["description", "details", "memo", "transaction", "name", "payee", "narrative"],
      merchant: ["merchant", "merchant name", "vendor", "payee"],
      debit: ["debit", "debit amount", "withdrawal", "withdrawals"],
      credit: ["credit", "credit amount", "deposit", "deposits"],
      amount: ["amount", "transaction amount", "value", "cad"],
      balance: ["balance", "running balance", "available balance"],
      currency: ["currency", "ccy"],
      account: ["account", "account number", "card"],
      type: ["type", "transaction type", "debit/credit"],
      reference: ["reference", "ref", "cheque number"],
      category: ["category", "personal category"],
      memo: ["memo", "notes"],
      fees: ["fees", "charges"],
      tax: ["tax", "gst", "hst"],
    },
  },

  // ── United Kingdom / Europe (comma-decimal) ─────────────────────────────
  {
    id: "eu-standard",
    name: "European CSV Standard",
    country: "GB",
    region: "Europe",
    commonHeaders: ["date", "description", "money out", "money in"],
    locale: "en-GB",
    dateStyle: "DD/MM/YYYY",
    datePriority: ["DD/MM/YYYY", "DD-MM-YYYY", "DD.MM.YYYY", "YYYY-MM-DD"],
    decimalSeparator: ",",
    thousandsSeparator: ".",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["date", "datum", "data", "fecha", "datum", "päivä"],
      description: ["description", "details", "narrative", "beschreibung", "descripción", "descrição", "kuvaus", "beskrivelse"],
      merchant: ["merchant", "payee", "begünstigter", "beneficiario"],
      debit: ["debit", "money out", "withdrawal", "ausgabe", "débito", "débit", "belastung", "ausgang", "utgift", "meno"],
      credit: ["credit", "money in", "deposit", "einnahme", "ingreso", "crédit", "gutschrift", "eingang", "inkomst", "entrata"],
      amount: ["amount", "value", "betrag", "importe", "monto", "summa", "beløp", "määrä"],
      balance: ["balance", "saldo", "sald", "kontostand", "solde", "saldo"],
      currency: ["currency", "währung", "divisa", "devise", "valuta", "waluta"],
      account: ["account", "konto", "cuenta", "compte", "conto"],
      type: ["type", "art", "tipo", "typ"],
      reference: ["reference", "ref", "referenz", "référence", "rif."],
      category: ["category", "kategorie", "categoría"],
      memo: ["memo", "notes", "notizen", "bemerkung", "notas"],
      fees: ["fees", "gebühren", "cargos", "commissioni"],
      tax: ["tax", "vat", "mwst", "iva", "impôt"],
    },
  },

  // ── France ──────────────────────────────────────────────────────────────
  {
    id: "fr-standard",
    name: "French CSV Standard",
    country: "FR",
    region: "Europe",
    commonHeaders: ["date", "libellé", "débit", "crédit"],
    locale: "fr-FR",
    dateStyle: "DD/MM/YYYY",
    datePriority: ["DD/MM/YYYY", "DD-MM-YYYY"],
    decimalSeparator: ",",
    thousandsSeparator: " ",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["date", "date d'opération", "date de valeur"],
      description: ["libellé", "description", "détail", "motif", "narratif"],
      merchant: ["bénéficiaire", "tiers", "merchant"],
      debit: ["débit", "débit", "sortie", "retrait"],
      credit: ["crédit", "crédit", "entrée", "versement", "dépôt"],
      amount: ["montant", "somme", "valeur"],
      balance: ["solde", "solde cumulé"],
      currency: ["devise", "monnaie"],
      account: ["compte", "numéro de compte", "iban"],
      type: ["type", "catégorie d'opération"],
      reference: ["référence", "ref", "numéro de chèque"],
      category: ["catégorie", "classification"],
      memo: ["notes", "commentaire"],
      fees: ["frais", "commission"],
      tax: ["taxe", "tva"],
    },
  },

  // ── Germany ─────────────────────────────────────────────────────────────
  {
    id: "de-standard",
    name: "German CSV Standard (MT940/CSV)",
    country: "DE",
    region: "Europe",
    commonHeaders: ["buchungstag", "verwendungszweck", "umsatz"],
    locale: "de-DE",
    dateStyle: "DD.MM.YYYY",
    datePriority: ["DD.MM.YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
    decimalSeparator: ",",
    thousandsSeparator: ".",
    directionRule: "signed",
    aliases: {
      date: ["buchungstag", "buchungsdatum", "wertstellung", "datum", "valutadatum"],
      description: ["verwendungszweck", "buchungstext", "beschreibung", "text"],
      merchant: ["auftraggeber", "empfänger", "begünstigter", "zahlungsempfänger"],
      debit: ["soll", "ausgang", "belastung", "lastschrift"],
      credit: ["haben", "eingang", "gutschrift", "überweisung"],
      amount: ["umsatz", "betrag", "wert", "summe"],
      balance: ["saldo", "kontostand", "alter saldo"],
      currency: ["währung"],
      account: ["konto", "iban", "kontonummer"],
      type: ["art", "buchungsart"],
      reference: ["referenz", "kundenreferenz", "verwendungszweck 2"],
      category: ["kategorie"],
      memo: ["notiz", "bemerkung"],
      fees: ["gebühren", "entgelt"],
      tax: ["steuer", "umsatzsteuer"],
    },
  },

  // ── Netherlands ─────────────────────────────────────────────────────────
  {
    id: "nl-standard",
    name: "Dutch CSV Standard",
    country: "NL",
    region: "Europe",
    commonHeaders: ["datum", "omschrijving", "bedrag"],
    locale: "nl-NL",
    dateStyle: "DD-MM-YYYY",
    datePriority: ["DD-MM-YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
    decimalSeparator: ",",
    thousandsSeparator: ".",
    directionRule: "signed",
    aliases: {
      date: ["datum", "transactiedatum", "boekingsdatum", "valutadatum"],
      description: ["omschrijving", "mededeling", "naam", "tegenpartij"],
      merchant: ["naam", "tegenpartij"],
      debit: ["af", "bij"],
      credit: ["credit", "bij"],
      amount: ["bedrag", "euro"],
      balance: ["saldo", "nieuw saldo"],
      currency: ["valuta", "munt"],
      account: ["rekening", "iban", "rekeningnummer"],
      type: ["soort", "transactiesoort"],
      reference: ["referentie", "kenmerk"],
      category: ["categorie"],
      memo: ["notities", "opmerking"],
      fees: ["kosten"],
      tax: ["btw"],
    },
  },

  // ── Spain ───────────────────────────────────────────────────────────────
  {
    id: "es-standard",
    name: "Spanish CSV Standard",
    country: "ES",
    region: "Europe",
    commonHeaders: ["fecha", "concepto", "importe"],
    locale: "es-ES",
    dateStyle: "DD/MM/YYYY",
    datePriority: ["DD/MM/YYYY", "DD-MM-YYYY"],
    decimalSeparator: ",",
    thousandsSeparator: ".",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["fecha", "fecha operación", "fecha valor"],
      description: ["concepto", "descripción", "detalle", "observaciones"],
      merchant: ["beneficiario", "ordenante", "comercio"],
      debit: ["débito", "debe", "cargo", "gasto"],
      credit: ["crédito", "haber", "abono", "ingreso"],
      amount: ["importe", "cantidad", "valor", "euros"],
      balance: ["saldo", "saldo actual"],
      currency: ["divisa", "moneda"],
      account: ["cuenta", "número de cuenta", "ccc"],
      type: ["tipo", "código operación"],
      reference: ["referencia", "número de operación"],
      category: ["categoría"],
      memo: ["notas"],
      fees: ["comisiones", "gastos"],
      tax: ["impuestos", "iva"],
    },
  },

  // ── Italy ───────────────────────────────────────────────────────────────
  {
    id: "it-standard",
    name: "Italian CSV Standard",
    country: "IT",
    region: "Europe",
    commonHeaders: ["data", "descrizione", "importo"],
    locale: "it-IT",
    dateStyle: "DD/MM/YYYY",
    datePriority: ["DD/MM/YYYY", "DD-MM-YYYY"],
    decimalSeparator: ",",
    thousandsSeparator: ".",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["data", "data contabile", "data valuta", "data operazione"],
      description: ["descrizione", "causale", "dettaglio", "operazione"],
      merchant: ["beneficiario", "controparte", "mittente"],
      debit: ["dare", "uscita", "addebito", "prelievo"],
      credit: ["avere", "entrata", "accredito", "versamento"],
      amount: ["importo", "valore", "totale", "euro"],
      balance: ["saldo", "saldo contabile", "disponibilità"],
      currency: ["valuta", "divisa"],
      account: ["conto", "iban", "numero conto"],
      type: ["tipo", "categoria operazione"],
      reference: ["riferimento", "nr operazione"],
      category: ["categoria"],
      memo: ["note"],
      fees: ["commissioni", "spese"],
      tax: ["imposta", "bollo"],
    },
  },

  // ── Nordic (Sweden/Denmark/Norway) ──────────────────────────────────────
  {
    id: "nordic-standard",
    name: "Nordic CSV Standard",
    country: "SE",
    region: "Europe",
    commonHeaders: ["datum", "beskrivning", "belopp"],
    locale: "sv-SE",
    dateStyle: "YYYY-MM-DD",
    datePriority: ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY"],
    decimalSeparator: ",",
    thousandsSeparator: " ",
    directionRule: "signed",
    aliases: {
      date: ["datum", "transaktionsdatum", "bokföringsdatum", "dato"],
      description: ["beskrivning", "text", "förklaring", "meddelande", "forklaring"],
      merchant: ["motpart", "betalare", "mottagare"],
      debit: ["utgående", "uttag", "belastning"],
      credit: ["inkommande", "insättning", "kredit"],
      amount: ["belopp", "summa", "värde"],
      balance: ["saldo", "aktuellt saldo"],
      currency: ["valuta"],
      account: ["konto", "kontonummer"],
      type: ["typ", "transaktionstyp"],
      reference: ["referens", "meddelande"],
      category: ["kategori"],
      memo: ["anteckning", "notering"],
      fees: ["avgifter"],
      tax: ["skatt", "moms"],
    },
  },

  // ── Brazil ──────────────────────────────────────────────────────────────
  {
    id: "br-standard",
    name: "Brazilian CSV Standard (OFX/CSV)",
    country: "BR",
    region: "Latin America",
    commonHeaders: ["data", "lançamento", "valor"],
    locale: "pt-BR",
    dateStyle: "DD/MM/YYYY",
    datePriority: ["DD/MM/YYYY", "DD-MM-YYYY"],
    decimalSeparator: ",",
    thousandsSeparator: ".",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["data", "data lançamento", "data movimento"],
      description: ["lançamento", "descrição", "histórico", "detalhe"],
      merchant: ["favorecido", "beneficiário"],
      debit: ["débito", "saída", "retirada"],
      credit: ["crédito", "entrada", "depósito"],
      amount: ["valor", "montante", "total", "r$"],
      balance: ["saldo"],
      currency: ["moeda"],
      account: ["conta", "agência", "número conta"],
      type: ["tipo", "código"],
      reference: ["referência", "doc"],
      category: ["categoria"],
      memo: ["observação"],
      fees: ["tarifas", "taxas"],
      tax: ["imposto", "ir", "iof"],
    },
  },

  // ── Mexico ──────────────────────────────────────────────────────────────
  {
    id: "mx-standard",
    name: "Mexican CSV Standard",
    country: "MX",
    region: "Latin America",
    commonHeaders: ["fecha", "concepto", "cargo", "abono"],
    locale: "es-MX",
    dateStyle: "DD/MM/YYYY",
    datePriority: ["DD/MM/YYYY", "MM/DD/YYYY"],
    decimalSeparator: ".",
    thousandsSeparator: ",",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["fecha", "fecha de operación"],
      description: ["concepto", "descripción", "detalle"],
      merchant: ["beneficiario", "comercio"],
      debit: ["cargo", "débito", "salida"],
      credit: ["abono", "crédito", "entrada"],
      amount: ["importe", "monto", "cantidad", "valor"],
      balance: ["saldo"],
      currency: ["divisa", "moneda"],
      account: ["cuenta", "número de cuenta", "clabe"],
      type: ["tipo", "movimiento"],
      reference: ["referencia"],
      category: ["categoría"],
      memo: ["notas"],
      fees: ["comisiones"],
      tax: ["iva", "impuesto"],
    },
  },

  // ── Japan ───────────────────────────────────────────────────────────────
  {
    id: "jp-standard",
    name: "Japanese CSV Standard",
    country: "JP",
    region: "Asia-Pacific",
    commonHeaders: ["日付", "内容", "金額"],
    locale: "ja-JP",
    dateStyle: "YYYY/MM/DD",
    datePriority: ["YYYY/MM/DD", "YYYY-MM-DD", "MM/DD/YYYY"],
    decimalSeparator: ".",
    thousandsSeparator: ",",
    directionRule: "signed",
    aliases: {
      date: ["日付", "取引日", "処理日", "date"],
      description: ["内容", "摘要", "取引内容", "明細", "description", "details"],
      merchant: ["相手先", "加盟店", "merchant"],
      debit: ["お支払い", "引き落とし", "支出", "debit"],
      credit: ["お預かり", "入金", "収入", "credit"],
      amount: ["金額", "取引金額", "価額", "amount", "value"],
      balance: ["残高", "差引残高", "balance"],
      currency: ["通貨", "currency"],
      account: ["口座", "口座番号", "account", "口座名"],
      type: ["区分", "種別", "type"],
      reference: ["参照", "参照番号", "reference"],
      category: ["カテゴリ", "分類", "category"],
      memo: ["メモ", "備考", "memo"],
      fees: ["手数料", "fees"],
      tax: ["税金", "消費税", "tax"],
    },
  },

  // ── China ───────────────────────────────────────────────────────────────
  {
    id: "cn-standard",
    name: "Chinese CSV Standard",
    country: "CN",
    region: "Asia-Pacific",
    commonHeaders: ["交易日期", "摘要", "金额"],
    locale: "zh-CN",
    dateStyle: "YYYY/MM/DD",
    datePriority: ["YYYY/MM/DD", "YYYY-MM-DD", "MM/DD/YYYY"],
    decimalSeparator: ".",
    thousandsSeparator: ",",
    directionRule: "signed",
    aliases: {
      date: ["交易日期", "日期", "会计日期", "date"],
      description: ["摘要", "交易说明", "用途", "description", "details"],
      merchant: ["对方户名", "商户", "merchant"],
      debit: ["支出", "借方", "debit"],
      credit: ["收入", "贷方", "credit"],
      amount: ["金额", "交易金额", "发生额", "amount"],
      balance: ["余额", "账户余额", "balance"],
      currency: ["币种", "currency"],
      account: ["账号", "账户", "account"],
      type: ["类型", "交易类型", "type"],
      reference: ["参考号", "凭证号", "reference"],
      category: ["类别", "分类", "category"],
      memo: ["备注", "memo"],
      fees: ["手续费", "费用", "fees"],
      tax: ["税款", "tax"],
    },
  },

  // ── India ───────────────────────────────────────────────────────────────
  {
    id: "in-standard",
    name: "Indian CSV Standard",
    country: "IN",
    region: "Asia-Pacific",
    commonHeaders: ["date", "narration", "chq/ref no", "withdrawal", "deposit"],
    locale: "en-IN",
    dateStyle: "DD/MM/YYYY",
    datePriority: ["DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD"],
    decimalSeparator: ".",
    thousandsSeparator: ",",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["date", "transaction date", "txn date", "value date"],
      description: ["narration", "description", "particulars", "details", "transaction remarks"],
      merchant: ["beneficiary", "payee"],
      debit: ["withdrawal", "debit", "dr", "withdrawal amt"],
      credit: ["deposit", "credit", "cr", "deposit amt"],
      amount: ["amount", "txn amount", "value", "inr"],
      balance: ["balance", "closing balance", "available balance"],
      currency: ["currency"],
      account: ["account number", "ac no"],
      type: ["type", "txn type"],
      reference: ["chq/ref no", "cheque number", "ref no"],
      category: ["category"],
      memo: ["remarks", "notes"],
      fees: ["charges", "fee"],
      tax: ["gst", "tax"],
    },
  },

  // ── Australia / New Zealand ─────────────────────────────────────────────
  {
    id: "au-standard",
    name: "Australian CSV Standard",
    country: "AU",
    region: "Asia-Pacific",
    commonHeaders: ["date", "description", "debit", "credit"],
    locale: "en-AU",
    dateStyle: "DD/MM/YYYY",
    datePriority: ["DD/MM/YYYY", "YYYY-MM-DD", "MM/DD/YYYY"],
    decimalSeparator: ".",
    thousandsSeparator: ",",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["date", "transaction date", "posting date", "effective date"],
      description: ["description", "details", "narrative", "particulars", "reference"],
      merchant: ["merchant", "payee", "other party"],
      debit: ["debit", "withdrawal", "dr"],
      credit: ["credit", "deposit", "cr"],
      amount: ["amount", "value", "aud"],
      balance: ["balance", "available balance"],
      currency: ["currency", "ccy"],
      account: ["account", "bsb", "account number"],
      type: ["type", "transaction type"],
      reference: ["reference", "ref", "cheque number"],
      category: ["category"],
      memo: ["notes", "remarks"],
      fees: ["fees", "charges"],
      tax: ["gst", "tax"],
    },
  },

  // ── Switzerland ─────────────────────────────────────────────────────────
  {
    id: "ch-standard",
    name: "Swiss CSV Standard (ESR/ISO 20022)",
    country: "CH",
    region: "Europe",
    commonHeaders: ["buchungsdatum", "gutschrift", "lastschrift"],
    locale: "de-CH",
    dateStyle: "DD.MM.YYYY",
    datePriority: ["DD.MM.YYYY", "DD/MM/YYYY"],
    decimalSeparator: ".",
    thousandsSeparator: "'",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["buchungsdatum", "datum", "valutadatum", "date"],
      description: ["beschreibung", "buchungstext", "mitteilung", "zweck"],
      merchant: ["auftraggeber", "empfänger", "zahlungspflichtiger"],
      debit: ["lastschrift", "belastung", "soll"],
      credit: ["gutschrift", "haben", "eingang"],
      amount: ["betrag", "wert", "chf"],
      balance: ["saldo", "kontostand"],
      currency: ["währung", "devise"],
      account: ["konto", "iban", "kontonummer"],
      type: ["art", "buchungsart"],
      reference: ["referenz", "esr-nummer"],
      category: ["kategorie"],
      memo: ["notizen", "bemerkung"],
      fees: ["gebühren", "spesen"],
      tax: ["steuer", "mwst"],
    },
  },

  // ── Middle East (UAE/Saudi Arabia) ──────────────────────────────────────
  {
    id: "me-standard",
    name: "Middle East CSV Standard",
    country: "AE",
    region: "Middle East",
    commonHeaders: ["date", "description", "debit", "credit"],
    locale: "en-AE",
    dateStyle: "DD/MM/YYYY",
    datePriority: ["DD/MM/YYYY", "YYYY-MM-DD"],
    decimalSeparator: ".",
    thousandsSeparator: ",",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["date", "transaction date", "value date"],
      description: ["description", "details", "particulars", "narrative"],
      merchant: ["beneficiary", "payee"],
      debit: ["debit", "withdrawal", "dr"],
      credit: ["credit", "deposit", "cr"],
      amount: ["amount", "value", "aed", "sar"],
      balance: ["balance", "available balance"],
      currency: ["currency"],
      account: ["account", "iban"],
      type: ["type"],
      reference: ["reference", "cheque number"],
      category: ["category"],
      memo: ["remarks"],
      fees: ["charges"],
      tax: ["vat"],
    },
  },

  // ── Turkey ──────────────────────────────────────────────────────────────
  {
    id: "tr-standard",
    name: "Turkish CSV Standard",
    country: "TR",
    region: "Europe",
    commonHeaders: ["tarih", "açıklama", "tutar"],
    locale: "tr-TR",
    dateStyle: "DD/MM/YYYY",
    datePriority: ["DD/MM/YYYY", "DD-MM-YYYY"],
    decimalSeparator: ",",
    thousandsSeparator: ".",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["tarih", "işlem tarihi", "valör tarihi"],
      description: ["açıklama", "detay", "işlem detayı", "referans"],
      merchant: ["karşı taraf", "alacaklı", "borçlu"],
      debit: ["borç", "giden", "çekiş"],
      credit: ["alacak", "gelen", "yatırma"],
      amount: ["tutar", "meblağ", "değer", "tl"],
      balance: ["bakiye", "kalan bakiye"],
      currency: ["döviz", "para birimi"],
      account: ["hesap", "hesap no", "iban"],
      type: ["tür", "işlem türü"],
      reference: ["referans", "fiş no"],
      category: ["kategori"],
      memo: ["notlar"],
      fees: ["ücretler", "komisyon"],
      tax: ["vergi", "kdv"],
    },
  },

  // ── Philippines ─────────────────────────────────────────────────────────
  {
    id: "ph-standard",
    name: "Philippine CSV Standard",
    country: "PH",
    region: "Asia-Pacific",
    commonHeaders: ["date", "particulars", "amount"],
    locale: "en-PH",
    dateStyle: "MM/DD/YYYY",
    datePriority: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
    decimalSeparator: ".",
    thousandsSeparator: ",",
    directionRule: "signed",
    aliases: {
      date: ["date", "transaction date", "post date"],
      description: ["particulars", "description", "details", "narration", "reference"],
      merchant: ["payee"],
      debit: ["debit", "withdrawal"],
      credit: ["credit", "deposit"],
      amount: ["amount", "value", "php"],
      balance: ["balance", "running balance"],
      currency: ["currency"],
      account: ["account", "account number"],
      type: ["type"],
      reference: ["reference", "check number"],
      category: ["category"],
      memo: ["notes"],
      fees: ["fees", "service charge"],
      tax: ["tax", "vat"],
    },
  },

  // ── South Africa ────────────────────────────────────────────────────────
  {
    id: "za-standard",
    name: "South African CSV Standard",
    country: "ZA",
    region: "Africa",
    commonHeaders: ["date", "description", "debit", "credit"],
    locale: "en-ZA",
    dateStyle: "YYYY-MM-DD",
    datePriority: ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY"],
    decimalSeparator: ".",
    thousandsSeparator: ",",
    directionRule: "debit_credit_split",
    aliases: {
      date: ["date", "transaction date", "posting date"],
      description: ["description", "details", "particulars", "reference"],
      merchant: ["beneficiary", "payee"],
      debit: ["debit", "dr"],
      credit: ["credit", "cr"],
      amount: ["amount", "value", "zar"],
      balance: ["balance"],
      currency: ["currency"],
      account: ["account", "branch code"],
      type: ["type"],
      reference: ["reference", "cheque"],
      category: ["category"],
      memo: ["notes"],
      fees: ["fees", "service fee"],
      tax: ["vat"],
    },
  },

  // ── Nigeria ─────────────────────────────────────────────────────────────
  {
    id: "ng-standard",
    name: "Nigerian CSV Standard",
    country: "NG",
    region: "Africa",
    commonHeaders: ["date", "narration", "amount"],
    locale: "en-NG",
    dateStyle: "DD/MM/YYYY",
    datePriority: ["DD/MM/YYYY", "YYYY-MM-DD"],
    decimalSeparator: ".",
    thousandsSeparator: ",",
    directionRule: "signed",
    aliases: {
      date: ["date", "transaction date", "value date", "post date"],
      description: ["narration", "description", "details", "remark", "particulars"],
      merchant: ["beneficiary", "payee", "third party"],
      debit: ["debit", "withdrawal", "dr"],
      credit: ["credit", "deposit", "cr"],
      amount: ["amount", "value", "ngn"],
      balance: ["balance", "available balance"],
      currency: ["currency"],
      account: ["account", "account number", "nuban"],
      type: ["type", "transaction type"],
      reference: ["reference", "ref", "session id"],
      category: ["category"],
      memo: ["notes"],
      fees: ["charges", "vat on charge"],
      tax: ["vat", "withholding tax"],
    },
  },

  // ── Generic / International ─────────────────────────────────────────────
  {
    id: "generic-csv",
    name: "Generic CSV",
    country: "XX",
    region: "Global",
    commonHeaders: ["date", "description", "amount"],
    locale: "en-US",
    dateStyle: "YYYY-MM-DD",
    datePriority: ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY", "DD-MM-YYYY", "DD.MM.YYYY"],
    decimalSeparator: ".",
    thousandsSeparator: ",",
    directionRule: "signed",
    aliases: {
      date: ["date", "transaction date", "posting date", "effective date", "trade date", "datum"],
      description: ["description", "details", "transaction", "narrative", "particulars", "memo"],
      merchant: ["merchant", "payee", "vendor", "beneficiary"],
      debit: ["debit", "dr", "withdrawal", "debit amount"],
      credit: ["credit", "cr", "deposit", "credit amount"],
      amount: ["amount", "value", "sum", "total"],
      balance: ["balance", "running balance", "available balance"],
      currency: ["currency", "ccy"],
      account: ["account", "account number"],
      type: ["type", "txn type"],
      reference: ["reference", "ref", "ref number"],
      category: ["category"],
      memo: ["notes", "remarks"],
      fees: ["fees"],
      tax: ["tax", "vat"],
    },
  },
];

// ─── Utility ────────────────────────────────────────────────────────────────

/**
 * Detect the best bank format match from CSV headers.
 * Scores each format by how many of its commonHeaders appear in the file.
 */
export function detectBankFormat(headers: string[]): BankFormat {
  const normalizedHeaders = headers.map(normalizeAlias);

  let bestFormat: BankFormat = BANK_FORMATS[BANK_FORMATS.length - 1]; // generic fallback
  let bestScore = 0;

  for (const format of BANK_FORMATS) {
    let score = 0;

    for (const common of format.commonHeaders) {
      const normalizedCommon = normalizeAlias(common);
      if (normalizedHeaders.includes(normalizedCommon)) {
        score += 3; // Strong signal
      }
    }

    // Check aliases for more overlap
    const allAliases = Object.values(format.aliases).flat().map(normalizeAlias);
    for (const h of normalizedHeaders) {
      if (allAliases.includes(h)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestFormat = format;
    }
  }

  return bestFormat;
}

/**
 * Detect all possible currencies from CSV headers
 */
export function detectCurrencyFromHeaders(headers: string[]): string | null {
  const upper = headers.map((h) => h.toUpperCase().trim());
  for (const h of upper) {
    if (["USD", "EUR", "GBP", "CAD", "USDC", "USDT", "BTC", "ETH", "JPY", "AUD", "CHF", "CNY", "INR", "BRL", "MXN", "NGN", "ZAR", "AED", "SAR", "SEK", "NOK", "DKK", "PLN", "TRY", "KRW", "SGD", "HKD", "NZD", "MYR", "PHP", "IDR", "THB", "VND", "CZK", "HUF", "RON", "ILS", "CLP", "COP", "PEN"].includes(h)) {
      return h;
    }
  }
  return null;
}

function normalizeAlias(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Get a format by its ID
 */
export function getBankFormat(id: string): BankFormat | undefined {
  return BANK_FORMATS.find((f) => f.id === id);
}

/**
 * Get all formats for a country
 */
export function getFormatsForCountry(country: string): BankFormat[] {
  return BANK_FORMATS.filter((f) => f.country === country);
}

/**
 * Get all unique countries represented in the registry
 */
export function getFormatCountries(): string[] {
  return [...new Set(BANK_FORMATS.map((f) => f.country))].filter((c) => c !== "XX").sort();
}
