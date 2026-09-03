import { describe, it, expect } from 'vitest';
import { computeStats } from './article-content-editor';

describe('computeStats', () => {
  it('returns zeros for empty content', () => {
    const stats = computeStats('');
    expect(stats).toEqual({
      words: 0,
      characters: 0,
      paragraphs: 0,
      headings: 0,
      images: 0,
      internalLinks: 0,
      externalLinks: 0,
      readingTime: 0,
    });
  });

  it('counts words correctly', () => {
    const html = '<p>Hello world this is a test</p>';
    const stats = computeStats(html);
    expect(stats.words).toBe(6);
  });

  it('counts paragraphs correctly', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>';
    const stats = computeStats(html);
    expect(stats.paragraphs).toBe(3);
  });

  it('counts headings correctly', () => {
    const html = '<h2>First heading</h2><p>Content</p><h3>Sub heading</h3><h2>Another heading</h2>';
    const stats = computeStats(html);
    expect(stats.headings).toBe(3);
  });

  it('counts images correctly', () => {
    const html = '<p>Text</p><img src="image1.jpg" /><img src="image2.png" alt="pic" />';
    const stats = computeStats(html);
    expect(stats.images).toBe(2);
  });

  it('calculates reading time', () => {
    // 400 words at 200 wpm = 2 minutes
    const words = Array(400).fill('word').join(' ');
    const html = `<p>${words}</p>`;
    const stats = computeStats(html);
    expect(stats.readingTime).toBe(2);
  });

  it('sets minimum reading time to 1 minute', () => {
    const html = '<p>A few words</p>';
    const stats = computeStats(html);
    expect(stats.readingTime).toBe(1);
  });

  it('strips HTML tags for word count', () => {
    const html = '<h2>Title</h2><p><strong>Bold</strong> <em>italic</em> text</p>';
    const stats = computeStats(html);
    // Adjacent tags are stripped without inserting spaces
    // Result: "TitleBold italic text" → 3 words
    expect(stats.words).toBe(3);
  });

  it('handles nested HTML', () => {
    const html = '<div><section><h2>Title</h2><p>Content here</p></section></div>';
    const stats = computeStats(html);
    expect(stats.headings).toBe(1);
    expect(stats.paragraphs).toBe(1);
    // Tags are stripped without inserting spaces between adjacent elements
    // Result: "TitleContent here" → 2 words
    expect(stats.words).toBe(2);
  });

  it('handles article with full content structure', () => {
    const html = `
      <h2>Introduction</h2>
      <p>This is the first paragraph of the article with many words to test the word count properly.</p>
      <h2>Main Content</h2>
      <p>Another paragraph here with some more content and additional words for testing.</p>
      <img src="hero.jpg" alt="Hero" />
      <h3>Subsection</h3>
      <p>A third paragraph with even more content to fill out the article structure.</p>
    `;
    const stats = computeStats(html);
    expect(stats.headings).toBe(3); // h2, h2, h3
    expect(stats.paragraphs).toBe(3);
    expect(stats.images).toBe(1);
    expect(stats.words).toBeGreaterThan(20);
    expect(stats.readingTime).toBeGreaterThanOrEqual(1);
  });
});
