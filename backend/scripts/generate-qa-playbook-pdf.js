const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const inputPath = path.resolve(__dirname, '../../docs/qa-playbook.md');
const outputPath = path.resolve(__dirname, '../../docs/qa-playbook.pdf');

const markdown = fs.readFileSync(inputPath, 'utf8').replace(/\r\n/g, '\n');
const lines = markdown.split('\n');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 54, bottom: 54, left: 54, right: 54 },
  info: {
    Title: 'Playbook de QA do Velo',
    Author: 'Codex',
    Subject: 'Guia de QA do Velo',
  },
});

const outputStream = fs.createWriteStream(outputPath);
doc.pipe(outputStream);

const palette = {
  title: '#16324f',
  heading: '#234864',
  text: '#1f2933',
  subtle: '#52606d',
};

function lineGap(multiplier = 0.45) {
  doc.moveDown(multiplier);
}

function renderText(text, options = {}) {
  const {
    font = 'Helvetica',
    size = 11,
    color = palette.text,
    indent = 0,
    paragraphGap = 0,
  } = options;

  doc
    .font(font)
    .fontSize(size)
    .fillColor(color)
    .text(text, doc.page.margins.left + indent, doc.y, {
      width:
        doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right -
        indent,
      lineGap: 2,
      paragraphGap,
    });
}

function renderHeading(text, level) {
  const config =
    level === 1
      ? { size: 21, color: palette.title }
      : level === 2
        ? { size: 15, color: palette.heading }
        : { size: 12.5, color: palette.heading };

  renderText(text, {
    font: 'Helvetica-Bold',
    size: config.size,
    color: config.color,
  });
  lineGap(level === 1 ? 0.55 : 0.35);
}

function renderBullet(text, marker, indent = 12) {
  renderText(`${marker} ${text}`, { indent });
  lineGap(0.15);
}

let inCodeBlock = false;

for (const rawLine of lines) {
  const line = rawLine.replace(/\t/g, '  ');
  const trimmed = line.trim();

  if (trimmed.startsWith('```')) {
    inCodeBlock = !inCodeBlock;
    lineGap(0.25);
    continue;
  }

  if (!trimmed) {
    lineGap(0.35);
    continue;
  }

  if (inCodeBlock) {
    renderText(line || ' ', {
      font: 'Courier',
      size: 9.5,
      color: palette.text,
      indent: 12,
    });
    lineGap(0.05);
    continue;
  }

  if (trimmed.startsWith('# ')) {
    renderHeading(trimmed.slice(2), 1);
    continue;
  }

  if (trimmed.startsWith('## ')) {
    renderHeading(trimmed.slice(3), 2);
    continue;
  }

  if (trimmed.startsWith('### ')) {
    renderHeading(trimmed.slice(4), 3);
    continue;
  }

  if (/^- /.test(trimmed)) {
    renderBullet(trimmed.slice(2), '-', 10);
    continue;
  }

  const numberedMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
  if (numberedMatch) {
    renderBullet(numberedMatch[2], numberedMatch[1], 10);
    continue;
  }

  renderText(trimmed);
  lineGap(0.2);
}

doc.end();

outputStream.on('finish', () => {
  console.log(outputPath);
});
