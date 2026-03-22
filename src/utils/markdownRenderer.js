/**
 * markdownRenderer.js — Lightweight markdown → React Native components.
 * Supports: headings, bold, italic, bullet lists, blockquotes, paragraphs.
 * Dark-themed for the BuildGym customer app.
 */
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

const MD_COLORS = {
  heading: COLORS.white,
  text: COLORS.textSecondary,
  bold: COLORS.white,
  blockquoteBorder: COLORS.secondary,
  blockquoteText: COLORS.textSecondary,
  bullet: COLORS.secondary,
};

/**
 * Renders inline markdown (bold + italic) within a line of text.
 */
function renderInline(line, key) {
  const parts = [];
  let remaining = line;
  let idx = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic: *text*
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

    let firstMatch = null;

    if (boldMatch && boldMatch.index !== undefined) {
      firstMatch = { index: boldMatch.index, full: boldMatch[0], inner: boldMatch[1], style: 'bold' };
    }
    if (italicMatch && italicMatch.index !== undefined) {
      if (!firstMatch || italicMatch.index < firstMatch.index) {
        firstMatch = { index: italicMatch.index, full: italicMatch[0], inner: italicMatch[1], style: 'italic' };
      }
    }

    if (!firstMatch) {
      parts.push(<Text key={`${key}-${idx}`}>{remaining}</Text>);
      break;
    }

    // Text before match
    if (firstMatch.index > 0) {
      parts.push(<Text key={`${key}-${idx}`}>{remaining.slice(0, firstMatch.index)}</Text>);
      idx++;
    }

    // Styled text
    parts.push(
      <Text
        key={`${key}-${idx}`}
        style={firstMatch.style === 'bold' ? s.bold : s.italic}
      >
        {firstMatch.inner}
      </Text>
    );
    idx++;

    remaining = remaining.slice(firstMatch.index + firstMatch.full.length);
  }

  return parts.length === 1 ? parts[0] : <Text key={key}>{parts}</Text>;
}

/**
 * Parses markdown string and returns React Native components.
 */
export function renderMarkdown(markdown) {
  if (!markdown) return [];

  const lines = markdown.split('\n');
  const elements = [];
  let key = 0;
  let currentParagraph = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ');
      elements.push(
        <Text key={`p-${key}`} style={s.paragraph}>
          {renderInline(text, `inline-${key}`)}
        </Text>
      );
      key++;
      currentParagraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line — flush paragraph
    if (trimmed === '') {
      flushParagraph();
      continue;
    }

    // Heading: ## text
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const fontSize = level === 1 ? 22 : level === 2 ? 18 : 16;
      elements.push(
        <Text key={`h-${key}`} style={[s.heading, { fontSize }]}>
          {headingMatch[2]}
        </Text>
      );
      key++;
      continue;
    }

    // Bullet list: - text or * text
    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      elements.push(
        <View key={`li-${key}`} style={s.listItem}>
          <Text style={s.bullet}>{'\u2022'}</Text>
          <Text style={s.listText}>
            {renderInline(bulletMatch[1], `li-inline-${key}`)}
          </Text>
        </View>
      );
      key++;
      continue;
    }

    // Blockquote: > text
    const quoteMatch = trimmed.match(/^>\s*(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      elements.push(
        <View key={`bq-${key}`} style={s.blockquote}>
          <Text style={s.blockquoteText}>
            {renderInline(quoteMatch[1], `bq-inline-${key}`)}
          </Text>
        </View>
      );
      key++;
      continue;
    }

    // Regular text — accumulate into paragraph
    currentParagraph.push(trimmed);
  }

  flushParagraph();

  return elements;
}

const s = StyleSheet.create({
  heading: {
    color: MD_COLORS.heading,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
  },
  paragraph: {
    color: MD_COLORS.text,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700',
    color: MD_COLORS.bold,
  },
  italic: {
    fontStyle: 'italic',
  },
  listItem: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginBottom: 6,
    gap: 8,
  },
  bullet: {
    color: MD_COLORS.bullet,
    fontSize: 14,
    lineHeight: 22,
  },
  listText: {
    flex: 1,
    color: MD_COLORS.text,
    fontSize: 14,
    lineHeight: 22,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: MD_COLORS.blockquoteBorder,
    paddingLeft: 14,
    paddingVertical: 8,
    marginBottom: 12,
    marginLeft: 4,
  },
  blockquoteText: {
    color: MD_COLORS.blockquoteText,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
