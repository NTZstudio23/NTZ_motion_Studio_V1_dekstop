export interface PresetItem {
  id: 'bokeh' | 'neon' | 'network';
  title: string;
  description: string;
  accent: string;
  code: string;
}

export const PRESETS: Record<'bokeh' | 'neon' | 'network', PresetItem> = {
  bokeh: {
    id: 'bokeh',
    title: 'Cyber Gold Bokeh',
    description: 'Partikel bokeh cyan & emas berputar mulus dengan teks metalik.',
    accent: '#22d3ee',
    code: `if(bgMode==='code'){const g=ctx.createRadialGradient(w*.5,h*.45,w*.05,w*.5,h*.5,w*.75);g.addColorStop(0,'#0f1c38');g.addColorStop(.55,'#060d1f');g.addColorStop(1,'#02050d');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}for(let i=0;i<42;i++){const s=i*137.5,px=((Math.sin(s)*.5+.5)+Math.sin(progress*Math.PI*2+i)*.04)*w,wy=(((((Math.cos(s*1.3)*.5+.5)-(progress+i*.07)%1)*h)%h)+h)%h,r=(w*.012)+(i%5)*(w*.008),bg=ctx.createRadialGradient(px,wy,0,px,wy,r);if(i%2===0){bg.addColorStop(0,'rgba(34,211,238,.28)');bg.addColorStop(.6,'rgba(59,130,246,.1)');bg.addColorStop(1,'rgba(59,130,246,0)');}else{bg.addColorStop(0,'rgba(251,191,36,.24)');bg.addColorStop(1,'rgba(245,158,11,0)');}ctx.fillStyle=bg;ctx.beginPath();ctx.arc(px,wy,r,0,Math.PI*2);ctx.fill();}const fs=Math.min(w,h)*.135;ctx.save();ctx.font=\`800 \${fs}px sans-serif\`;ctx.textAlign='center';ctx.textBaseline='middle';const lw=ctx.measureText('Gold ').width,rw=ctx.measureText('Bokeh').width,tw=lw+rw,sx=(w-tw)/2;ctx.shadowColor='rgba(34,211,238,.5)';ctx.shadowBlur=fs*.28;const cg=ctx.createLinearGradient(0,h*.42,0,h*.58);cg.addColorStop(0,'#a5f3fc');cg.addColorStop(.5,'#22d3ee');cg.addColorStop(1,'#3b82f6');ctx.fillStyle=cg;ctx.fillText('Gold ',sx+lw/2,h*.48);ctx.shadowColor='rgba(255,255,255,.25)';const sg=ctx.createLinearGradient(0,h*.42,0,h*.58);sg.addColorStop(0,'#fff');sg.addColorStop(1,'#94a3b8');ctx.fillStyle=sg;ctx.fillText('Bokeh',sx+lw+rw/2,h*.48);ctx.restore();const lineW=tw*(.88+.12*Math.sin(progress*Math.PI*2)),lg=ctx.createLinearGradient(w/2-lineW/2,0,w/2+lineW/2,0);lg.addColorStop(0,'rgba(34,211,238,0)');lg.addColorStop(.5,'rgba(34,211,238,.95)');lg.addColorStop(1,'rgba(99,102,241,0)');ctx.fillStyle=lg;ctx.fillRect(w/2-lineW/2,h*.56,lineW,Math.max(2,h*.0035));`,
  },
  neon: {
    id: 'neon',
    title: 'Neon Cyber Waves',
    description: 'Gelombang sinus neon ungu-cyan seamless untuk latar motion.',
    accent: '#a855f7',
    code: `if(bgMode==='code'){ctx.fillStyle='#040712';ctx.fillRect(0,0,w,h);}for(let j=0;j<6;j++){ctx.beginPath();ctx.strokeStyle=\`hsla(\${195+j*16},92%,62%,.58)\`;ctx.lineWidth=Math.max(2,w*.0025);for(let x=0;x<=w;x+=Math.max(8,w/80)){const y=h*.5+Math.sin((x/w)*Math.PI*4+progress*Math.PI*2+j*.7)*(h*.16)*Math.cos(progress*Math.PI*2+j*.3);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}`,
  },
  network: {
    id: 'network',
    title: 'Tech Particle Grid',
    description: 'Jaringan titik & garis koneksi korporat berloop sempurna.',
    accent: '#38bdf8',
    code: `if(bgMode==='code'){ctx.fillStyle='#050a16';ctx.fillRect(0,0,w,h);}const pts=[];for(let i=0;i<28;i++){const a=progress*Math.PI*2+i*.8;pts.push({x:((i/28)+Math.sin(a)*.04)*w,y:(.5+Math.cos(a*1.5+i)*.35)*h});}ctx.lineWidth=Math.max(1,w*.0012);for(let i=0;i<28;i++){for(let j=i+1;j<28;j++){const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y),md=w*.22;if(d<md){ctx.strokeStyle=\`rgba(34,211,238,\${(1-d/md)*.48})\`;ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.stroke();}}ctx.fillStyle='#22d3ee';ctx.beginPath();ctx.arc(pts[i].x,pts[i].y,Math.max(2.5,w*.0035),0,Math.PI*2);ctx.fill();}`,
  },
};
