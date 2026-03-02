/**
 * Utilitário para cálculo de frete baseado em faixas de distância (KM).
 * Segue a tabela progressiva definida pela Central Guepardo.
 */

export interface FreightResult {
    storeFee: number;      // Valor cobrado do lojista
    courierFee: number;    // Valor repassado ao entregador (75% do lojista)
    centralProfit: number; // Lucro da central (25%)
}

/**
 * Calcula o frete com base na distância em KM.
 * 
 * Tabela:
 * - Até 1km: 7.50
 * - 1-2km: 9.50
 * - 2-3km: 12.00
 * - 3-4km: 14.50
 * - 5-6km: 17.00 (Lacuna 4-5km preenchida com 15.75)
 * - 6-7km: 20.00 (Lacuna 7-8km preenchida com 21.50)
 * - 8-9km: 23.00
 * - 9-10km: 27.00
 * - 10-11km: 30.00 (Lacuna 11-12km preenchida com 33.00)
 * - >12km: 33.00 + 3.00 por KM adicional
 */
export const calculateFreightDistanced = (distanceKm: number): FreightResult => {
    let storeFee = 7.50;

    if (distanceKm <= 1) storeFee = 7.50;
    else if (distanceKm <= 2) storeFee = 9.50;
    else if (distanceKm <= 3) storeFee = 12.00;
    else if (distanceKm <= 4) storeFee = 14.50;
    else if (distanceKm <= 5) storeFee = 15.75; // Interpolação/Sugestão
    else if (distanceKm <= 6) storeFee = 17.00;
    else if (distanceKm <= 7) storeFee = 20.00;
    else if (distanceKm <= 8) storeFee = 21.50; // Interpolação/Sugestão
    else if (distanceKm <= 9) storeFee = 23.00;
    else if (distanceKm <= 10) storeFee = 27.00;
    else if (distanceKm <= 11) storeFee = 30.00;
    else if (distanceKm <= 12) storeFee = 33.00; // Sugestão baseada na regra de +3/km
    else {
        // Acima de 12km: R$ 33.00 + R$ 3.00 fixos ao valor do Lojista por KM adicional
        const extraKm = Math.ceil(distanceKm - 12);
        storeFee = 33.00 + (extraKm * 3.00);
    }

    const courierFee = storeFee * 0.75;
    const centralProfit = storeFee * 0.25;

    return {
        storeFee,
        courierFee: Number(courierFee.toFixed(2)),
        centralProfit: Number(centralProfit.toFixed(2))
    };
};
