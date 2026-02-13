
const firstNames = [
    "João", "Pedro", "Lucas", "Mateus", "Gabriel", "Rafael", "Bruno", "Thiago", "Felipe", "Gustavo",
    "Carlos", "Daniel", "Eduardo", "Leonardo", "Rodrigo", "André", "Fernando", "Ricardo", "Marcos", "Vinicius"
];
const lastNames = [
    "Silva", "Santos", "Oliveira", "Souza", "Pereira", "Lima", "Ferreira", "Costa", "Rodrigues", "Almeida",
    "Nascimento", "Alves", "Carvalho", "Araujo", "Ribeiro", "Martins", "Gomes", "Barbosa", "Melo", "Rocha"
];

function generateName() {
    const f = firstNames[Math.floor(Math.random() * firstNames.length)];
    const l = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${f} ${l}`;
}

function generatePlate() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";

    const L = () => letters[Math.floor(Math.random() * letters.length)];
    const N = () => numbers[Math.floor(Math.random() * numbers.length)];

    return `${L()}${L()}${L()}-${N()}${L()}${N()}${N()}`;
}

const CENTER_LAT = -23.2642;
const CENTER_LNG = -47.2992;

function generateLocation() {
    const dist = 0.005 + Math.random() * 0.015;
    const angle = Math.random() * Math.PI * 2;

    const latOffset = Math.sin(angle) * dist;
    const lngOffset = Math.cos(angle) * dist;

    return {
        lat: parseFloat((CENTER_LAT + latOffset).toFixed(6)),
        lng: parseFloat((CENTER_LNG + lngOffset).toFixed(6))
    };
}

const couriers = [];

for (let i = 1; i <= 20; i++) {
    const courier = {
        id: i,
        nome: generateName(),
        placa: generatePlate(),
        confiabilidade: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        total_entregas: Math.floor(50 + Math.random() * 4950),
        location: generateLocation(),
        status: ""
    };
    couriers.push(courier);
}

const statuses = Array(5).fill("EM_ROTA").concat(Array(15).fill("DISPONIVEL"));

for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
}

couriers.forEach((c, idx) => {
    c.status = statuses[idx];
});

couriers.sort((a, b) => {
    if (b.confiabilidade !== a.confiabilidade) {
        return b.confiabilidade - a.confiabilidade;
    }
    return b.total_entregas - a.total_entregas;
});

couriers.forEach((c, idx) => {
    c.id = idx + 1;
});

console.log(JSON.stringify(couriers, null, 2));
