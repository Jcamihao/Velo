const bcrypt = require('bcryptjs');
const Redis = require('ioredis');
const {
  PrismaClient,
  Role,
  VehicleCategory,
  VehicleType,
  BookingApprovalMode,
  CancellationPolicy,
  MotorcycleStyle,
  FuelType,
  Transmission,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  NotificationType,
} = require('@prisma/client');

const prisma = new PrismaClient();

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
    console.warn('Não foi possível invalidar o cache Redis durante o seed.');
  } finally {
    await redis.quit();
  }
}

async function createUserWithProfile({
  email,
  password,
  role,
  fullName,
  phone,
  zipCode,
  addressLine,
  addressComplement,
  city,
  state,
}) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      role,
      status: 'ACTIVE',
      passwordHash,
      profile: {
        upsert: {
          update: {
            fullName,
            phone,
            zipCode,
            addressLine,
            addressComplement,
            city,
            state,
          },
          create: {
            fullName,
            phone,
            zipCode,
            addressLine,
            addressComplement,
            city,
            state,
          },
        },
      },
    },
    create: {
      email,
      passwordHash,
      role,
      profile: {
        create: {
          fullName,
          phone,
          zipCode,
          addressLine,
          addressComplement,
          city,
          state,
        },
      },
    },
    include: {
      profile: true,
    },
  });
}

async function main() {
  const [admin, listingUser, bookingUser] = await Promise.all([
    createUserWithProfile({
      email: 'admin@triluga.local',
      password: 'Admin123!',
      role: Role.ADMIN,
      fullName: 'Admin Triluga',
      phone: '+55 11 90000-0001',
      zipCode: '01001-000',
      addressLine: 'Praça da Sé',
      addressComplement: 'Sala administrativa',
      city: 'Sao Paulo',
      state: 'SP',
    }),
    createUserWithProfile({
      email: 'mariana@triluga.local',
      password: 'User123!',
      role: Role.USER,
      fullName: 'Mariana Costa',
      phone: '+55 11 90000-0002',
      zipCode: '01310-100',
      addressLine: 'Avenida Paulista',
      addressComplement: 'Apto 84',
      city: 'Sao Paulo',
      state: 'SP',
    }),
    createUserWithProfile({
      email: 'lucas@triluga.local',
      password: 'User123!',
      role: Role.USER,
      fullName: 'Lucas Almeida',
      phone: '+55 11 90000-0003',
      zipCode: '13010-111',
      addressLine: 'Rua Conceição',
      addressComplement: 'Casa 2',
      city: 'Campinas',
      state: 'SP',
    }),
  ]);

  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookingStatusHistory.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.siteVisit.deleteMany();
  await prisma.vehicleImage.deleteMany();
  await prisma.vehicleAvailability.deleteMany();
  await prisma.vehicleBlockedDate.deleteMany();
  await prisma.vehicle.deleteMany({
    where: { ownerId: listingUser.id },
  });
  await prisma.notification.deleteMany();

  const vehicles = await prisma.$transaction([
    prisma.vehicle.create({
      data: {
        ownerId: listingUser.id,
        title: 'Jeep Renegade Longitude 2022',
        brand: 'Jeep',
        model: 'Renegade',
        year: 2022,
        plate: 'CAR2B22',
        city: 'Sao Paulo',
        state: 'SP',
        vehicleType: VehicleType.CAR,
        category: VehicleCategory.SUV,
        bookingApprovalMode: BookingApprovalMode.INSTANT,
        cancellationPolicy: CancellationPolicy.MODERATE,
        transmission: Transmission.AUTOMATIC,
        fuelType: FuelType.FLEX,
        seats: 5,
        dailyRate: 289.9,
        addons: [
          {
            id: 'delivery',
            name: 'Entrega no local',
            description: 'Receba o veículo em um ponto combinado da cidade.',
            price: 45,
            enabled: true,
          },
          {
            id: 'baby-seat',
            name: 'Cadeirinha',
            description: 'Item extra para transporte infantil.',
            price: 35,
            enabled: true,
          },
        ],
        description:
          'SUV confortável para viagens curtas e uso urbano com multimídia, câmera de ré e ar digital.',
        latitude: -23.55052,
        longitude: -46.633308,
        images: {
          create: [
            {
              url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
              key: 'seed/vehicles/renegade-cover.jpg',
              alt: 'Jeep Renegade na rua',
              position: 0,
            },
          ],
        },
      },
    }),
    prisma.vehicle.create({
      data: {
        ownerId: listingUser.id,
        title: 'Chevrolet Onix LT 2023',
        brand: 'Chevrolet',
        model: 'Onix',
        year: 2023,
        plate: 'CAR3B23',
        city: 'Campinas',
        state: 'SP',
        vehicleType: VehicleType.CAR,
        category: VehicleCategory.HATCH,
        bookingApprovalMode: BookingApprovalMode.MANUAL,
        cancellationPolicy: CancellationPolicy.FLEXIBLE,
        transmission: Transmission.AUTOMATIC,
        fuelType: FuelType.FLEX,
        seats: 5,
        dailyRate: 179.9,
        addons: [
          {
            id: 'airport-pickup',
            name: 'Retirada no aeroporto',
            description: 'Entrega e retirada no aeroporto de Campinas.',
            price: 55,
            enabled: true,
          },
        ],
        description:
          'Hatch econômico, ótimo para cidade, com direção elétrica, central multimídia e seguro simplificado.',
        latitude: -22.90556,
        longitude: -47.06083,
        images: {
          create: [
            {
              url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
              key: 'seed/vehicles/onix-cover.jpg',
              alt: 'Chevrolet Onix branco',
              position: 0,
            },
          ],
        },
      },
    }),
    prisma.vehicle.create({
      data: {
        ownerId: listingUser.id,
        title: 'Yamaha NMAX 160 ABS 2024',
        brand: 'Yamaha',
        model: 'NMAX 160',
        year: 2024,
        plate: 'MOT4A24',
        city: 'Sao Paulo',
        state: 'SP',
        vehicleType: VehicleType.MOTORCYCLE,
        category: VehicleCategory.ECONOMY,
        bookingApprovalMode: BookingApprovalMode.INSTANT,
        cancellationPolicy: CancellationPolicy.FLEXIBLE,
        transmission: Transmission.CVT,
        fuelType: FuelType.GASOLINE,
        seats: 2,
        dailyRate: 89.9,
        addons: [
          {
            id: 'helmet-plus',
            name: 'Capacete extra',
            description: 'Capacete adicional para garupa.',
            price: 20,
            enabled: true,
          },
          {
            id: 'top-case',
            name: 'Baú expandido',
            description: 'Baú traseiro com espaço extra para bagagem.',
            price: 15,
            enabled: true,
          },
        ],
        motorcycleStyle: MotorcycleStyle.SCOOTER,
        engineCc: 160,
        hasAbs: true,
        hasTopCase: true,
        description:
          'Scooter ágil para deslocamentos urbanos, com freios ABS, baú e excelente consumo.',
        latitude: -23.563099,
        longitude: -46.654387,
        images: {
          create: [
            {
              url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
              key: 'seed/vehicles/nmax-cover.jpg',
              alt: 'Scooter Yamaha NMAX estacionada',
              position: 0,
            },
          ],
        },
      },
    }),
  ]);

  const completedBooking = await prisma.booking.create({
    data: {
      vehicleId: vehicles[1].id,
      ownerId: listingUser.id,
      renterId: bookingUser.id,
      startDate: new Date('2026-03-01T10:00:00.000Z'),
      endDate: new Date('2026-03-04T10:00:00.000Z'),
      totalDays: 3,
      dailyRate: 179.9,
      subtotal: 539.7,
      platformFee: 64.76,
      totalAmount: 604.46,
      status: BookingStatus.COMPLETED,
      approvedAt: new Date('2026-02-26T15:00:00.000Z'),
      completedAt: new Date('2026-03-04T12:00:00.000Z'),
      statusHistory: {
        create: [
          { toStatus: BookingStatus.PENDING, changedById: bookingUser.id },
          {
            fromStatus: BookingStatus.PENDING,
            toStatus: BookingStatus.APPROVED,
            changedById: listingUser.id,
          },
          {
            fromStatus: BookingStatus.APPROVED,
            toStatus: BookingStatus.COMPLETED,
            changedById: listingUser.id,
          },
        ],
      },
      payment: {
        create: {
          amount: 604.46,
          platformFee: 64.76,
          ownerAmount: 539.7,
          method: PaymentMethod.PIX,
          status: PaymentStatus.PAID,
          transactionId: 'mock_tx_seed_001',
          checkoutReference: 'mock_ref_seed_001',
          paidAt: new Date('2026-02-27T09:00:00.000Z'),
        },
      },
      review: {
        create: {
          vehicleId: vehicles[1].id,
          authorId: bookingUser.id,
          ownerId: listingUser.id,
          rating: 5,
          comment:
            'Carro impecável e entrega super tranquila. Repetiria a locação com certeza.',
        },
      },
    },
  });

  await prisma.vehicle.update({
    where: { id: vehicles[1].id },
    data: {
      ratingAverage: 5,
      reviewsCount: 1,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: listingUser.id,
        type: NotificationType.BOOKING_COMPLETED,
        title: 'Locação concluída',
        message: `A reserva ${completedBooking.id} foi concluída com sucesso.`,
      },
      {
        userId: bookingUser.id,
        type: NotificationType.REVIEW_CREATED,
        title: 'Avaliação registrada',
        message: 'Sua avaliação foi registrada e já aparece no anúncio.',
      },
      {
        userId: admin.id,
        type: NotificationType.SYSTEM_ALERT,
        title: 'Seed carregado',
        message: 'O ambiente local da Triluga foi populado com dados iniciais.',
      },
    ],
  });

  await prisma.siteVisit.createMany({
    data: [
      {
        visitorId: 'seed-visitor-1',
        path: '/',
        referrer: 'https://google.com',
        userAgent: 'seed-agent',
        isFirstVisit: true,
      },
      {
        visitorId: 'seed-visitor-1',
        path: '/search?q=jeep',
        referrer: 'https://google.com',
        userAgent: 'seed-agent',
        isFirstVisit: false,
      },
      {
        visitorId: 'seed-visitor-2',
        path: '/',
        referrer: 'https://instagram.com',
        userAgent: 'seed-agent',
        isFirstVisit: true,
      },
      {
        visitorId: 'seed-visitor-3',
        path: '/vehicles/demo',
        userAgent: 'seed-agent',
        isFirstVisit: true,
      },
    ],
  });

  await invalidateVehicleCache();

  console.log('Seed concluído com usuários e dados do MVP.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
