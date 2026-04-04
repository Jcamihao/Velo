const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();
const PERIODS = ['all', '30d', '7d', 'today'];
const PERIOD_LABELS = {
  all: 'Desde o inicio',
  '30d': 'Ultimos 30 dias',
  '7d': 'Ultimos 7 dias',
  today: 'Hoje',
};

function buildCreatedAtFilter(period) {
  if (period === 'all') {
    return undefined;
  }

  const now = new Date();

  if (period === 'today') {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    return { gte: startOfDay };
  }

  const days = period === '30d' ? 30 : 7;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  return { gte: startDate };
}

async function getAnalyticsSummary(period) {
  const createdAt = buildCreatedAtFilter(period);
  const siteVisitWhere = createdAt ? { createdAt } : undefined;
  const userWhere = createdAt ? { createdAt } : undefined;
  const vehicleWhere = createdAt ? { createdAt } : undefined;

  const [
    totalSiteVisits,
    firstTimeVisitors,
    registeredUsers,
    registeredListings,
    commonUsers,
    admins,
  ] = await Promise.all([
    prisma.siteVisit.count({
      where: siteVisitWhere,
    }),
    prisma.siteVisit.count({
      where: { ...siteVisitWhere, isFirstVisit: true },
    }),
    prisma.user.count({
      where: userWhere,
    }),
    prisma.vehicle.count({
      where: vehicleWhere,
    }),
    prisma.user.count({
      where: { ...userWhere, role: Role.USER },
    }),
    prisma.user.count({
      where: { ...userWhere, role: Role.ADMIN },
    }),
  ]);

  return {
    totalSiteVisits,
    firstTimeVisitors,
    registeredUsers,
    registeredListings,
    commonUsers,
    admins,
    period,
    periodLabel: PERIOD_LABELS[period],
    generatedAt: new Date(),
  };
}

function buildRows(summary) {
  return [
    ['Visitantes do site', summary.totalSiteVisits],
    ['Visitantes pela primeira vez', summary.firstTimeVisitors],
    ['Usuarios cadastrados', summary.registeredUsers],
    ['Anuncios cadastrados', summary.registeredListings],
    ['Usuarios comuns', summary.commonUsers],
    ['Administradores', summary.admins],
  ];
}

async function exportExcel(filePath, summaries) {
  const workbook = new ExcelJS.Workbook();
  summaries.forEach((summary) => {
    const worksheet = workbook.addWorksheet(summary.periodLabel);
    const rows = buildRows(summary);

    worksheet.columns = [
      { header: 'Indicador', key: 'label', width: 34 },
      { header: 'Valor', key: 'value', width: 18 },
    ];

    worksheet.addRow({
      label: 'Periodo',
      value: summary.periodLabel,
    });
    worksheet.addRow({
      label: 'Gerado em',
      value: summary.generatedAt.toISOString(),
    });
    worksheet.addRow({});

    rows.forEach(([label, value]) => {
      worksheet.addRow({ label, value });
    });

    worksheet.getRow(1).font = { bold: true };
  });

  await workbook.xlsx.writeFile(filePath);
}

async function exportPdf(filePath, summaries) {
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: 'A4',
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text('Relatorio de Analytics', {
      align: 'left',
    });
    doc.moveDown();

    summaries.forEach((summary, index) => {
      if (index > 0) {
        doc.addPage();
      }

      doc
        .fontSize(16)
        .fillColor('#111111')
        .text(summary.periodLabel);
      doc.moveDown(0.4);
      doc
        .fontSize(10)
        .fillColor('#666666')
        .text(`Gerado em: ${summary.generatedAt.toISOString()}`);

      doc.moveDown(1.2);
      doc.fillColor('#111111');

      buildRows(summary).forEach(([label, value]) => {
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(label, { continued: true })
          .font('Helvetica')
          .text(`: ${value}`);
        doc.moveDown(0.7);
      });
    });

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  const selectedPeriods = process.argv[2]
    ? process.argv[2]
        .split(',')
        .map((period) => period.trim())
        .filter((period) => PERIODS.includes(period))
    : PERIODS;
  const summaries = await Promise.all(
    selectedPeriods.map((period) => getAnalyticsSummary(period)),
  );
  const reportsDir = path.resolve(__dirname, '..', 'reports');
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  fs.mkdirSync(reportsDir, { recursive: true });

  const periodsSlug =
    selectedPeriods.length === PERIODS.length
      ? 'all-periods'
      : selectedPeriods.join('-');
  const excelPath = path.join(
    reportsDir,
    `analytics-${periodsSlug}-${timestamp}.xlsx`,
  );
  const pdfPath = path.join(
    reportsDir,
    `analytics-${periodsSlug}-${timestamp}.pdf`,
  );

  await exportExcel(excelPath, summaries);
  await exportPdf(pdfPath, summaries);

  console.log(`Excel gerado em: ${excelPath}`);
  console.log(`PDF gerado em: ${pdfPath}`);
  console.log(
    `Periodos exportados: ${selectedPeriods
      .map((period) => PERIOD_LABELS[period])
      .join(', ')}`,
  );
}

main()
  .catch((error) => {
    console.error('Falha ao exportar analytics:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
