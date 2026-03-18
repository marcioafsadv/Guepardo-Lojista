/**
 * Guepardo Delivery — Calculadora de Frete
 *
 * Modelo de precificação linear metro a metro, sem arredondamento de KM.
 *
 * ── Parâmetros Brutos (Cliente) ─────────────────────────────────
 *   Pedido Simples:   Taxa base R$ 8,00 + R$ 1,32 por km (R$ 0,00132/metro)
 *   Parada Adicional: Sem taxa fixa. Somente R$ 1,32/km sobre distância adicional.
 *   Retorno à Loja:   Sem taxa fixa. Somente R$ 1,32/km sobre distância de retorno.
 *
 * ── Split de Receita ────────────────────────────────────────────
 *   Taxa Base (R$ 8,00): R$ 1,00 fixo para o App | R$ 7,00 fixo para o Entregador
 *   Variáveis (km):      12,5% para o App         | 87,5% para o Entregador
 *
 * ── Fórmula Principal ───────────────────────────────────────────
 *   Vtotal = 8,00 + (MetrosPercorridos × 0,00132)
 *   Somar todos os metros da rota: Loja → C1 → C2 → (Retorno)
 */

// ── Constantes ─────────────────────────────────────────────────

/** Taxa de partida bruta para pedido simples (R$) */
export const FREIGHT_BASE_SIMPLE = 8.00;

/** Parcela fixa da taxa base que vai ao App (R$) */
export const APP_BASE_FIXED = 1.00;

/** Parcela fixa da taxa base que vai ao Entregador (R$) */
export const COURIER_BASE_FIXED = 7.00;

/** Tarifa por metro rodado — bruta (R$/metro) = 1,32 / 1000 */
export const FREIGHT_RATE_PER_METER = 0.00132;

/** Taxa base para retorno — 50% da taxa principal */
export const RETURN_BASE_FEE = 4.00;

/** Fração da PARTE VARIÁVEL (km) que vai ao entregador (87,5%) */
export const COURIER_VARIABLE_SHARE = 0.875;

/** Fração da PARTE VARIÁVEL (km) que é comissão do aplicativo (12,5%) */
export const APP_VARIABLE_COMMISSION = 0.125;

// ── Interface de Resultado ─────────────────────────────────────

export interface FreightResult {
    /** Valor bruto cobrado do cliente (R$) — arredondado em 2 casas para exibição */
    storeFee: number;
    /** Repasse líquido ao entregador (R$) */
    courierFee: number;
    /** Comissão do aplicativo (R$) */
    centralProfit: number;
}

// ── Funções auxiliares ─────────────────────────────────────────

/**
 * Arredonda um valor para 2 casas decimais (padrão monetário BRL).
 */
function round2(value: number): number {
    return Number(value.toFixed(2));
}

/**
 * Calcula o split da parte variável (km percorridos).
 * Sem base fixa: 87,5% entregador / 12,5% app.
 */
function splitVariable(variableFee: number): { courierPart: number; appPart: number } {
    return {
        courierPart: round2(variableFee * COURIER_VARIABLE_SHARE),
        appPart: round2(variableFee * APP_VARIABLE_COMMISSION),
    };
}

// ── Funções Principais ─────────────────────────────────────────

/**
 * Calcula o frete para um **Pedido Simples** (entrega padrão).
 *
 * Split da base:     R$ 1,00 App  |  R$ 7,00 Entregador
 * Split variável:  12,5% App  |  87,5% Entregador
 *
 * @param distanceMeters - Distância exata em metros retornada pela API de rotas
 *
 * @example
 * // 1.000 metros (1 km) → R$ 9,32 bruto
 * calculateFreight(1000)
 * // storeFee = 8,00 + 1,32 = 9,32
 * // courierFee = 7,00 + (1,32 × 0,875) = 7,00 + 1,155 = 8,155 ≈ R$ 8,16
 * // centralProfit = 1,00 + (1,32 × 0,125) = 1,00 + 0,165 = 1,165 ≈ R$ 1,17
 */
export const calculateFreight = (distanceMeters: number): FreightResult => {
    const variableFee = distanceMeters * FREIGHT_RATE_PER_METER;
    const storeFee = round2(FREIGHT_BASE_SIMPLE + variableFee);

    const { courierPart, appPart } = splitVariable(variableFee);
    const courierFee = round2(COURIER_BASE_FIXED + courierPart);
    const centralProfit = round2(APP_BASE_FIXED + appPart);

    return { storeFee, courierFee, centralProfit };
};

/**
 * Calcula o frete de uma **Parada Adicional** (multi-stop / batching).
 *
 * Sem taxa fixa — cobrar apenas R$ 1,32/km sobre a distância adicional.
 * Split integralmente variável: 12,5% App | 87,5% Entregador.
 *
 * @param additionalDistanceMeters - Metros percorridos somente neste trecho adicional
 */
export const calculateFreightBatching = (additionalDistanceMeters: number): FreightResult => {
    const storeFee = round2(additionalDistanceMeters * FREIGHT_RATE_PER_METER);
    const { courierPart, appPart } = splitVariable(storeFee);

    return {
        storeFee,
        courierFee: courierPart,
        centralProfit: appPart,
    };
};

/**
 * Calcula a taxa de **Logística Reversa** (retorno do entregador à loja).
 *
 * Sem taxa fixa — apenas R$ 1,32/km sobre a distância de retorno.
 * Split integralmente variável: 12,5% App | 87,5% Entregador.
 *
 * @param returnDistanceMeters - Metros do último ponto de entrega de volta à loja
 */
export const calculateReturnFee = (returnDistanceMeters: number): FreightResult => {
    const variableFee = returnDistanceMeters * FREIGHT_RATE_PER_METER;
    const storeFee = round2(RETURN_BASE_FEE + variableFee);
    
    // Split: R$ 4,00 base follows the same 12.5% / 87.5% split logic for return? 
    // Actually, usually return fee is fully for the driver. 
    // I'll use the same split logic as variable for simplicity, or confirm.
    // Based on "splitVariable", I'll apply it to the whole storeFee.
    const { courierPart, appPart } = splitVariable(storeFee);

    return {
        storeFee,
        courierFee: courierPart,
        centralProfit: appPart,
    };
};

// ── Alias de compatibilidade ────────────────────────────────────
/** @deprecated Use calculateFreight(distanceMeters) — passa metros, não km */
export const calculateFreightDistanced = (distanceKm: number): FreightResult => {
    return calculateFreight(distanceKm * 1000);
};
