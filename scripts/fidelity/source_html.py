from html.parser import HTMLParser
from pathlib import Path
import re,json
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class Node:
 def __init__(self,tag,attrs,start,parent=None):self.tag=tag;self.attrs=dict(attrs);self.start=start;self.end=start;self.parent=parent;self.children=[];self.text=''
class Document(HTMLParser):
 def __init__(self,source):
  super().__init__(convert_charrefs=False);self.source=source;self.lines=[0];self.lines += [m.end() for m in re.finditer('\n',source)];self.root=Node('root',[],0);self.stack=[self.root];self.nodes=[];self.feed(source)
 def pos(self):a,b=self.getpos();return self.lines[a-1]+b
 def handle_starttag(self,tag,attrs):
  n=Node(tag,attrs,self.pos(),self.stack[-1]);n.end=self.pos()+len(self.get_starttag_text());n.parent.children.append(n);self.nodes.append(n)
  if tag not in VOID:self.stack.append(n)
 def handle_startendtag(self,tag,attrs):self.handle_starttag(tag,attrs);self.stack[-1].end=self.pos()+len(self.get_starttag_text());self.stack.pop() if self.stack[-1].tag==tag else None
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==tag:
    self.stack[i].end=self.source.find('>',self.pos())+1;self.stack=self.stack[:i];return
 def handle_data(self,data):
  for n in self.stack:n.text+=data
 def html(self,n):return self.source[n.start:n.end]
 def frames(self):
  out=[]
  for n in self.nodes:
   m=re.search(r'(?:^|;)\s*width\s*:\s*(375|768|1440)px(?:;|$)',n.attrs.get('style',''))
   if m:
    parent=n.parent; ref='';labels=[]
    while parent and parent.tag!='root':
     if parent.attrs.get('data-screen-label'):ref=parent.attrs['data-screen-label'];break
     parent=parent.parent
    sibs=n.parent.children;idx=sibs.index(n)
    label=' '.join(sibs[idx-1].text.split()) if idx else ''
    parent=n.parent
    if not label and parent.parent:
     ps=parent.parent.children;i=ps.index(parent);label=' '.join(ps[i-1].text.split()) if i else ''
    out.append({'node':n,'width':int(m[1]),'ref':ref,'label':label[:240]})
  return out
if __name__=='__main__':
 data=[]
 for p in Path('MAQUETTE ET HANDOFF/maquettes').glob('*.html'):
  if 'Prototype' in p.name:continue
  d=Document(p.read_text());fs=d.frames();print('\n'+p.name)
  for i,f in enumerate(fs):
   row={'i':i,'width':f['width'],'ref':f['ref'],'label':f['label'],'text':' '.join(f['node'].text.split())[:120],'start':f['node'].start};print(json.dumps(row,ensure_ascii=False));data.append({'file':p.name,**row})
 Path('docs/fidelity/frames.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
