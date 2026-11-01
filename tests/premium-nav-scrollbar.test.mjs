import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../extension/beta/explorer.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../extension/beta/explorer.css',import.meta.url),'utf8');

test('Back, Forward and Up use identical optically centered artwork, only rotated',()=>{
  const faces=[],glints=[];
  for(const [id,label] of [['back','Back'],['forward','Forward'],['up','Parent folder']]){
    const after=html.split('<button id="'+id+'"')[1];
    assert.ok(after,id+' exists');
    const row=after.split('</button>')[0];
    assert.ok(row.includes('aria-label="'+label+'"'),id+' retains accessible name');
    assert.ok(row.includes('class="directory-nav-glyph" viewBox="0 0 24 24" aria-hidden="true"'),id+' contains one accessible SVG canvas');
    const face=row.split('class="directory-nav-glyph-face" d="')[1]?.split('"')[0];
    const glint=row.split('class="directory-nav-glyph-glint" d="')[1]?.split('"')[0];
    assert.ok(face&&glint,id+' contains filled face and sheen');
    faces.push(face);glints.push(glint);
    assert.equal(/[←→↑]/.test(row),false,'do not depend on font arrow glyphs');
  }
  assert.equal(new Set(faces).size,1,'all three directions have the same optically centered geometry');
  assert.equal(new Set(glints).size,1,'all three directions use the same highlight');
  assert.ok(css.includes('#forward svg.directory-nav-glyph{transform:rotate(180deg)}'));
  assert.ok(css.includes('#up svg.directory-nav-glyph{transform:rotate(90deg)}'));
  assert.ok(css.includes(':is(#back,#forward,#up){width:48px;height:48px'),'keep existing size and color treatment');
  assert.ok(css.includes('fill:currentColor;stroke:none'),'use a filled arrow instead of offset outline strokes');
});

test('preview dialog confines scrolling to media rather than over fixed navigation controls',()=>{
  const outer=css.split('/* Window Preview and immersive Lightbox:')[1];
  assert.ok(outer,'explicit layout contract is present');
  assert.ok(outer.includes(':has(> .window-viewer:not([hidden]))'));
  assert.ok(outer.includes('box-sizing:border-box;'));
  assert.ok(outer.includes('overflow:hidden;'),'outer modal is not scrollable');
  assert.ok(outer.includes('grid-template-rows:auto minmax(0,1fr) auto auto;'),'header/content/info/footer have separate grid tracks');
  assert.ok(outer.includes('scrollbar-gutter:stable;'),'media pane reserves its own scrollbar gutter');
  assert.ok(outer.includes('.window-viewer .preview-footer'));
  assert.ok(outer.includes('padding-inline:'),'footer navigation is padded away from scrollbars and dialog edges');
  assert.ok(outer.includes('height:100dvh;'),'immersive modal fits within viewport');
  assert.ok(outer.includes('max-height:100dvh;'),'immersive modal cannot exceed viewport height');
});
