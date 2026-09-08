import { buildDeepenPrompt, buildExplainPrompt } from './prompts';

describe('ai prompts (privacy contract)', () => {
  describe('buildExplainPrompt', () => {
    it('contains only the term and the level in the user payload', () => {
      const { system, user } = buildExplainPrompt({ term: 'deploy', level: 'A2' });
      expect(user).toContain('deploy');
      expect(user).toContain('A2');
      expect(user).toContain('explain');
      expect(user).not.toContain('desplegar');
      expect(user).not.toContain('definition');
      expect(user).not.toContain('example');
    });

    it('does not leak the original definition, translation, or explanation text', () => {
      const { user } = buildExplainPrompt({
        term: 'sensible',
        level: 'B1',
      });
      expect(user).toContain('sensible');
      expect(user).toContain('B1');
      expect(user).not.toMatch(/definici[oó]n|translation|explanation/i);
    });

    it('instructs the model to write summaries in Spanish and examples in English', () => {
      const { system } = buildExplainPrompt({ term: 'deploy', level: 'A2' });
      expect(system).toMatch(/summary.*spanish|spanish.*summary/i);
      expect(system).toMatch(/english.*only|english\s*\(us\)/i);
    });

    it('instructs the model to output JSON only (no prose, no fences, no reasoning)', () => {
      const { system } = buildExplainPrompt({ term: 'deploy', level: 'A2' });
      const lower = system.toLowerCase();
      expect(lower).toContain('json');
      expect(lower).toMatch(/markdown\s+code\s+fences/);
      expect(lower).toMatch(/chain.of.thought|reasoning|analysis/);
    });
  });

  describe('buildDeepenPrompt', () => {
    it('contains only the term, level, and the token deepen', () => {
      const { user } = buildDeepenPrompt({ term: 'sensible', level: 'B1' });
      expect(user).toContain('sensible');
      expect(user).toContain('B1');
      expect(user).toContain('deepen');
      expect(user).not.toContain('definition');
      expect(user).not.toContain('example');
    });

    it('normalizes unknown levels to A1', () => {
      const { user } = buildDeepenPrompt({ term: 'foo', level: 'Xx' });
      expect(user).toContain('A1');
      expect(user).not.toContain('Xx');
    });

    it('instructs the model to write context in Spanish and examples/collocations in English', () => {
      const { system } = buildDeepenPrompt({ term: 'sensible', level: 'B1' });
      expect(system).toMatch(/context.*spanish|spanish.*context/i);
      expect(system).toMatch(/english\s*\(us\)/i);
    });
  });
});