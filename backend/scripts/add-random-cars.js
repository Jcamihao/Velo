const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Redis = require('ioredis');
const {
  PrismaClient,
  Role,
  VehicleCategory,
  VehicleType,
  FuelType,
  Transmission,
} = require('@prisma/client');

loadBackendEnv();

const prisma = new PrismaClient();

const BRAZILIAN_CITIES = [
  {
    city: 'Sao Paulo',
    state: 'SP',
    zipCode: '01001-000',
    addressLine: 'Avenida Paulista',
    latitude: -23.55052,
    longitude: -46.633308,
  },
  {
    city: 'Campinas',
    state: 'SP',
    zipCode: '13010-111',
    addressLine: 'Rua Conceicao',
    latitude: -22.90556,
    longitude: -47.06083,
  },
  {
    city: 'Santos',
    state: 'SP',
    zipCode: '11010-000',
    addressLine: 'Avenida Ana Costa',
    latitude: -23.96083,
    longitude: -46.33361,
  },
  {
    city: 'Belo Horizonte',
    state: 'MG',
    zipCode: '30130-110',
    addressLine: 'Avenida Afonso Pena',
    latitude: -19.91668,
    longitude: -43.93449,
  },
  {
    city: 'Rio de Janeiro',
    state: 'RJ',
    zipCode: '20040-020',
    addressLine: 'Avenida Rio Branco',
    latitude: -22.90685,
    longitude: -43.1729,
  },
  {
    city: 'Curitiba',
    state: 'PR',
    zipCode: '80010-000',
    addressLine: 'Rua XV de Novembro',
    latitude: -25.42836,
    longitude: -49.27325,
  },
  {
    city: 'Florianopolis',
    state: 'SC',
    zipCode: '88010-400',
    addressLine: 'Avenida Beira-Mar Norte',
    latitude: -27.59487,
    longitude: -48.54822,
  },
  {
    city: 'Salvador',
    state: 'BA',
    zipCode: '40020-000',
    addressLine: 'Avenida Sete de Setembro',
    latitude: -12.97775,
    longitude: -38.50163,
  },
];

const CAR_CATALOG = [
  {
    brand: 'Chevrolet',
    model: 'Onix',
    category: VehicleCategory.HATCH,
    transmission: Transmission.AUTOMATIC,
    fuelType: FuelType.FLEX,
    seats: 5,
    minRate: 105,
    maxRate: 185,
    minYear: 2020,
    maxYear: 2025,
    imageUrl:
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    alt: 'Chevrolet Onix estacionado',
    description:
      'Hatch eficiente para uso urbano, com boa economia e conectividade para a rotina.',
  },
  {
    brand: 'Hyundai',
    model: 'HB20',
    category: VehicleCategory.HATCH,
    transmission: Transmission.AUTOMATIC,
    fuelType: FuelType.FLEX,
    seats: 5,
    minRate: 110,
    maxRate: 190,
    minYear: 2020,
    maxYear: 2025,
    imageUrl:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
    alt: 'Hyundai HB20 em area urbana',
    description:
      'Compacto moderno para cidade e estrada curta, com bom porta-malas e direcao leve.',
  },
  {
    brand: 'Volkswagen',
    model: 'T-Cross',
    category: VehicleCategory.SUV,
    transmission: Transmission.AUTOMATIC,
    fuelType: FuelType.FLEX,
    seats: 5,
    minRate: 170,
    maxRate: 290,
    minYear: 2020,
    maxYear: 2025,
    imageUrl:
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80',
    alt: 'Volkswagen T-Cross em rua arborizada',
    description:
      'SUV compacto com boa altura do solo, central multimidia e conforto para a familia.',
  },
  {
    brand: 'Jeep',
    model: 'Compass',
    category: VehicleCategory.SUV,
    transmission: Transmission.AUTOMATIC,
    fuelType: FuelType.FLEX,
    seats: 5,
    minRate: 220,
    maxRate: 360,
    minYear: 2021,
    maxYear: 2025,
    imageUrl:
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
    alt: 'Jeep Compass escuro estacionado',
    description:
      'SUV bem equipado com otimo isolamento acustico, ideal para viagens e compromissos diarios.',
  },
  {
    brand: 'Toyota',
    model: 'Corolla',
    category: VehicleCategory.SEDAN,
    transmission: Transmission.AUTOMATIC,
    fuelType: FuelType.HYBRID,
    seats: 5,
    minRate: 210,
    maxRate: 320,
    minYear: 2020,
    maxYear: 2025,
    imageUrl:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    alt: 'Toyota Corolla prata',
    description:
      'Sedan confortavel com rodagem suave, excelente para trabalho executivo e viagens longas.',
  },
  {
    brand: 'Fiat',
    model: 'Strada',
    category: VehicleCategory.PICKUP,
    transmission: Transmission.MANUAL,
    fuelType: FuelType.FLEX,
    seats: 5,
    minRate: 145,
    maxRate: 245,
    minYear: 2021,
    maxYear: 2025,
    imageUrl:
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    alt: 'Fiat Strada vermelha',
    description:
      'Pickup compacta pronta para rotina de trabalho leve, entregas e deslocamentos mistos.',
  },
  {
    brand: 'Mercedes-Benz',
    model: 'Classe C',
    category: VehicleCategory.LUXURY,
    transmission: Transmission.AUTOMATIC,
    fuelType: FuelType.GASOLINE,
    seats: 5,
    minRate: 340,
    maxRate: 520,
    minYear: 2020,
    maxYear: 2024,
    imageUrl:
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
    alt: 'Sedan Mercedes em close lateral',
    description:
      'Sedan premium com acabamento refinado e condução silenciosa para locações de alto padrao.',
  },
  {
    brand: 'Renault',
    model: 'Kwid',
    category: VehicleCategory.ECONOMY,
    transmission: Transmission.MANUAL,
    fuelType: FuelType.FLEX,
    seats: 5,
    minRate: 85,
    maxRate: 145,
    minYear: 2019,
    maxYear: 2025,
    imageUrl:
      'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
    alt: 'Renault Kwid branco em avenida',
    description:
      'Modelo economico para trajetos urbanos, facil de estacionar e com baixo custo de uso.',
  },
  {
    brand: 'Citroen',
    model: 'Jumpy',
    category: VehicleCategory.VAN,
    transmission: Transmission.MANUAL,
    fuelType: FuelType.DIESEL,
    seats: 3,
    minRate: 240,
    maxRate: 380,
    minYear: 2020,
    maxYear: 2025,
    imageUrl:
      'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=1200&q=80',
    alt: 'Van branca estacionada',
    description:
      'Van de trabalho para transporte leve e operacoes urbanas com bom volume interno.',
  },
];

async function invalidateVehicleCache() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return;
  }

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  try {
    const keys = await redis.keys('vehicles:*');

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.warn('Nao foi possivel invalidar o cache Redis apos adicionar carros.');
  } finally {
    await redis.quit();
  }
}

function loadBackendEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');

  for (const rawLine of envContent.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseCount(argv) {
  const positionalCount = argv.find((arg) => /^\d+$/.test(arg));

  if (positionalCount) {
    return Number(positionalCount);
  }

  const namedCount = argv.find((arg) => arg.startsWith('--count='));

  if (namedCount) {
    return Number(namedCount.split('=')[1]);
  }

  return 10;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

function pickRandom(list) {
  return list[randomInt(0, list.length - 1)];
}

function randomCoordinate(base, variance = 0.08) {
  return Number((base + (Math.random() * variance * 2 - variance)).toFixed(6));
}

function randomPlate() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const sampleLetter = () => letters[randomInt(0, letters.length - 1)];
  const sampleDigit = () => String(randomInt(0, 9));

  return [
    sampleLetter(),
    sampleLetter(),
    sampleLetter(),
    sampleDigit(),
    sampleLetter(),
    sampleDigit(),
    sampleDigit(),
  ].join('');
}

async function ensureListingUser(index) {
  const email = `garage${index}@triluga.local`;
  const passwordHash = await bcrypt.hash('User123!', 10);
  const city = pickRandom(BRAZILIAN_CITIES);

  return prisma.user.upsert({
    where: { email },
    update: {
      role: Role.USER,
      status: 'ACTIVE',
      passwordHash,
      profile: {
        upsert: {
          update: {
            fullName: `Garagem ${index}`,
            phone: `+55 11 9${String(10000000 + index).slice(-8)}`,
            zipCode: city.zipCode,
            addressLine: city.addressLine,
            addressComplement: `Box ${index}`,
            city: city.city,
            state: city.state,
          },
          create: {
            fullName: `Garagem ${index}`,
            phone: `+55 11 9${String(10000000 + index).slice(-8)}`,
            zipCode: city.zipCode,
            addressLine: city.addressLine,
            addressComplement: `Box ${index}`,
            city: city.city,
            state: city.state,
          },
        },
      },
    },
    create: {
      email,
      passwordHash,
      role: Role.USER,
      profile: {
        create: {
          fullName: `Garagem ${index}`,
          phone: `+55 11 9${String(10000000 + index).slice(-8)}`,
          zipCode: city.zipCode,
          addressLine: city.addressLine,
          addressComplement: `Box ${index}`,
          city: city.city,
          state: city.state,
        },
      },
    },
    include: {
      profile: true,
    },
  });
}

async function generateUniquePlate() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const plate = randomPlate();
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { plate },
      select: { id: true },
    });

    if (!existingVehicle) {
      return plate;
    }
  }

  throw new Error('Nao foi possivel gerar uma placa unica apos varias tentativas.');
}

async function createRandomCar(ownerId, index) {
  const model = pickRandom(CAR_CATALOG);
  const location = pickRandom(BRAZILIAN_CITIES);
  const year = randomInt(model.minYear, model.maxYear);
  const plate = await generateUniquePlate();
  const rate = randomDecimal(model.minRate, model.maxRate);
  const mileageTag = randomInt(12, 98);

  return prisma.vehicle.create({
    data: {
      ownerId,
      title: `${model.brand} ${model.model} ${year}`,
      brand: model.brand,
      model: model.model,
      year,
      plate,
      city: location.city,
      state: location.state,
      vehicleType: VehicleType.CAR,
      category: model.category,
      transmission: model.transmission,
      fuelType: model.fuelType,
      seats: model.seats,
      dailyRate: rate,
      description: `${model.description} Veiculo anunciado para testes locais, revisado e com disponibilidade imediata. Quilometragem aproximada de ${mileageTag} mil km.`,
      addressLine: `${location.addressLine}, ${randomInt(50, 999)}`,
      latitude: randomCoordinate(location.latitude),
      longitude: randomCoordinate(location.longitude),
      isActive: true,
      isPublished: true,
      images: {
        create: [
          {
            url: model.imageUrl,
            key: `seed/random-cars/${Date.now()}-${index}-${plate}.jpg`,
            alt: model.alt,
            position: 0,
          },
        ],
      },
    },
    select: {
      id: true,
    },
  });
}

async function main() {
  const count = parseCount(process.argv.slice(2));

  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('Informe uma quantidade inteira maior que zero. Ex.: npm run db:add:cars -- 25');
  }

  const owners = await Promise.all(
    Array.from({ length: 6 }, (_, index) => ensureListingUser(index + 1)),
  );

  const beforeTotal = await prisma.vehicle.count({
    where: { vehicleType: VehicleType.CAR },
  });

  for (let index = 0; index < count; index += 1) {
    const owner = owners[index % owners.length];
    await createRandomCar(owner.id, index + 1);
  }

  await invalidateVehicleCache();

  const afterTotal = await prisma.vehicle.count({
    where: { vehicleType: VehicleType.CAR },
  });

  console.log(
    `Foram adicionados ${count} carros aleatorios. Total de carros: ${afterTotal} (antes: ${beforeTotal}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
