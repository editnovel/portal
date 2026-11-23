import { PDFDocument, PDFPage, PDFFont, PDFImage, rgb, RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';

interface FontSet {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  serif: PDFFont;
  serifBold: PDFFont;
  cjk: PDFFont;
  cjkBold: PDFFont;
}

interface AssetSet {
  crest: PDFImage;
  castleNeuschwanstein: PDFImage;
  fortressLandscape: PDFImage;
  knightArmor: PDFImage;
  medievalWarriors: PDFImage;
  doverCastle: PDFImage;
}

interface LoadedResources {
  fonts: FontSet;
  assets: AssetSet;
}

const PAGE_WIDTH = 420;
const PAGE_HEIGHT = 595;
const MARGIN_X = 36;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN_X;

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawParagraph(
  page: PDFPage,
  text: string,
  options: {
    x?: number;
    y: number;
    width?: number;
    font: PDFFont;
    fontSize?: number;
    lineHeight?: number;
    color?: RGB;
    indent?: number;
  }
): number {
  const x = options.x ?? MARGIN_X;
  const width = options.width ?? CONTENT_WIDTH;
  const fontSize = options.fontSize ?? 9.5;
  const lineHeight = options.lineHeight ?? 13.5;
  const color = options.color ?? rgb(0.12, 0.12, 0.14);
  const indent = options.indent ?? 0;

  const lines = wrapText(text, options.font, fontSize, width - indent);
  let currentY = options.y;

  for (let i = 0; i < lines.length; i++) {
    const lineX = i === 0 ? x + indent : x;
    page.drawText(lines[i], {
      x: lineX,
      y: currentY,
      size: fontSize,
      font: options.font,
      color,
    });
    currentY -= lineHeight;
  }

  return currentY;
}

function drawHeaderVol1(page: PDFPage, fonts: FontSet, crest: PDFImage, pageNum: number): void {
  const yHeader = PAGE_HEIGHT - 32;

  page.drawImage(crest, {
    x: MARGIN_X,
    y: yHeader - 5,
    width: 15,
    height: 16,
  });

  page.drawText('CRÓNICAS DEL FILO ASTRAL', {
    x: MARGIN_X + 22,
    y: yHeader + 7,
    size: 7.5,
    font: fonts.bold,
    color: rgb(0.15, 0.18, 0.24),
  });

  page.drawText('— Shinsengumi Translations —', {
    x: MARGIN_X + 22,
    y: yHeader - 2,
    size: 6,
    font: fonts.italic,
    color: rgb(0.45, 0.48, 0.54),
  });

  const volText = 'Volumen 1';
  const volWidth = fonts.bold.widthOfTextAtSize(volText, 8);
  page.drawText(volText, {
    x: PAGE_WIDTH - MARGIN_X - volWidth,
    y: yHeader + 3,
    size: 8,
    font: fonts.bold,
    color: rgb(0.82, 0.16, 0.25),
  });

  page.drawLine({
    start: { x: MARGIN_X, y: PAGE_HEIGHT - 44 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - 44 },
    thickness: 0.75,
    color: rgb(0.8, 0.82, 0.86),
  });
}

function drawFooterVol1(page: PDFPage, fonts: FontSet, pageNum: number): void {
  page.drawLine({
    start: { x: MARGIN_X, y: 34 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: 34 },
    thickness: 0.75,
    color: rgb(0.8, 0.82, 0.86),
  });

  page.drawText('Shinsengumi Translations — Versión Digital', {
    x: MARGIN_X,
    y: 22,
    size: 6.5,
    font: fonts.regular,
    color: rgb(0.5, 0.53, 0.58),
  });

  const pageStr = `[ ${pageNum} ]`;
  const pageWidthText = fonts.bold.widthOfTextAtSize(pageStr, 8);
  page.drawText(pageStr, {
    x: PAGE_WIDTH - MARGIN_X - pageWidthText,
    y: 22,
    size: 8,
    font: fonts.bold,
    color: rgb(0.2, 0.22, 0.26),
  });
}

function drawHeaderVol2(page: PDFPage, fonts: FontSet, pageNum: number): void {
  const barHeight = 22;
  const barY = PAGE_HEIGHT - barHeight;

  page.drawRectangle({
    x: 0,
    y: barY,
    width: PAGE_WIDTH - 55,
    height: barHeight,
    color: rgb(0.02, 0.24, 0.52),
  });

  page.drawRectangle({
    x: PAGE_WIDTH - 55,
    y: barY,
    width: 55,
    height: barHeight,
    color: rgb(0.06, 0.44, 0.76),
  });

  page.drawText('CRÓNICAS DEL FILO ASTRAL  |  WORLD PROJECT', {
    x: 20,
    y: barY + 7,
    size: 7.5,
    font: fonts.cjkBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('VOL. 2', {
    x: PAGE_WIDTH - 44,
    y: barY + 7,
    size: 7.5,
    font: fonts.cjkBold,
    color: rgb(1, 1, 1),
  });
}

function drawFooterVol2(page: PDFPage, fonts: FontSet, pageNum: number): void {
  const barHeight = 18;

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH - 30,
    height: barHeight,
    color: rgb(0.04, 0.52, 0.82),
  });

  page.drawRectangle({
    x: PAGE_WIDTH - 30,
    y: 0,
    width: 30,
    height: barHeight,
    color: rgb(0.96, 0.45, 0.05),
  });

  page.drawText('VOLUMEN 2 — LIGHT NOVEL PREMIUM TRANSLATION', {
    x: 20,
    y: 6,
    size: 6.5,
    font: fonts.cjkBold,
    color: rgb(1, 1, 1),
  });

  const pageStr = `${pageNum}`;
  const pageStrWidth = fonts.cjkBold.widthOfTextAtSize(pageStr, 8);
  page.drawText(pageStr, {
    x: PAGE_WIDTH - 15 - pageStrWidth / 2,
    y: 5.5,
    size: 8,
    font: fonts.cjkBold,
    color: rgb(1, 1, 1),
  });
}

function drawHeaderVol3(page: PDFPage, fonts: FontSet, pageNum: number): void {
  const barHeight = 24;
  const barY = PAGE_HEIGHT - barHeight;

  page.drawRectangle({
    x: 0,
    y: barY,
    width: PAGE_WIDTH,
    height: barHeight,
    color: rgb(0.5, 0.08, 0.12),
  });

  page.drawLine({
    start: { x: 0, y: barY },
    end: { x: PAGE_WIDTH, y: barY },
    thickness: 1.5,
    color: rgb(0.85, 0.65, 0.15),
  });

  page.drawText('CRÓNICAS DEL FILO ASTRAL  ✦  DELUXE EDITION', {
    x: 22,
    y: barY + 8,
    size: 7.5,
    font: fonts.cjkBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('VOL. 3', {
    x: PAGE_WIDTH - 50,
    y: barY + 8,
    size: 7.5,
    font: fonts.cjkBold,
    color: rgb(0.95, 0.82, 0.4),
  });
}

function drawFooterVol3(page: PDFPage, fonts: FontSet, pageNum: number): void {
  page.drawLine({
    start: { x: MARGIN_X, y: 32 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: 32 },
    thickness: 1,
    color: rgb(0.85, 0.65, 0.15),
  });

  page.drawText('Astral Works Fansub — Colección Definitiva', {
    x: MARGIN_X,
    y: 20,
    size: 6.5,
    font: fonts.regular,
    color: rgb(0.55, 0.35, 0.38),
  });

  const pageStr = `✦  ${pageNum}  ✦`;
  const pageStrWidth = fonts.cjkBold.widthOfTextAtSize(pageStr, 7.5);
  page.drawText(pageStr, {
    x: PAGE_WIDTH - MARGIN_X - pageStrWidth,
    y: 20,
    size: 7.5,
    font: fonts.cjkBold,
    color: rgb(0.5, 0.08, 0.12),
  });
}

function drawChapterBanner(
  page: PDFPage,
  tag: string,
  title: string,
  fonts: FontSet,
  y: number,
  style: 'vol1' | 'vol2' | 'vol3'
): number {
  const bannerHeight = 28;
  const bannerY = y - bannerHeight;

  if (style === 'vol1') {
    page.drawRectangle({
      x: MARGIN_X,
      y: bannerY,
      width: CONTENT_WIDTH,
      height: bannerHeight,
      color: rgb(0.12, 0.15, 0.22),
    });

    const tagWidth = fonts.bold.widthOfTextAtSize(tag, 8);
    page.drawRectangle({
      x: MARGIN_X + 6,
      y: bannerY + 5,
      width: tagWidth + 12,
      height: 18,
      color: rgb(0.82, 0.16, 0.25),
    });

    page.drawText(tag, {
      x: MARGIN_X + 12,
      y: bannerY + 10,
      size: 8,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    });

    page.drawText(title, {
      x: MARGIN_X + tagWidth + 26,
      y: bannerY + 10,
      size: 9.5,
      font: fonts.serifBold,
      color: rgb(1, 1, 1),
    });
  } else if (style === 'vol2') {
    page.drawRectangle({
      x: MARGIN_X,
      y: bannerY,
      width: CONTENT_WIDTH,
      height: bannerHeight,
      color: rgb(0.02, 0.24, 0.52),
    });

    page.drawRectangle({
      x: MARGIN_X,
      y: bannerY,
      width: 4,
      height: bannerHeight,
      color: rgb(0.96, 0.45, 0.05),
    });

    page.drawText(tag.toUpperCase(), {
      x: MARGIN_X + 14,
      y: bannerY + 15,
      size: 7,
      font: fonts.cjkBold,
      color: rgb(0.4, 0.78, 1),
    });

    page.drawText(title, {
      x: MARGIN_X + 14,
      y: bannerY + 5,
      size: 9,
      font: fonts.cjkBold,
      color: rgb(1, 1, 1),
    });
  } else {
    page.drawRectangle({
      x: MARGIN_X,
      y: bannerY,
      width: CONTENT_WIDTH,
      height: bannerHeight,
      color: rgb(0.45, 0.08, 0.12),
      borderColor: rgb(0.85, 0.65, 0.15),
      borderWidth: 1,
    });

    const tagWidth = fonts.cjkBold.widthOfTextAtSize(tag, 8);
    page.drawRectangle({
      x: MARGIN_X + 6,
      y: bannerY + 5,
      width: tagWidth + 12,
      height: 18,
      color: rgb(0.85, 0.65, 0.15),
    });

    page.drawText(tag, {
      x: MARGIN_X + 12,
      y: bannerY + 10,
      size: 8,
      font: fonts.cjkBold,
      color: rgb(0.3, 0.05, 0.08),
    });

    page.drawText(title, {
      x: MARGIN_X + tagWidth + 26,
      y: bannerY + 10,
      size: 9.5,
      font: fonts.cjkBold,
      color: rgb(1, 1, 1),
    });
  }

  return bannerY - 18;
}

function drawSceneBreak(
  page: PDFPage,
  symbol: string,
  fonts: FontSet,
  y: number
): number {
  const currentY = y - 10;
  const textWidth = fonts.cjkBold.widthOfTextAtSize(symbol, 10);
  const x = (PAGE_WIDTH - textWidth) / 2;

  page.drawText(symbol, {
    x,
    y: currentY,
    size: 10,
    font: fonts.cjkBold,
    color: rgb(0.35, 0.38, 0.45),
  });

  return currentY - 14;
}

async function loadResources(doc: PDFDocument, assetsDir: string): Promise<LoadedResources> {
  doc.registerFontkit(fontkit);

  const fonts: FontSet = {
    regular: await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/arial.ttf')),
    bold: await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/arialbd.ttf')),
    italic: await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/ariali.ttf')),
    serif: await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/georgia.ttf')),
    serifBold: await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/georgiab.ttf')),
    cjk: await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/malgun.ttf')),
    cjkBold: await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/malgunbd.ttf')),
  };

  const assets: AssetSet = {
    crest: await doc.embedPng(fs.readFileSync(path.join(assetsDir, 'generic_heraldic_crest.png'))),
    castleNeuschwanstein: await doc.embedJpg(fs.readFileSync(path.join(assetsDir, 'generic_castle_neuschwanstein.jpg'))),
    fortressLandscape: await doc.embedJpg(fs.readFileSync(path.join(assetsDir, 'generic_fortress_landscape.jpg'))),
    knightArmor: await doc.embedJpg(fs.readFileSync(path.join(assetsDir, 'generic_knight_armor.jpg'))),
    medievalWarriors: await doc.embedJpg(fs.readFileSync(path.join(assetsDir, 'generic_medieval_warriors.jpg'))),
    doverCastle: await doc.embedJpg(fs.readFileSync(path.join(assetsDir, 'generic_dover_castle.jpg'))),
  };

  return { fonts, assets };
}

async function generateVolume1(outputPath: string, assetsDir: string): Promise<void> {
  const doc = await PDFDocument.create();
  const { fonts, assets } = await loadResources(doc, assetsDir);

  const page1 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page1.drawImage(assets.castleNeuschwanstein, {
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  });

  page1.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: 140,
    color: rgb(0.05, 0.07, 0.12),
  });

  page1.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 60,
    width: PAGE_WIDTH,
    height: 60,
    color: rgb(0.05, 0.07, 0.12),
  });

  page1.drawText('SHINSENGUMI TRANSLATIONS PRESENTA', {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 38,
    size: 8,
    font: fonts.bold,
    color: rgb(0.9, 0.9, 0.92),
  });

  page1.drawText('CRÓNICAS DEL FILO ASTRAL', {
    x: MARGIN_X,
    y: 98,
    size: 19,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Volumen 1: El Despertar de la Hoja', {
    x: MARGIN_X,
    y: 78,
    size: 12,
    font: fonts.serifBold,
    color: rgb(0.96, 0.45, 0.05),
  });

  page1.drawText('Autor: Kaelen Voss  |  Ilustraciones: Studio Astral', {
    x: MARGIN_X,
    y: 48,
    size: 8.5,
    font: fonts.regular,
    color: rgb(0.8, 0.82, 0.86),
  });

  page1.drawText('Edición Especial para Lectores Digitales', {
    x: MARGIN_X,
    y: 32,
    size: 7.5,
    font: fonts.italic,
    color: rgb(0.6, 0.63, 0.68),
  });

  const page2 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page2.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: rgb(0.97, 0.97, 0.98),
  });

  const spreadHeight = 250;
  page2.drawImage(assets.fortressLandscape, {
    x: MARGIN_X,
    y: PAGE_HEIGHT - spreadHeight - 30,
    width: CONTENT_WIDTH,
    height: spreadHeight,
  });

  page2.drawRectangle({
    x: MARGIN_X,
    y: PAGE_HEIGHT - spreadHeight - 30,
    width: CONTENT_WIDTH,
    height: spreadHeight,
    borderColor: rgb(0.2, 0.22, 0.28),
    borderWidth: 1.5,
  });

  let p2Y = PAGE_HEIGHT - spreadHeight - 55;
  page2.drawText('PERSONAJES PRINCIPALES', {
    x: MARGIN_X,
    y: p2Y,
    size: 11,
    font: fonts.bold,
    color: rgb(0.12, 0.15, 0.22),
  });

  p2Y -= 20;
  p2Y = drawParagraph(
    page2,
    'Alicia von Rosenberg: Heredera de la noble Casa Rosenberg y prodigio en el arte del esgrima sagrado. Empuña la legendaria espada Aethelgard, con la cual juró defender la frontera imperial frente a la marea oscura.',
    { y: p2Y, font: fonts.regular, fontSize: 8.5, lineHeight: 12.5 }
  );

  p2Y -= 8;
  p2Y = drawParagraph(
    page2,
    'Ren Kisaragi: Joven forastero transferido a la Real Academia Militar. Portador de un misterioso poder elemental capaz de cortar la niebla mágica.',
    { y: p2Y, font: fonts.regular, fontSize: 8.5, lineHeight: 12.5 }
  );

  p2Y -= 8;
  drawParagraph(
    page2,
    'Sylvia Thorne: Capitana de la guardia de la capital. Su estricta disciplina guía a los novatos durante las incursiones nocturnas.',
    { y: p2Y, font: fonts.regular, fontSize: 8.5, lineHeight: 12.5 }
  );

  const page3 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol1(page3, fonts, assets.crest, 3);
  drawFooterVol1(page3, fonts, 3);

  let p3Y = PAGE_HEIGHT - 65;
  p3Y = drawChapterBanner(page3, 'Prólogo', 'El Rugido de la Niebla', fonts, p3Y, 'vol1');

  p3Y = drawParagraph(
    page3,
    'El viento del norte soplaba con una ferocidad inusual sobre las almenas de Solaria. Desde lo alto de la torre de observación, la silueta de los riscos montañosos quedaba sepultada bajo un manto espeso de niebla púrpura.',
    { y: p3Y, font: fonts.serif, indent: 18 }
  );

  p3Y -= 6;
  p3Y = drawParagraph(
    page3,
    '—¿Cuánto tiempo crees que resistirá la barrera exterior? —preguntó Ren, ajustando la empuñadura de su espada en el cinto—. La resonancia del éter ha cambiado drásticamente desde el ocaso.',
    { y: p3Y, font: fonts.serif, indent: 18 }
  );

  p3Y -= 6;
  p3Y = drawParagraph(
    page3,
    'Alicia no respondió de inmediato. Sus ojos celestes escrutaban el abismo rocoso con la calma implacable de quien ha contemplado el fuego de cien batallas.',
    { y: p3Y, font: fonts.serif, indent: 18 }
  );

  p3Y -= 6;
  p3Y = drawParagraph(
    page3,
    '—No colapsará esta noche —afirmó ella con firmeza—. Sin embargo, el sello primigenio está cediendo. Los ancianos del santuario creen que la bestia despertará antes del equinoccio.',
    { y: p3Y, font: fonts.serif, indent: 18 }
  );

  p3Y -= 6;
  p3Y = drawParagraph(
    page3,
    'Un relámpago mudo tiñó de violeta las nubes lejanas. En lo profundo del valle, algo inmenso respiró.',
    { y: p3Y, font: fonts.serif, indent: 18 }
  );

  const page4 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol1(page4, fonts, assets.crest, 4);
  drawFooterVol1(page4, fonts, 4);

  let p4Y = PAGE_HEIGHT - 65;
  p4Y = drawParagraph(
    page4,
    'El murmullo de los guardias se desvaneció cuando el Gran Maestre atravesó las puertas del salón de guerra. Portaba el estandarte dorado de la corona.',
    { y: p4Y, font: fonts.serif, indent: 18 }
  );

  p4Y -= 6;
  p4Y = drawParagraph(
    page4,
    '“No podemos postergar más esta 62Da ceremonia” —declaró el anciano con voz grave—. “Si el sello se fragmenta por completo, ni siquiera los dos Caballeros Sagrados podrán contener la calamidad”.',
    { y: p4Y, font: fonts.serif, indent: 18 }
  );

  p4Y -= 6;
  p4Y = drawParagraph(
    page4,
    'Ren dio un paso al frente. Su mirada reflejaba una resolución inquebrantable.',
    { y: p4Y, font: fonts.serif, indent: 18 }
  );

  p4Y = drawSceneBreak(page4, '◆ ◇ ◆ ◇ ◆', fonts, p4Y);

  p4Y = drawParagraph(
    page4,
    'Horas más tarde, en el patio central de la fortaleza, el entrenamiento comenzaba bajo la llovizna. La hoja de Alicia danzaba con una velocidad prodigiosa, desprendiendo chispas luminosas contra el acero de práctica.',
    { y: p4Y, font: fonts.serif, indent: 18 }
  );

  p4Y -= 6;
  p4Y = drawParagraph(
    page4,
    '—¡Presta atención a tu postura! —ordenó ella al tiempo que lanzaba una estocada frontal—. Una sola duda en el campo de batalla te costará la vida.',
    { y: p4Y, font: fonts.serif, indent: 18 }
  );

  p4Y -= 6;
  p4Y = drawParagraph(
    page4,
    'Ren esquivó la hoja por escasos milímetros. Pronunció en voz baja la fórmula de concentración: 『Corte de Luz Astral』. Un destello incandescente envolvió su brazo derecho, desviando el golpe de su mentora con precisión matemática.',
    { y: p4Y, font: fonts.cjk, indent: 18 }
  );

  const page5 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol1(page5, fonts, assets.crest, 5);
  drawFooterVol1(page5, fonts, 5);

  let p5Y = PAGE_HEIGHT - 65;
  p5Y = drawChapterBanner(page5, 'Capítulo 1', 'El Juramento del Filo', fonts, p5Y, 'vol1');

  p5Y = drawParagraph(
    page5,
    'El sol de mediodía se filtraba entre los arcos de piedra del claustro mayor. Los cadetes de primer año observaban con devoción los duelos de clasificación.',
    { y: p5Y, font: fonts.serif, indent: 18 }
  );

  p5Y -= 6;
  p5Y = drawParagraph(
    page5,
    '—Dicen que el muchacho forastero empató con la capitana en el bosque de entrenamiento —susurró uno de los jóvenes nobles en las gradas.',
    { y: p5Y, font: fonts.serif, indent: 18 }
  );

  p5Y -= 6;
  p5Y = drawParagraph(
    page5,
    '—Tonterías —replicó su compañero—. Alicia von Rosenberg jamás perdería frente a un estudiante sin linaje comprobado.',
    { y: p5Y, font: fonts.serif, indent: 18 }
  );

  p5Y = drawSceneBreak(page5, '◆', fonts, p5Y);

  p5Y = drawParagraph(
    page5,
    'En el centro de la arena de combate, ambos contendientes tomaron posición. El heraldo levantó el pañuelo blanco.',
    { y: p5Y, font: fonts.serif, indent: 18 }
  );

  p5Y -= 6;
  p5Y = drawParagraph(
    page5,
    '—¿Lista, señorita Alicia? —preguntó Ren esbozando una sonrisa contenida.',
    { y: p5Y, font: fonts.serif, indent: 18 }
  );

  p5Y -= 6;
  p5Y = drawParagraph(
    page5,
    '—Demuéstrame de qué eres capaz, Ren. No me decepciones.',
    { y: p5Y, font: fonts.serif, indent: 18 }
  );

  const page6 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol1(page6, fonts, assets.crest, 6);
  drawFooterVol1(page6, fonts, 6);

  let p6Y = PAGE_HEIGHT - 65;
  p6Y = drawParagraph(
    page6,
    'El cruce de aceros retumbó en todo el patio de armas. El aire vibraba con partículas de éter concentrado mientras ambos combatientes desataban su técnica magistral.',
    { y: p6Y, font: fonts.serif, indent: 18 }
  );

  const imgHeight = 220;
  const imgWidth = 175;
  const imgX = (PAGE_WIDTH - imgWidth) / 2;
  const imgY = p6Y - imgHeight - 12;

  page6.drawImage(assets.knightArmor, {
    x: imgX,
    y: imgY,
    width: imgWidth,
    height: imgHeight,
  });

  page6.drawRectangle({
    x: imgX - 3,
    y: imgY - 3,
    width: imgWidth + 6,
    height: imgHeight + 6,
    borderColor: rgb(0.3, 0.35, 0.42),
    borderWidth: 1.2,
  });

  const captionText = '«La armadura sagrada del escuadrón imperial en el patio de armas»';
  const captionWidth = fonts.italic.widthOfTextAtSize(captionText, 7);
  page6.drawText(captionText, {
    x: (PAGE_WIDTH - captionWidth) / 2,
    y: imgY - 14,
    size: 7,
    font: fonts.italic,
    color: rgb(0.4, 0.42, 0.48),
  });

  p6Y = imgY - 32;
  p6Y = drawParagraph(
    page6,
    'Nadie en las gradas se atrevió a parpadear. En aquel instante, la determinación de ambos guerreros quedó sellada para la posteridad.',
    { y: p6Y, font: fonts.serif, indent: 18 }
  );

  const page7 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol1(page7, fonts, assets.crest, 7);
  drawFooterVol1(page7, fonts, 7);

  let p7Y = PAGE_HEIGHT - 65;
  p7Y = drawChapterBanner(page7, 'Epílogo', 'Ecos del Destino', fonts, p7Y, 'vol1');

  p7Y = drawParagraph(
    page7,
    'La noche cayó plácida sobre la ciudadela. Desde la azotea del dormitorio, las luces de Solaria parecían un mar de estrellas dormidas.',
    { y: p7Y, font: fonts.serif, indent: 18 }
  );

  p7Y -= 6;
  p7Y = drawParagraph(
    page7,
    '—El Consejo Imperial aprobó la expedición al norte —dijo Alicia apareciendo tras la columna de mármol—. Partiremos con el alba.',
    { y: p7Y, font: fonts.serif, indent: 18 }
  );

  p7Y -= 6;
  p7Y = drawParagraph(
    page7,
    '—Estaremos listos —respondió él—. Pase lo que pase en el glaciar, no permitiré que las sombras alcancen la capital.',
    { y: p7Y, font: fonts.serif, indent: 18 }
  );

  p7Y = drawSceneBreak(page7, '◆ ◇ ◆ ◇ ◆', fonts, p7Y);

  p7Y = drawParagraph(
    page7,
    'La brisa nocturna ondeó sus capas. El prólogo de su larga travesía había concluido, pero la verdadera tormenta apenas comenzaba en el horizonte.',
    { y: p7Y, font: fonts.serif, indent: 18 }
  );

  const page8 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol1(page8, fonts, assets.crest, 8);
  drawFooterVol1(page8, fonts, 8);

  let p8Y = PAGE_HEIGHT - 65;
  p8Y = drawChapterBanner(page8, 'Postfacio', 'Palabras del Autor', fonts, p8Y, 'vol1');

  p8Y = drawParagraph(
    page8,
    '¡Muchísimas gracias a todos por leer el primer volumen de Crónicas del Filo Astral! Esta historia nació del deseo de combinar el fervor de la espada clásica con un mundo de fantasía lleno de misterio y compañerismo.',
    { y: p8Y, font: fonts.regular, indent: 14, fontSize: 9, lineHeight: 13 }
  );

  p8Y -= 6;
  p8Y = drawParagraph(
    page8,
    'Quiero agradecer especialmente al equipo artístico por dar vida a los paisajes de Solaria con tanta maestría, y al maravilloso equipo de fansub por su dedicación en cada detalle tipográfico y maquetación.',
    { y: p8Y, font: fonts.regular, indent: 14, fontSize: 9, lineHeight: 13 }
  );

  p8Y -= 6;
  p8Y = drawParagraph(
    page8,
    '¡Nos vemos muy pronto en el Volumen 2: La Tormenta de Akatsuki!',
    { y: p8Y, font: fonts.bold, indent: 14, fontSize: 9, lineHeight: 13 }
  );

  p8Y -= 20;
  const staffBoxY = 55;
  const staffBoxHeight = 85;

  page8.drawRectangle({
    x: MARGIN_X,
    y: staffBoxY,
    width: CONTENT_WIDTH,
    height: staffBoxHeight,
    color: rgb(0.95, 0.96, 0.98),
    borderColor: rgb(0.8, 0.82, 0.88),
    borderWidth: 1,
  });

  page8.drawText('STAFF SHINSENGUMI TRANSLATIONS', {
    x: MARGIN_X + 14,
    y: staffBoxY + staffBoxHeight - 16,
    size: 8,
    font: fonts.bold,
    color: rgb(0.15, 0.18, 0.25),
  });

  page8.drawText('Traducción Japonés-Español: Shinsengumi Team', {
    x: MARGIN_X + 14,
    y: staffBoxY + staffBoxHeight - 32,
    size: 7.5,
    font: fonts.regular,
    color: rgb(0.3, 0.32, 0.38),
  });

  page8.drawText('Corrección de Estilo & Gramática: Valeria M. (EditNovel)', {
    x: MARGIN_X + 14,
    y: staffBoxY + staffBoxHeight - 46,
    size: 7.5,
    font: fonts.regular,
    color: rgb(0.3, 0.32, 0.38),
  });

  page8.drawText('Edición Gráfica & Tipografía: Astral Works', {
    x: MARGIN_X + 14,
    y: staffBoxY + staffBoxHeight - 60,
    size: 7.5,
    font: fonts.regular,
    color: rgb(0.3, 0.32, 0.38),
  });

  page8.drawText('Control de Calidad (QC): Hyouka-kun', {
    x: MARGIN_X + 14,
    y: staffBoxY + staffBoxHeight - 74,
    size: 7.5,
    font: fonts.regular,
    color: rgb(0.3, 0.32, 0.38),
  });

  page8.drawImage(assets.crest, {
    x: PAGE_WIDTH - MARGIN_X - 45,
    y: staffBoxY + 18,
    width: 32,
    height: 35,
  });

  const pdfBytes = await doc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

async function generateVolume2(outputPath: string, assetsDir: string): Promise<void> {
  const doc = await PDFDocument.create();
  const { fonts, assets } = await loadResources(doc, assetsDir);

  const page1 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page1.drawImage(assets.doverCastle, {
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  });

  page1.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: 145,
    color: rgb(0.02, 0.15, 0.35),
  });

  page1.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 35,
    width: PAGE_WIDTH,
    height: 35,
    color: rgb(0.02, 0.15, 0.35),
  });

  page1.drawText('WORLD PROJECT — LIGHT NOVEL DIGITAL ARCHIVE', {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 22,
    size: 8,
    font: fonts.cjkBold,
    color: rgb(0.4, 0.8, 1),
  });

  page1.drawText('CRÓNICAS DEL FILO ASTRAL', {
    x: MARGIN_X,
    y: 105,
    size: 19,
    font: fonts.cjkBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Volumen 2: La Tormenta de Akatsuki', {
    x: MARGIN_X,
    y: 84,
    size: 12,
    font: fonts.cjkBold,
    color: rgb(0.96, 0.45, 0.05),
  });

  page1.drawText('Kaelen Voss  /  Arte por Studio Astral', {
    x: MARGIN_X,
    y: 54,
    size: 8.5,
    font: fonts.cjk,
    color: rgb(0.85, 0.9, 0.95),
  });

  page1.drawText('Traducción y Edición Premium por World Project', {
    x: MARGIN_X,
    y: 35,
    size: 7.5,
    font: fonts.italic,
    color: rgb(0.65, 0.75, 0.85),
  });

  const page2 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page2.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: rgb(0.96, 0.97, 0.99),
  });

  const heroHeight = 240;
  page2.drawImage(assets.fortressLandscape, {
    x: MARGIN_X,
    y: PAGE_HEIGHT - heroHeight - 35,
    width: CONTENT_WIDTH,
    height: heroHeight,
  });

  page2.drawRectangle({
    x: MARGIN_X,
    y: PAGE_HEIGHT - heroHeight - 35,
    width: CONTENT_WIDTH,
    height: heroHeight,
    borderColor: rgb(0.04, 0.52, 0.82),
    borderWidth: 2,
  });

  let p2Y = PAGE_HEIGHT - heroHeight - 65;
  page2.drawText('FICHA DE COMBATE Y UBICACIÓN GEOGRÁFICA', {
    x: MARGIN_X,
    y: p2Y,
    size: 10,
    font: fonts.cjkBold,
    color: rgb(0.02, 0.24, 0.52),
  });

  p2Y -= 18;
  p2Y = drawParagraph(
    page2,
    'Las Ruinas de Akatsuki: Una antigua ciudadela sumergida en la niebla perpetua. Según los códices perdidos, allí reposa el núcleo de la Espada de Oricalco.',
    { y: p2Y, font: fonts.cjk, fontSize: 8.5, lineHeight: 12.5 }
  );

  p2Y -= 8;
  drawParagraph(
    page2,
    'Frente de Batalla del Norte: Bajo el mando del comandante Kenji, la 1ra brigada resiste los embates de las bestias abisales.',
    { y: p2Y, font: fonts.cjk, fontSize: 8.5, lineHeight: 12.5 }
  );

  const page3 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol2(page3, fonts, 3);
  drawFooterVol2(page3, fonts, 3);

  let p3Y = PAGE_HEIGHT - 45;
  p3Y = drawChapterBanner(page3, 'Prólogo', 'Vientos del Norte', fonts, p3Y, 'vol2');

  p3Y = drawParagraph(
    page3,
    'El convoy militar avanzaba a paso firme sobre el camino embarrado. Las antorchas de éter proyectaban sombras titilantes sobre los estandartes azules de Solaria.',
    { y: p3Y, font: fonts.cjk, indent: 18 }
  );

  p3Y -= 6;
  p3Y = drawParagraph(
    page3,
    '「La temperatura continúa descendiendo」 —observó Ren mientras se ajustaba la capa forrada en piel—. «A este paso, los valles quedarán congelados antes de llegar a la fortaleza».',
    { y: p3Y, font: fonts.cjk, indent: 18 }
  );

  p3Y -= 6;
  p3Y = drawParagraph(
    page3,
    'Alicia sostenía en su regazo la funda de Aethelgard. Sus dedos enguantados acariciaban las runas grabadas en la vaina.',
    { y: p3Y, font: fonts.cjk, indent: 18 }
  );

  p3Y -= 6;
  p3Y = drawParagraph(
    page3,
    '«No temas por el frío» —respondió ella—. «La llama de la espada ancestral arde incluso en el abismo más gélido».',
    { y: p3Y, font: fonts.cjk, indent: 18 }
  );

  const page4 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol2(page4, fonts, 4);
  drawFooterVol2(page4, fonts, 4);

  let p4Y = PAGE_HEIGHT - 45;
  p4Y = drawChapterBanner(page4, 'Capítulo 1', 'El Asedio a la Fortaleza', fonts, p4Y, 'vol2');

  p4Y = drawParagraph(
    page4,
    'Las campanas de alarma sonaron en la madrugada. Desde las troneras del muro exterior, los vigías divisaron una columna de sombras deslizándose por el barranco.',
    { y: p4Y, font: fonts.cjk, indent: 18 }
  );

  p4Y -= 6;
  p4Y = drawParagraph(
    page4,
    '«¡Arqueros a las almenas!» —rugió el comandante—. «Este 62do torneo imperial ha sido cancelado por decreto real; ahora estamos en guerra».',
    { y: p4Y, font: fonts.cjk, indent: 18 }
  );

  p4Y = drawSceneBreak(page4, '* * *', fonts, p4Y);

  page4.drawText('Parte 2', {
    x: MARGIN_X,
    y: p4Y,
    size: 11,
    font: fonts.cjkBold,
    color: rgb(0.02, 0.24, 0.52),
  });
  p4Y -= 18;

  p4Y = drawParagraph(
    page4,
    'Alicia saltó desde el parapeto hacia la nieve profunda. El filo de su arma brilló con una intensidad cegadora cuando impactó contra la vanguardia enemiga.',
    { y: p4Y, font: fonts.cjk, indent: 18 }
  );

  p4Y -= 6;
  p4Y = drawParagraph(
    page4,
    '「¡No dejen que rodeen la puerta levadiza!」 —exclamó Ren, conjurando una barrera de viento que repelió a tres asaltantes en el acto.',
    { y: p4Y, font: fonts.cjk, indent: 18 }
  );

  const page5 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol2(page5, fonts, 5);
  drawFooterVol2(page5, fonts, 5);

  let p5Y = PAGE_HEIGHT - 45;
  p5Y = drawChapterBanner(page5, 'Capítulo 2', 'Duelo bajo la Tormenta', fonts, p5Y, 'vol2');

  p5Y = drawParagraph(
    page5,
    'La ventisca aullaba entre los desfiladeros de Akatsuki. La visibilidad era apenas de unos pocos metros, pero el instinto de combate guiaba cada uno de sus pasos.',
    { y: p5Y, font: fonts.cjk, indent: 18 }
  );

  p5Y -= 6;
  p5Y = drawParagraph(
    page5,
    'Una figura solitaria emergió de la niebla. Llevaba una armadura oscura forjada con escamas de dragón y una guadaña de plata pura.',
    { y: p5Y, font: fonts.cjk, indent: 18 }
  );

  p5Y = drawSceneBreak(page5, '◇ ◇ ◇', fonts, p5Y);

  p5Y = drawParagraph(
    page5,
    '「Por fin llegan, paladines de Solaria」 ——dijo el caballero de las sombras con una voz profunda que reverberó en sus pechos——. 「He esperado este duelo durante trescientos inviernos」.',
    { y: p5Y, font: fonts.cjk, indent: 18 }
  );

  p5Y -= 6;
  p5Y = drawParagraph(
    page5,
    'Alicia alzó su espada hacia el cielo tormentoso. El destello del rayo iluminó su mirada decidida.',
    { y: p5Y, font: fonts.cjk, indent: 18 }
  );

  const page6 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol2(page6, fonts, 6);
  drawFooterVol2(page6, fonts, 6);

  let p6Y = PAGE_HEIGHT - 45;
  p6Y = drawParagraph(
    page6,
    'El choque de voluntades y acero estremeció los cimientos de la fortaleza. Cada impacto generaba ondas expansivas que dispersaban la nieve acumulada en los techos.',
    { y: p6Y, font: fonts.cjk, indent: 18 }
  );

  const v2ImgHeight = 200;
  const v2ImgWidth = 230;
  const v2ImgX = (PAGE_WIDTH - v2ImgWidth) / 2;
  const v2ImgY = p6Y - v2ImgHeight - 14;

  page6.drawImage(assets.medievalWarriors, {
    x: v2ImgX,
    y: v2ImgY,
    width: v2ImgWidth,
    height: v2ImgHeight,
  });

  page6.drawRectangle({
    x: v2ImgX - 2,
    y: v2ImgY - 2,
    width: v2ImgWidth + 4,
    height: v2ImgHeight + 4,
    borderColor: rgb(0.04, 0.52, 0.82),
    borderWidth: 1.5,
  });

  const v2Caption = '«Los caballeros de la orden combatiendo en el desfiladero de Akatsuki»';
  const v2CapWidth = fonts.italic.widthOfTextAtSize(v2Caption, 7);
  page6.drawText(v2Caption, {
    x: (PAGE_WIDTH - v2CapWidth) / 2,
    y: v2ImgY - 14,
    size: 7,
    font: fonts.italic,
    color: rgb(0.35, 0.45, 0.55),
  });

  p6Y = v2ImgY - 32;
  p6Y = drawParagraph(
    page6,
    'El poder combinado del rayo astral y la magia arcana quebró la ofensiva del enemigo, forzándolo a retroceder hacia las cavernas profundas.',
    { y: p6Y, font: fonts.cjk, indent: 18 }
  );

  const page7 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol2(page7, fonts, 7);
  drawFooterVol2(page7, fonts, 7);

  let p7Y = PAGE_HEIGHT - 45;
  p7Y = drawChapterBanner(page7, 'Epílogo', 'La Promesa de las Estrellas', fonts, p7Y, 'vol2');

  p7Y = drawParagraph(
    page7,
    'El sol naciente iluminó la cordillera nevada, tiñendo las cumbres de un dorado suave. La batalla había cesado, dejando tras de sí un silencio sobrecogedor.',
    { y: p7Y, font: fonts.cjk, indent: 18 }
  );

  p7Y -= 6;
  p7Y = drawParagraph(
    page7,
    '「Hemos asegurado la frontera norte」 —declaró Alicia, enfundando la espada con un suspiro de alivio—. 「Pero esto es solo el preámbulo de lo que vendrá en la capital」.',
    { y: p7Y, font: fonts.cjk, indent: 18 }
  );

  p7Y -= 6;
  p7Y = drawParagraph(
    page7,
    'Ren miró hacia el sur, donde las torres imperiales se alzaban majestuosas.',
    { y: p7Y, font: fonts.cjk, indent: 18 }
  );

  p7Y = drawSceneBreak(page7, '* * *', fonts, p7Y);

  p7Y = drawParagraph(
    page7,
    '«No importa cuán oscuras sean las sombras que se avecinan» —concluyó él—. «Mientras permanezcamos unidos, la luz del filo astral jamás se extinguirá».',
    { y: p7Y, font: fonts.cjk, indent: 18 }
  );

  const page8 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol2(page8, fonts, 8);
  drawFooterVol2(page8, fonts, 8);

  let p8Y = PAGE_HEIGHT - 45;
  p8Y = drawChapterBanner(page8, 'Postfacio', 'Notas del Autor — Volumen 2', fonts, p8Y, 'vol2');

  p8Y = drawParagraph(
    page8,
    '¡Estimados lectores, gracias por acompañar a Alicia y Ren en este segundo volumen de Crónicas del Filo Astral! La intensidad de las batallas en Akatsuki exigió explorar nuevas dimensiones en la magia y las relaciones entre nuestros protagonistas.',
    { y: p8Y, font: fonts.cjk, indent: 14, fontSize: 9, lineHeight: 13 }
  );

  p8Y -= 6;
  p8Y = drawParagraph(
    page8,
    'Un agradecimiento sincero a la comunidad de World Project por su apoyo continuo y su pasión por la literatura ligera.',
    { y: p8Y, font: fonts.cjk, indent: 14, fontSize: 9, lineHeight: 13 }
  );

  p8Y -= 20;
  const staff2BoxY = 48;
  const staff2BoxHeight = 85;

  page8.drawRectangle({
    x: MARGIN_X,
    y: staff2BoxY,
    width: CONTENT_WIDTH,
    height: staff2BoxHeight,
    color: rgb(0.94, 0.96, 0.99),
    borderColor: rgb(0.04, 0.52, 0.82),
    borderWidth: 1.2,
  });

  page8.drawText('WORLD PROJECT — CRÉDITOS EDITORIALES', {
    x: MARGIN_X + 14,
    y: staff2BoxY + staff2BoxHeight - 16,
    size: 8,
    font: fonts.cjkBold,
    color: rgb(0.02, 0.24, 0.52),
  });

  page8.drawText('Organización y Gestión: World Project Translations', {
    x: MARGIN_X + 14,
    y: staff2BoxY + staff2BoxHeight - 32,
    size: 7.5,
    font: fonts.cjk,
    color: rgb(0.2, 0.25, 0.35),
  });

  page8.drawText('Traducción Japonés-Español: Kenji S.', {
    x: MARGIN_X + 14,
    y: staff2BoxY + staff2BoxHeight - 46,
    size: 7.5,
    font: fonts.cjk,
    color: rgb(0.2, 0.25, 0.35),
  });

  page8.drawText('Corrección Tipográfica & Gramática: EditNovel Engine', {
    x: MARGIN_X + 14,
    y: staff2BoxY + staff2BoxHeight - 60,
    size: 7.5,
    font: fonts.cjk,
    color: rgb(0.2, 0.25, 0.35),
  });

  page8.drawText('Maquetación Digital: Astral Works Japan', {
    x: MARGIN_X + 14,
    y: staff2BoxY + staff2BoxHeight - 74,
    size: 7.5,
    font: fonts.cjk,
    color: rgb(0.2, 0.25, 0.35),
  });

  const pdfBytes = await doc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

async function generateVolume3(outputPath: string, assetsDir: string): Promise<void> {
  const doc = await PDFDocument.create();
  const { fonts, assets } = await loadResources(doc, assetsDir);

  const page1 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page1.drawImage(assets.knightArmor, {
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  });

  page1.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: 125,
    color: rgb(0.12, 0.02, 0.04),
  });

  page1.drawLine({
    start: { x: 0, y: 125 },
    end: { x: PAGE_WIDTH, y: 125 },
    thickness: 2,
    color: rgb(0.85, 0.65, 0.15),
  });

  page1.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 35,
    width: PAGE_WIDTH,
    height: 35,
    color: rgb(0.12, 0.02, 0.04),
  });

  page1.drawText('ASTRAL WORKS  ✦  EDICIÓN DE COLECCIONISTA', {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 22,
    size: 8,
    font: fonts.cjkBold,
    color: rgb(0.95, 0.82, 0.4),
  });

  page1.drawText('CRÓNICAS DEL FILO ASTRAL', {
    x: MARGIN_X,
    y: 88,
    size: 19,
    font: fonts.cjkBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Volumen 3: El Vórtice del Abismo', {
    x: MARGIN_X,
    y: 68,
    size: 12,
    font: fonts.cjkBold,
    color: rgb(0.95, 0.82, 0.4),
  });

  page1.drawText('Kaelen Voss  ✦  Ilustrado por Studio Astral', {
    x: MARGIN_X,
    y: 44,
    size: 8.5,
    font: fonts.cjk,
    color: rgb(0.9, 0.85, 0.85),
  });

  page1.drawText('Traducción Deluxe & Revisión Especializada', {
    x: MARGIN_X,
    y: 28,
    size: 7.5,
    font: fonts.italic,
    color: rgb(0.7, 0.65, 0.65),
  });

  const page2 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page2.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: rgb(0.98, 0.96, 0.96),
  });

  const v3CoverSpreadHeight = 240;
  page2.drawImage(assets.castleNeuschwanstein, {
    x: MARGIN_X,
    y: PAGE_HEIGHT - v3CoverSpreadHeight - 35,
    width: CONTENT_WIDTH,
    height: v3CoverSpreadHeight,
  });

  page2.drawRectangle({
    x: MARGIN_X,
    y: PAGE_HEIGHT - v3CoverSpreadHeight - 35,
    width: CONTENT_WIDTH,
    height: v3CoverSpreadHeight,
    borderColor: rgb(0.85, 0.65, 0.15),
    borderWidth: 1.5,
  });

  let p2Y = PAGE_HEIGHT - v3CoverSpreadHeight - 65;
  page2.drawText('EXPEDICIÓN FINAL: EL CORAZÓN DEL ABISMO', {
    x: MARGIN_X,
    y: p2Y,
    size: 10,
    font: fonts.cjkBold,
    color: rgb(0.5, 0.08, 0.12),
  });

  p2Y -= 18;
  p2Y = drawParagraph(
    page2,
    'La Alianza de los Tres Reinos: Tras los sucesos de Akatsuki, las delegaciones de Solaria, Lunaria y Vesper se reúnen para forjar un único ejército frente a las fauces del abismo.',
    { y: p2Y, font: fonts.regular, fontSize: 8.5, lineHeight: 12.5 }
  );

  p2Y -= 8;
  drawParagraph(
    page2,
    'Los Tres Campeones Celestiales: Portadores de las armas sagradas destinadas a sellar la grieta primordial.',
    { y: p2Y, font: fonts.regular, fontSize: 8.5, lineHeight: 12.5 }
  );

  const page3 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol3(page3, fonts, 3);
  drawFooterVol3(page3, fonts, 3);

  let p3Y = PAGE_HEIGHT - 50;
  p3Y = drawChapterBanner(page3, 'Prólogo', 'La Caída del Firmamento', fonts, p3Y, 'vol3');

  p3Y = drawParagraph(
    page3,
    'Una lluvia de estrellas fugaces iluminaba el domo celeste sobre el cráter de Oricalco. El aire ardía con un aroma metálico que anunciaba el despertar de los titanes.',
    { y: p3Y, font: fonts.serif, indent: 18 }
  );

  p3Y -= 6;
  p3Y = drawParagraph(
    page3,
    '—Si retrocedemos ahora, ningún rincón del continente sobrevivirá al eclipse —susurró Alicia mientras desenvainaba la hoja resplandeciente.',
    { y: p3Y, font: fonts.serif, indent: 18 }
  );

  p3Y -= 6;
  p3Y = drawParagraph(
    page3,
    'Ren desenrolló el pergamino arcano. Las runas doradas se elevaron en el aire, formando un círculo de protección a su alrededor.',
    { y: p3Y, font: fonts.serif, indent: 18 }
  );

  p3Y = drawSceneBreak(page3, '✦ ✦ ✦', fonts, p3Y);

  p3Y = drawParagraph(
    page3,
    'Un rugido desgarrador partió las nubes en dos. Las sombras del abismo habían comenzado su marcha definitiva.',
    { y: p3Y, font: fonts.serif, indent: 18 }
  );

  const page4 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol3(page4, fonts, 4);
  drawFooterVol3(page4, fonts, 4);

  let p4Y = PAGE_HEIGHT - 50;
  p4Y = drawChapterBanner(page4, 'Capítulo I', 'El Juicio de las Espadas', fonts, p4Y, 'vol3');

  p4Y = drawParagraph(
    page4,
    'En el gran anfiteatro de obsidiana, los líderes de la alianza debatían acaloradamente sobre el destino de la vanguardia.',
    { y: p4Y, font: fonts.serif, indent: 18 }
  );

  p4Y -= 6;
  p4Y = drawParagraph(
    page4,
    '“No podemos disolver esta 63ra asamblea de clanes sin un consenso absoluto” —declaró el heraldo imperial ante la multitud—.',
    { y: p4Y, font: fonts.serif, indent: 18 }
  );

  p4Y -= 6;
  p4Y = drawParagraph(
    page4,
    '“Los tres Campeones Celestiales ya han prestado juramento. No hay vuelta atrás”.',
    { y: p4Y, font: fonts.serif, indent: 18 }
  );

  p4Y = drawSceneBreak(page4, '--- ❖ ---', fonts, p4Y);

  p4Y = drawParagraph(
    page4,
    'Alicia avanzó hacia el pedestal central. Alzó su espada y proclamó con voz clara: 『Ruina del Dragón』. Una llamarada dorada cubrió el templo, sellando el pacto milenario entre hombres y espíritus.',
    { y: p4Y, font: fonts.cjk, indent: 18 }
  );

  const page5 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol3(page5, fonts, 5);
  drawFooterVol3(page5, fonts, 5);

  let p5Y = PAGE_HEIGHT - 50;
  p5Y = drawChapterBanner(page5, 'Capítulo II', 'En el Corazón del Abismo', fonts, p5Y, 'vol3');

  p5Y = drawParagraph(
    page5,
    'El descenso por la grieta submarina desafiaba toda ley natural. Esferas de luz etérea flotaban en la oscuridad insondable.',
    { y: p5Y, font: fonts.serif, indent: 18 }
  );

  p5Y -= 6;
  p5Y = drawParagraph(
    page5,
    '«Mantengan la formación cerrada» ——instruyó Ren a los exploradores——. «La distorsión del espacio-tiempo en este nivel es crítica».',
    { y: p5Y, font: fonts.serif, indent: 18 }
  );

  p5Y = drawSceneBreak(page5, '✦ ✦ ✦', fonts, p5Y);

  p5Y = drawParagraph(
    page5,
    'Una barrera de cristal negro se materializó frente a ellos. En su interior, el corazón palpitante del cataclismo aguardaba el impacto final.',
    { y: p5Y, font: fonts.serif, indent: 18 }
  );

  const page6 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol3(page6, fonts, 6);
  drawFooterVol3(page6, fonts, 6);

  let p6Y = PAGE_HEIGHT - 50;
  p6Y = drawParagraph(
    page6,
    'La detonación sacudió cada estrato del abismo. El resplandor sagrado de Aethelgard disipó las cadenas de oscuridad una por una.',
    { y: p6Y, font: fonts.serif, indent: 18 }
  );

  const v3ImgHeight = 220;
  const v3ImgWidth = 160;
  const v3ImgX = (PAGE_WIDTH - v3ImgWidth) / 2;
  const v3ImgY = p6Y - v3ImgHeight - 14;

  page6.drawImage(assets.medievalWarriors, {
    x: v3ImgX,
    y: v3ImgY,
    width: v3ImgWidth,
    height: v3ImgHeight,
  });

  page6.drawRectangle({
    x: v3ImgX - 3,
    y: v3ImgY - 3,
    width: v3ImgWidth + 6,
    height: v3ImgHeight + 6,
    borderColor: rgb(0.85, 0.65, 0.15),
    borderWidth: 1.5,
  });

  const v3Caption = '«Los caballeros sagrados sellando la cámara primordial»';
  const v3CapWidth = fonts.italic.widthOfTextAtSize(v3Caption, 7);
  page6.drawText(v3Caption, {
    x: (PAGE_WIDTH - v3CapWidth) / 2,
    y: v3ImgY - 14,
    size: 7,
    font: fonts.italic,
    color: rgb(0.5, 0.35, 0.35),
  });

  p6Y = v3ImgY - 32;
  p6Y = drawParagraph(
    page6,
    'Con un último estallido de luz blanca, la fisura se cerró para siempre. El silencio y la paz retornaron a las tierras sagradas de Solaria.',
    { y: p6Y, font: fonts.serif, indent: 18 }
  );

  const page7 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol3(page7, fonts, 7);
  drawFooterVol3(page7, fonts, 7);

  let p7Y = PAGE_HEIGHT - 50;
  p7Y = drawChapterBanner(page7, 'Epílogo', 'La Luz Perpetua', fonts, p7Y, 'vol3');

  p7Y = drawParagraph(
    page7,
    'El alba se alzaba victoriosa sobre la capital restaurada. Banderas doradas ondeaban al compás del himno de la victoria.',
    { y: p7Y, font: fonts.serif, indent: 18 }
  );

  p7Y -= 6;
  p7Y = drawParagraph(
    page7,
    '—Lo logramos, Ren —dijo Alicia contemplando el renacer de la ciudadela.',
    { y: p7Y, font: fonts.serif, indent: 18 }
  );

  p7Y -= 6;
  p7Y = drawParagraph(
    page7,
    '—Nuestra promesa está cumplida. Pero mientras existan horizontes por explorar, la hoja astral seguirá guiando nuestros pasos.',
    { y: p7Y, font: fonts.serif, indent: 18 }
  );

  p7Y = drawSceneBreak(page7, '✦ ✦ ✦', fonts, p7Y);

  p7Y = drawParagraph(
    page7,
    'Y así concluyó la leyenda de aquellos que desafiaron a la noche eterna.',
    { y: p7Y, font: fonts.cjkBold, indent: 18 }
  );

  const page8 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderVol3(page8, fonts, 8);
  drawFooterVol3(page8, fonts, 8);

  let p8Y = PAGE_HEIGHT - 50;
  p8Y = drawChapterBanner(page8, 'Postfacio', 'Palabras Finales del Autor', fonts, p8Y, 'vol3');

  p8Y = drawParagraph(
    page8,
    'Con este tercer volumen concluimos el primer gran arco de Crónicas del Filo Astral. Escribir esta travesía junto a Alicia y Ren ha sido una experiencia inolvidable.',
    { y: p8Y, font: fonts.regular, indent: 14, fontSize: 9, lineHeight: 13 }
  );

  p8Y -= 6;
  p8Y = drawParagraph(
    page8,
    'Mi agradecimiento infinito a todos los lectores por su cariño, reseñas y aliento durante cada capítulo publicado.',
    { y: p8Y, font: fonts.regular, indent: 14, fontSize: 9, lineHeight: 13 }
  );

  p8Y -= 20;
  const staff3BoxY = 48;
  const staff3BoxHeight = 85;

  page8.drawRectangle({
    x: MARGIN_X,
    y: staff3BoxY,
    width: CONTENT_WIDTH,
    height: staff3BoxHeight,
    color: rgb(0.99, 0.97, 0.97),
    borderColor: rgb(0.85, 0.65, 0.15),
    borderWidth: 1.2,
  });

  page8.drawText('ASTRAL WORKS DELUXE — CRÉDITOS DE EDICIÓN', {
    x: MARGIN_X + 14,
    y: staff3BoxY + staff3BoxHeight - 16,
    size: 8,
    font: fonts.cjkBold,
    color: rgb(0.5, 0.08, 0.12),
  });

  page8.drawText('Dirección Editorial: Astral Works Publishing', {
    x: MARGIN_X + 14,
    y: staff3BoxY + staff3BoxHeight - 32,
    size: 7.5,
    font: fonts.regular,
    color: rgb(0.35, 0.25, 0.25),
  });

  page8.drawText('Traducción y Localización: Shinsengumi & World Project Team', {
    x: MARGIN_X + 14,
    y: staff3BoxY + staff3BoxHeight - 46,
    size: 7.5,
    font: fonts.regular,
    color: rgb(0.35, 0.25, 0.25),
  });

  page8.drawText('Motor de Revisión Tipográfica: EditNovel Core Engine', {
    x: MARGIN_X + 14,
    y: staff3BoxY + staff3BoxHeight - 60,
    size: 7.5,
    font: fonts.regular,
    color: rgb(0.35, 0.25, 0.25),
  });

  page8.drawText('Control de Calidad Final: Hyouka & Valeria M.', {
    x: MARGIN_X + 14,
    y: staff3BoxY + staff3BoxHeight - 74,
    size: 7.5,
    font: fonts.regular,
    color: rgb(0.35, 0.25, 0.25),
  });

  const pdfBytes = await doc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

async function main(): Promise<void> {
  const scriptsDir = path.resolve(__dirname, '..');
  const assetsDir = path.join(scriptsDir, 'assets');
  const outputDir = path.join(__dirname, 'output');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const vol1Path = path.join(outputDir, 'volumen_1_el_despertar_de_la_hoja.pdf');
  const vol2Path = path.join(outputDir, 'volumen_2_la_tormenta_de_akatsuki.pdf');
  const vol3Path = path.join(outputDir, 'volumen_3_el_vortice_del_abismo.pdf');

  console.log('Generating Volume 1 (Generic Illustrations)...');
  await generateVolume1(vol1Path, assetsDir);

  console.log('Generating Volume 2 (Generic Illustrations)...');
  await generateVolume2(vol2Path, assetsDir);

  console.log('Generating Volume 3 (Generic Illustrations)...');
  await generateVolume3(vol3Path, assetsDir);

  console.log('All 3 PDF volumes generated successfully:');
  console.log('Volumen 1:', vol1Path);
  console.log('Volumen 2:', vol2Path);
  console.log('Volumen 3:', vol3Path);
}

main().catch((err) => {
  console.error('Error generating sample PDFs:', err);
  process.exit(1);
});
