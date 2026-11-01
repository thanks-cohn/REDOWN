import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../extension/beta/explorer.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../extension/beta/explorer.css',import.meta.url),'utf8');

test('Back Forward and Up share one centered premium glyph without text-arrow drift',()=>{
  const faces=[],glints=[];
  for(const [id,label] of [['back','Back'],['forward','Forward'],['up','Parent folder']]){
    const row=html.match(new RegExp('<button id="'+id+'"[^>]*>([\\s\\S]*?)<\\/button>'));
    assert.ok(row,id+' button exists');
    assert.ok(row[0].includes('aria-label="'+label+'"'),id+' preserves its accessible name');
    const svg=row[1].match(/<svg class="directory-nav-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">([\\s\\S]*?)<\\/svg>/);
    assert.ok(svg,id+' uses the centered SVG canvas');
    faces.push(svg[1].match(/class="directory-nav-glyph-face" d="([^"]+)"/)?.[1]);
    glints.push(svg[1].match(/class="directory-nav-glyph-glint" d="([^"]+)"/)?.[1]);
    assert.ok(faces.at(-1)&&glints.at(-1),id+' has a filled face and glint');
    assert.ok(!/[←→↑]/.test(row[1]),id+' is not a font arrow');
  }
  assert.equal(new Set(faces).size,1,'all directions share exactly the same geometry');
  assert.equal(new Set(glints).size,1,'all directions share exactly the same highlight');
  assert.match(css,/#forward svg\\.directory-nav-glyph\\{transform:rotate\\(180deg\\)\\}/);
  assert.match(css,/#up svg\\.directory-nav-glyph\\{transform:rotate\\(90deg\\)\\}/);
  assert.match(css,/:is\\(#back,#forward,#up\\)\\{width:48px;height:48px/,'keep existing 48px buttons');
  assert.match(css,/directory-nav-glyph\\{[^}]*fill:currentColor;stroke:none/);
});

test('preview modal keeps scrollbars in the media pane instead of across close and navigation controls',()=>{
  assert.match(css,/:is\\(#preview-dialog,#immersive-preview-dialog\\):has\\(> \\.window-viewer:not\\(\\[hidden\\]\\)\\)\\{[^}]*box-sizing:border-box;[^}]*overflow:hidden/s);
  assert.match(css,/#preview-dialog > \\.window-viewer:not\\(\\[hidden\\]\\)\\{[^}]*grid-template-rows:auto minmax\\(0,1fr\\) auto auto;[^}]*overflow:hidden/s);
  assert.match(css,/:is\\(#preview-dialog,#immersive-preview-dialog\\) \\.window-viewer \\.window-content\\{[^}]*overflow:auto;[^}]*scrollbar-gutter:stable/s);
  assert.match(css,/:is\\(#preview-dialog,#immersive-preview-dialog\\)\\.window-lightbox\\{[^}]*box-sizing:border-box;[^}]*overflow:hidden;[^}]*height:100dvh/s);
  assert.match(css,/:is\\(#preview-dialog,#immersive-preview-dialog\\)\\.window-lightbox \\.window-viewer \\.preview-footer\\{[^}]*padding-inline:/s,'footer reserves separation from the content scroll gutter');
});
