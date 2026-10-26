/**
 * Presentation-only parsers for the Identity Proofing consent agreement and
 * disclaimer text - a 1:1 port of parseLegalAgreementForDisplay /
 * parseDisclaimerForDisplay in AllyDocReactAppLatest's Step2Consent.jsx and
 * Step3Disclaimer.jsx. They only split text into typed blocks for display;
 * they never alter wording.
 */

const URL_PATTERN = /(https?:\/\/[^\s<>"'\)\]]+|www\.[^\s<>"'\)\]]+)/gi;
const AGREEMENT_SUBITEM_PATTERN = /^\(((?:[a-z])|(?:[ivxlcdm]+))\)\s+/i;
const DISCLAIMER_SUBITEM_PATTERN = /^\((?:i{1,3}|iv|v|vi{0,3}|ix|x)\)\s+/i;

const isMostlyUppercase = (title) => {
  const letters = title.replace(/[^A-Za-z]/g, '');
  if (!letters.length) return false;
  const upperCount = (title.match(/[A-Z]/g) || []).length;
  return upperCount / letters.length >= 0.85;
};

const splitUppercaseLeadParagraph = (text) => {
  if (!text) return null;

  const splitAt = text.search(/\.\s+\S/);
  if (splitAt === -1) return null;

  const lead = text.slice(0, splitAt + 1).trim();
  const rest = text.slice(splitAt + 1).trim();
  if (!rest) return null;

  const leadForCheck = lead.replace(/\.\s*$/, '');
  if (!isMostlyUppercase(leadForCheck)) return null;

  const restSample = rest.slice(0, Math.min(rest.length, 80));
  if (isMostlyUppercase(restSample)) return null;

  return { lead, rest };
};

export function parseLegalAgreementForDisplay(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const workingText = rawText
    .replace(/([^\n])[ \t]+(\d+\.\s+)(?=[A-Z])/g, '$1\n\n$2')
    .replace(/([^\n])[ \t]+(\((?:[a-z]|[ivxlcdm]+)\)\s+)/gi, '$1\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const blocks = [];

  const pushContentLines = (content) => {
    if (!content) return;
    content.split('\n').forEach((line) => {
      if (line === '') {
        blocks.push({ type: 'gap' });
        return;
      }
      if (AGREEMENT_SUBITEM_PATTERN.test(line)) {
        blocks.push({ type: 'subitem', text: line });
        return;
      }
      blocks.push({ type: 'paragraph', text: line });
    });
  };

  const pushBodyAfterHeading = (bodyText) => {
    if (!bodyText) return;
    const leadSplit = splitUppercaseLeadParagraph(bodyText);
    if (leadSplit) {
      blocks.push({ type: 'paragraph', text: leadSplit.lead });
      pushContentLines(leadSplit.rest);
      return;
    }
    pushContentLines(bodyText);
  };

  workingText.split('\n').forEach((line) => {
    if (line === '') {
      blocks.push({ type: 'gap' });
      return;
    }

    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (!numbered) {
      pushContentLines(line);
      return;
    }

    const numberPrefix = `${numbered[1]}. `;
    const rest = numbered[2];

    const colonIdx = rest.indexOf(':');
    if (colonIdx !== -1) {
      const headingTitle = rest.slice(0, colonIdx).trim();
      const afterColon = rest.slice(colonIdx + 1).trim();
      blocks.push({ type: 'heading', text: `${numberPrefix}${headingTitle}` });
      pushBodyAfterHeading(afterColon);
      return;
    }

    const periodSplitAt = rest.search(/\.\s+\S/);
    if (periodSplitAt !== -1) {
      const title = rest.slice(0, periodSplitAt).trim();
      const body = rest.slice(periodSplitAt + 1).trim();
      if (body && isMostlyUppercase(title) && title.length <= 180) {
        blocks.push({ type: 'heading', text: `${numberPrefix}${title}.` });
        pushBodyAfterHeading(body);
        return;
      }
    }

    if (isMostlyUppercase(rest) && rest.length <= 180) {
      blocks.push({ type: 'heading', text: line });
    } else {
      pushContentLines(line);
    }
  });

  return blocks;
}

export function parseDisclaimerForDisplay(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const text = rawText.replace(/\s+/g, ' ').trim();
  const blocks = [];

  const preprocessed = text
    .replace(/^I hereby\s+/i, 'I hereby:\n')
    .replace(/\s+(\((?:i{1,3}|iv|v|vi{0,3}|ix|x)\)\s+)/gi, '\n$1')
    .replace(/\.\s+(I hereby\b)/gi, '.\n\n$1');

  preprocessed.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      blocks.push({ type: 'gap' });
      return;
    }
    if (/^I hereby:$/i.test(trimmed)) {
      blocks.push({ type: 'intro', text: 'I hereby:' });
      return;
    }
    if (DISCLAIMER_SUBITEM_PATTERN.test(trimmed)) {
      blocks.push({ type: 'subitem', text: trimmed });
      return;
    }
    blocks.push({ type: 'paragraph', text: trimmed });
  });

  return blocks.length ? blocks : [{ type: 'paragraph', text }];
}

/** Splits a string into plain-text and URL segments: [{ text, href? }]. */
export function splitTextWithLinks(text) {
  if (!text) return [];

  const segments = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(URL_PATTERN.source, 'gi');

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    const url = match[0];
    const trailingPunct = url.match(/[.,;:]+$/)?.[0] || '';
    const cleanUrl = trailingPunct ? url.slice(0, -trailingPunct.length) : url;
    const href = /^https?:\/\//i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`;

    segments.push({ text: cleanUrl, href });
    if (trailingPunct) segments.push({ text: trailingPunct });

    lastIndex = match.index + url.length;
  }

  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex) });
  return segments;
}
